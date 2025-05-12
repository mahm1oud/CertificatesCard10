/**
 * سكريبت إعداد البنية التحتية للإنتاج
 * 
 * هذا السكريبت يقوم بإعداد البنية التحتية للتطبيق في بيئة الإنتاج، بما في ذلك:
 * - تكوين عنوان API
 * - إنشاء ملفات الإعداد اللازمة
 * - تكوين أي متغيرات بيئة خاصة ببيئة الإنتاج
 * 
 * النسخة: 1.0.0
 * تاريخ التحديث: مايو 2025
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// إنشاء واجهة لقراءة المدخلات
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// تحويل callback إلى promise لسهولة الاستخدام مع async/await
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// مسارات مهمة
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CLIENT_SRC_DIR = path.join(ROOT_DIR, 'client', 'src');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const API_CONFIG_PATH = path.join(CLIENT_SRC_DIR, 'lib', 'api-config.ts');

/**
 * الدالة الرئيسية لإعداد البنية التحتية للإنتاج
 */
async function setupProductionInfrastructure() {
  console.log('🚀 بدء إعداد البنية التحتية للإنتاج...');
  
  // الحصول على عنوان API من المستخدم
  const apiUrl = await question('أدخل عنوان API للإنتاج (مثال: https://collider.online): ') || 'https://collider.online';
  
  // تحديث ملف تكوين API
  await updateApiConfig(apiUrl);
  
  // تحديث ملف .env
  await updateEnvFile(apiUrl);
  
  // إنشاء رمز إعادة التوجيه للخادم
  await createServerRedirectCode();
  
  console.log('✅ تم إعداد البنية التحتية للإنتاج بنجاح!');
  console.log(`🌐 سيتم استخدام عنوان API: ${apiUrl}`);
  console.log('🔄 قم بإعادة بناء التطبيق باستخدام: ./build-all.sh');
  
  // إغلاق واجهة القراءة
  rl.close();
}

/**
 * تحديث ملف تكوين API
 * @param {string} apiUrl عنوان API للإنتاج
 */
async function updateApiConfig(apiUrl) {
  console.log('🔄 تحديث ملف تكوين API...');
  
  if (!fs.existsSync(API_CONFIG_PATH)) {
    console.error(`❌ ملف تكوين API غير موجود: ${API_CONFIG_PATH}`);
    console.log('🔄 إنشاء ملف تكوين API جديد...');
    
    // إنشاء مجلد lib إذا لم يكن موجوداً
    const libDir = path.dirname(API_CONFIG_PATH);
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }
    
    // إنشاء ملف تكوين API جديد
    const apiConfigContent = `/**
 * ملف تكوين API
 * 
 * يحتوي على الإعدادات اللازمة للاتصال بالخادم الخلفي
 * يستخدم في جميع أنحاء التطبيق للحصول على عنوان API المناسب
 * 
 * النسخة: 1.0.0
 * تاريخ التحديث: ${new Date().toISOString().split('T')[0]}
 */

// معرفة بيئة التشغيل
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// عنوان API الافتراضي للإنتاج
const PRODUCTION_API_URL = '${apiUrl}';

// تعيين عنوان API المناسب بناءً على بيئة التشغيل
export const API_BASE_URL = isProduction 
  ? PRODUCTION_API_URL 
  : ''; // في بيئة التطوير نستخدم المسار النسبي

/**
 * إنشاء مسار API كامل
 * 
 * @param endpoint نهاية المسار بدون / في البداية
 * @returns مسار API الكامل
 */
export function getApiUrl(endpoint: string): string {
  // التأكد من أن المسار يبدأ بـ /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : \`/\${endpoint}\`;
  
  // إضافة المسار إلى عنوان API الأساسي
  return \`\${API_BASE_URL}\${normalizedEndpoint}\`;
}

/**
 * تحديد ما إذا كان التطبيق يعمل في بيئة التطوير أم لا
 */
export const isDevEnvironment = isDevelopment;

/**
 * معلومات التصحيح
 */
if (isDevelopment) {
  console.log('🔄 تشغيل التطبيق في بيئة: development');
  console.log('🌐 عنوان API: المسار النسبي');
} else {
  console.log('🚀 تشغيل التطبيق في بيئة: production');
  console.log(\`🌐 عنوان API: \${PRODUCTION_API_URL}\`);
}

export default {
  API_BASE_URL,
  getApiUrl,
  isDevEnvironment,
  isProduction
};`;
    
    fs.writeFileSync(API_CONFIG_PATH, apiConfigContent);
    console.log('✅ تم إنشاء ملف تكوين API بنجاح');
    return;
  }
  
  // تحديث ملف تكوين API الموجود
  let apiConfigContent = fs.readFileSync(API_CONFIG_PATH, 'utf8');
  
  // استبدال عنوان API
  apiConfigContent = apiConfigContent.replace(
    /const PRODUCTION_API_URL = .*/,
    `const PRODUCTION_API_URL = '${apiUrl}';`
  );
  
  // كتابة التغييرات
  fs.writeFileSync(API_CONFIG_PATH, apiConfigContent);
  console.log('✅ تم تحديث ملف تكوين API بنجاح');
}

/**
 * تحديث ملف .env
 * @param {string} apiUrl عنوان API للإنتاج
 */
async function updateEnvFile(apiUrl) {
  console.log('🔄 تحديث ملف .env...');
  
  if (!fs.existsSync(ENV_PATH)) {
    console.error(`❌ ملف .env غير موجود: ${ENV_PATH}`);
    console.log('ℹ️ يجب إنشاء ملف .env أولاً باستخدام سكريبت التثبيت');
    return;
  }
  
  // قراءة ملف .env
  let envContent = fs.readFileSync(ENV_PATH, 'utf8');
  
  // التحقق من وجود متغير API_URL
  if (envContent.includes('API_URL=')) {
    // تحديث قيمة API_URL
    envContent = envContent.replace(
      /API_URL=.*/,
      `API_URL=${apiUrl}`
    );
  } else {
    // إضافة متغير API_URL جديد
    const serverSection = envContent.match(/# إعدادات الخادم[\s\S]*?([a-zA-Z_]+=[^\n]*\n)/);
    if (serverSection) {
      const insertPosition = serverSection.index + serverSection[0].length;
      envContent = envContent.slice(0, insertPosition) + `API_URL=${apiUrl}\n` + envContent.slice(insertPosition);
    } else {
      // إضافة في نهاية الملف إذا لم يتم العثور على قسم إعدادات الخادم
      envContent += `\n# إعدادات API\nAPI_URL=${apiUrl}\n`;
    }
  }
  
  // كتابة التغييرات
  fs.writeFileSync(ENV_PATH, envContent);
  console.log('✅ تم تحديث ملف .env بنجاح');
}

/**
 * إنشاء رمز إعادة التوجيه للخادم
 */
async function createServerRedirectCode() {
  console.log('🔄 إنشاء رمز إعادة التوجيه للخادم...');
  
  // مسار ملف إعادة التوجيه
  const redirectFilePath = path.join(ROOT_DIR, 'server', 'lib', 'api-redirect.ts');
  
  // إنشاء مجلد lib إذا لم يكن موجوداً
  const libDir = path.dirname(redirectFilePath);
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }
  
  // إنشاء ملف إعادة التوجيه
  const redirectContent = `/**
 * وحدة إعادة توجيه API
 * 
 * تستخدم في بيئة الإنتاج لإعادة توجيه طلبات API إلى النطاق المناسب
 * عندما تكون الواجهة الأمامية والخلفية في نفس الاستضافة
 * 
 * النسخة: 1.0.0
 * تاريخ التحديث: ${new Date().toISOString().split('T')[0]}
 */

import { Request, Response, NextFunction } from 'express';

// الحصول على عنوان API من متغيرات البيئة
const apiUrl = process.env.API_URL || '';

/**
 * وسيط إعادة توجيه API
 * يستخدم لإعادة توجيه الطلبات من نطاق الواجهة الأمامية إلى نطاق الخادم الخلفي
 * 
 * @param req طلب Express
 * @param res استجابة Express
 * @param next الدالة التالية
 */
export function apiRedirectMiddleware(req: Request, res: Response, next: NextFunction) {
  // التحقق من وجود عنوان API ومن أن الطلب يبدأ بـ /api
  if (apiUrl && apiUrl !== '' && req.path.startsWith('/api')) {
    const targetUrl = \`\${apiUrl}\${req.path}\`;
    console.log(\`🔄 إعادة توجيه طلب API من \${req.path} إلى \${targetUrl}\`);
    return res.redirect(targetUrl);
  }
  
  // استمرار في سلسلة الوسطاء إذا لم يتم إعادة التوجيه
  next();
}

export default apiRedirectMiddleware;
`;
  
  fs.writeFileSync(redirectFilePath, redirectContent);
  console.log('✅ تم إنشاء رمز إعادة التوجيه للخادم بنجاح');
  
  // تحديث ملف server/index.ts لاستخدام وسيط إعادة التوجيه
  const serverIndexPath = path.join(ROOT_DIR, 'server', 'index.ts');
  
  if (fs.existsSync(serverIndexPath)) {
    console.log('🔄 تحديث ملف server/index.ts لاستخدام وسيط إعادة التوجيه...');
    
    let serverIndexContent = fs.readFileSync(serverIndexPath, 'utf8');
    
    // التحقق مما إذا كان الوسيط مستوردًا بالفعل
    if (!serverIndexContent.includes('api-redirect')) {
      // إضافة استيراد للوسيط
      const importLines = serverIndexContent.match(/import.*?;/gs);
      if (importLines) {
        const lastImportLine = importLines[importLines.length - 1];
        const lastImportIndex = serverIndexContent.lastIndexOf(lastImportLine) + lastImportLine.length;
        
        serverIndexContent = 
          serverIndexContent.slice(0, lastImportIndex) + 
          '\nimport { apiRedirectMiddleware } from \'./lib/api-redirect\';\n' + 
          serverIndexContent.slice(lastImportIndex);
      }
      
      // إضافة استخدام الوسيط
      const appUsePattern = /app\.use\([^)]+\);/g;
      const appUseMatches = [...serverIndexContent.matchAll(appUsePattern)];
      
      if (appUseMatches.length > 0) {
        const firstAppUse = appUseMatches[0];
        const firstAppUseIndex = firstAppUse.index;
        
        serverIndexContent = 
          serverIndexContent.slice(0, firstAppUseIndex) + 
          `// وسيط إعادة توجيه API للإنتاج\nif (process.env.NODE_ENV === 'production') {\n  app.use(apiRedirectMiddleware);\n}\n\n` + 
          serverIndexContent.slice(firstAppUseIndex);
      }
      
      // كتابة التغييرات
      fs.writeFileSync(serverIndexPath, serverIndexContent);
      console.log('✅ تم تحديث ملف server/index.ts بنجاح');
    } else {
      console.log('ℹ️ وسيط إعادة التوجيه مضمن بالفعل في ملف server/index.ts');
    }
  } else {
    console.log('⚠️ ملف server/index.ts غير موجود. قم بإضافة وسيط إعادة التوجيه يدويًا.');
  }
}

// تنفيذ السكريبت
setupProductionInfrastructure().catch(error => {
  console.error('❌ حدث خطأ أثناء إعداد البنية التحتية للإنتاج:', error);
  rl.close();
  process.exit(1);
});
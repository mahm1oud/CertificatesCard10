/**
 * سكريبت توحيد عملية البناء
 * 
 * هذا السكريبت يقوم ببناء المشروع بالكامل (الواجهة الأمامية والخادم) بخطوة واحدة
 * مناسب لبيئات الإنتاج والتطوير
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

/**
 * طباعة رسالة ملونة
 * @param {string} message الرسالة
 * @param {string} type نوع الرسالة (info, success, warning, error)
 */
function log(message, type = 'info') {
  switch (type) {
    case 'success':
      console.log(`${colors.fg.green}✅ ${message}${colors.reset}`);
      break;
    case 'warning':
      console.log(`${colors.fg.yellow}⚠️ ${message}${colors.reset}`);
      break;
    case 'error':
      console.log(`${colors.fg.red}❌ ${message}${colors.reset}`);
      break;
    case 'info':
    default:
      console.log(`${colors.fg.cyan}🔄 ${message}${colors.reset}`);
      break;
  }
}

/**
 * تنفيذ أمر مع معالجة الأخطاء
 * @param {string} command الأمر
 * @param {string} errorMessage رسالة الخطأ
 * @returns {Buffer} نتيجة تنفيذ الأمر
 */
function exec(command, errorMessage) {
  try {
    log(`تنفيذ: ${command}`);
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    log(errorMessage || `فشل تنفيذ الأمر: ${command}`, 'error');
    throw error;
  }
}

/**
 * إنشاء مجلد إذا لم يكن موجودًا
 * @param {string} dirPath مسار المجلد
 */
function createDirIfNotExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`تم إنشاء مجلد: ${dirPath}`, 'success');
  }
}

/**
 * نسخ ملف
 * @param {string} source مسار المصدر
 * @param {string} destination مسار الوجهة
 */
function copyFile(source, destination) {
  try {
    fs.copyFileSync(source, destination);
    log(`تم نسخ الملف: ${source} -> ${destination}`, 'success');
  } catch (error) {
    log(`فشل نسخ الملف: ${source}`, 'error');
    console.error(error);
  }
}

/**
 * نسخ مجلد
 * @param {string} source مسار المصدر
 * @param {string} destination مسار الوجهة
 */
function copyDir(source, destination) {
  try {
    // إنشاء المجلد الهدف إذا لم يكن موجودًا
    createDirIfNotExists(destination);
    
    // قراءة محتويات المجلد المصدر
    const entries = fs.readdirSync(source, { withFileTypes: true });
    
    // نسخ كل ملف/مجلد
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      
      if (entry.isDirectory()) {
        // نسخ المجلد بشكل متكرر
        copyDir(srcPath, destPath);
      } else {
        // نسخ الملف
        copyFile(srcPath, destPath);
      }
    }
    
    log(`تم نسخ المجلد: ${source} -> ${destination}`, 'success');
  } catch (error) {
    log(`فشل نسخ المجلد: ${source}`, 'error');
    console.error(error);
  }
}

/**
 * دالة البناء الرئيسية
 */
async function build() {
  try {
    // تحديد وضع البناء (development أو production)
    const isProd = process.env.NODE_ENV === 'production';
    const buildMode = isProd ? 'الإنتاج' : 'التطوير';
    
    log(`===== بدء عملية البناء (${buildMode}) =====`);
    
    // 1. تثبيت الاعتماديات
    log('تثبيت الاعتماديات...');
    exec('npm ci', 'فشل في تثبيت الاعتماديات');
    
    // 2. بناء الخادم (server)
    log('بناء الخادم...');
    exec('npx tsc -p server/tsconfig.json', 'فشل في بناء الخادم');
    
    // 3. بناء العميل (client)
    log('بناء واجهة المستخدم...');
    if (isProd) {
      // بناء الإنتاج مع التحسين
      exec('cd client && npx vite build --outDir ../dist/public', 'فشل في بناء واجهة المستخدم للإنتاج');
    } else {
      // بناء التطوير بدون التحسين
      exec('cd client && npx vite build --outDir ../dist/public --mode development --no-minify', 'فشل في بناء واجهة المستخدم للتطوير');
    }
    
    // 4. نسخ الملفات الإضافية اللازمة
    log('نسخ الملفات الإضافية...');
    
    // إنشاء المجلدات اللازمة
    const distDir = path.join(process.cwd(), 'dist');
    createDirIfNotExists(distDir);
    createDirIfNotExists(path.join(distDir, 'uploads'));
    createDirIfNotExists(path.join(distDir, 'temp'));
    createDirIfNotExists(path.join(distDir, 'logs'));
    createDirIfNotExists(path.join(distDir, 'fonts'));
    
    // نسخ مجلد الخطوط إلى مجلد dist
    const fontsDir = path.join(process.cwd(), 'fonts');
    if (fs.existsSync(fontsDir)) {
      copyDir(fontsDir, path.join(distDir, 'fonts'));
    } else {
      log('مجلد الخطوط غير موجود، تخطي النسخ', 'warning');
    }
    
    // نسخ ملف hostinger.config.js إلى مجلد dist إذا كان موجودًا
    const hostingerConfigPath = path.join(process.cwd(), 'hostinger.config.js');
    if (fs.existsSync(hostingerConfigPath)) {
      copyFile(hostingerConfigPath, path.join(distDir, 'hostinger.config.js'));
    } else {
      log('ملف hostinger.config.js غير موجود، تخطي النسخ', 'warning');
    }
    
    // 5. إنشاء ملف start.js لتشغيل المشروع المبني
    const startJsContent = `#!/usr/bin/env node

/**
 * ملف بدء تشغيل المشروع المبني
 * يستخدم في بيئة الإنتاج لتشغيل الخادم الموحد
 */

// تعيين متغيرات البيئة
process.env.NODE_ENV = 'production';

// تحميل وتشغيل الخادم الموحد
require('./server/unified.js');
`;
    
    fs.writeFileSync(path.join(distDir, 'start.js'), startJsContent);
    fs.chmodSync(path.join(distDir, 'start.js'), '755'); // جعل الملف قابل للتنفيذ
    log('تم إنشاء ملف start.js لتشغيل المشروع', 'success');
    
    // 6. نسخ ملف package.json للإنتاج
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // تعديل محتوى package.json للإنتاج
    const prodPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: 'start.js',
      scripts: {
        start: 'NODE_ENV=production node start.js'
      },
      dependencies: {
        // احتفظ فقط بالاعتماديات الضرورية للإنتاج
        "express": packageJson.dependencies.express,
        "express-session": packageJson.dependencies["express-session"],
        "bcryptjs": packageJson.dependencies.bcryptjs,
        "mysql2": packageJson.dependencies.mysql2,
        "pg": packageJson.dependencies.pg,
        "dotenv": packageJson.dependencies.dotenv,
        "cors": packageJson.dependencies.cors,
        "multer": packageJson.dependencies.multer
      },
      engines: {
        node: '>=18.0.0'
      }
    };
    
    fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify(prodPackageJson, null, 2));
    log('تم إنشاء package.json للإنتاج', 'success');
    
    // 7. إنشاء ملف .env.example للإنتاج
    const envExampleContent = `# ملف إعدادات البيئة للإنتاج
# قم بنسخ هذا الملف إلى .env وتحديث القيم حسب إعداداتك

# بيئة التشغيل
NODE_ENV=production

# منفذ الخادم
PORT=3000

# نوع قاعدة البيانات
DB_TYPE=mysql

# إعدادات قاعدة البيانات
DB_HOST=localhost
DB_PORT=3306
DB_USER=username
DB_PASSWORD=password
DB_NAME=certificates_db

# إعدادات الأمان
SESSION_SECRET=change_this_to_a_secure_random_string
`;
    
    fs.writeFileSync(path.join(distDir, '.env.example'), envExampleContent);
    log('تم إنشاء .env.example للإنتاج', 'success');
    
    // 8. إنشاء ملف .htaccess للتكامل مع Apache
    const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # عدم إعادة توجيه الملفات الموجودة
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  
  # إعادة توجيه طلبات API
  RewriteRule ^api/(.*) http://localhost:3000/api/$1 [P,L]
  
  # إعادة توجيه باقي الطلبات إلى index.html
  RewriteRule ^ index.html [L]
</IfModule>

# الضغط
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# تعيين content-type للملفات
<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType text/css .css
  AddType image/svg+xml .svg
</IfModule>

# ذاكرة التخزين المؤقت
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
`;
    
    fs.writeFileSync(path.join(distDir, '.htaccess'), htaccessContent);
    log('تم إنشاء ملف .htaccess للتكامل مع Apache', 'success');
    
    // إنشاء ملف README للإنتاج
    const readmeContent = `# منصة الشهادات والبطاقات الإلكترونية

## تشغيل المشروع

\`\`\`bash
# تثبيت الاعتماديات
npm install

# تشغيل المشروع
npm start
\`\`\`

## إعدادات البيئة

قم بنسخ ملف \`.env.example\` إلى \`.env\` وتحديث القيم حسب إعداداتك.

## معلومات الدخول الافتراضية

- اسم المستخدم: admin
- كلمة المرور: 700700
`;
    
    fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);
    log('تم إنشاء README للإنتاج', 'success');
    
    // 9. حزم المشروع المبني (اختياري)
    if (isProd) {
      const zipFileName = `certificates-app-${new Date().toISOString().split('T')[0]}.zip`;
      log(`حزم المشروع المبني إلى ${zipFileName}...`);
      exec(`cd dist && zip -r ../${zipFileName} .`, 'فشل في حزم المشروع المبني');
      log(`تم حزم المشروع المبني إلى ${zipFileName}`, 'success');
    }
    
    log('===== اكتملت عملية البناء بنجاح =====', 'success');
    
    // عرض معلومات إضافية
    log(`
للتشغيل في بيئة الإنتاج:
  cd dist
  npm install --production
  npm start

أو:
  node dist/start.js
    `, 'info');
    
  } catch (error) {
    log('فشل عملية البناء', 'error');
    console.error(error);
    process.exit(1);
  }
}

// تنفيذ عملية البناء
build();
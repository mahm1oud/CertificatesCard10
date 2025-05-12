/**
 * سكريبت للتحقق من وجود جميع مجلدات النظام الضرورية وإنشائها إذا لم تكن موجودة
 * قم بتنفيذ هذا السكريبت قبل تشغيل التطبيق للتأكد من وجود المجلدات المطلوبة
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// دالة طباعة ملونة للوحدة
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m%s\x1b[0m',    // أزرق فاتح
    success: '\x1b[32m%s\x1b[0m',  // أخضر
    warning: '\x1b[33m%s\x1b[0m',  // أصفر
    error: '\x1b[31m%s\x1b[0m'     // أحمر
  };
  
  console.log(colors[type] || colors.info, message);
}

// المجلدات الضرورية للنظام
const requiredDirs = [
  'uploads',
  'temp',
  'logs',
  'fonts',
  'client/static'
];

// قائمة المجلدات التي تم إنشاؤها
const createdDirs = [];

// التحقق من وجود المجلدات وإنشائها إذا لم تكن موجودة
function ensureDirectoriesExist() {
  log('🔍 جاري التحقق من وجود مجلدات النظام الضرورية...');
  
  for (const dir of requiredDirs) {
    const dirPath = path.join(process.cwd(), dir);
    
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        createdDirs.push(dir);
        log(`✅ تم إنشاء مجلد: ${dir}`, 'success');
      } catch (error) {
        log(`❌ فشل في إنشاء مجلد: ${dir}`, 'error');
        console.error(error);
      }
    } else {
      log(`✓ مجلد ${dir} موجود بالفعل`);
    }
  }
  
  // إظهار ملخص
  if (createdDirs.length > 0) {
    log(`\n✅ تم إنشاء ${createdDirs.length} مجلدات جديدة: ${createdDirs.join(', ')}`, 'success');
  } else {
    log('\n✅ جميع المجلدات المطلوبة موجودة بالفعل', 'success');
  }
}

// التحقق من وجود ملفات البيئة الأساسية
function checkConfigFiles() {
  log('\n🔍 جاري التحقق من وجود ملفات التكوين الأساسية...');
  
  const configFiles = [
    { path: '.env', template: '.env.example', required: true },
    { path: 'hostinger.config.js', template: 'hostinger.config.example.js', required: false }
  ];
  
  for (const file of configFiles) {
    const filePath = path.join(process.cwd(), file.path);
    
    if (!fs.existsSync(filePath)) {
      if (file.required) {
        log(`❌ ملف ${file.path} مطلوب ولكنه غير موجود!`, 'error');
        
        const templatePath = path.join(process.cwd(), file.template);
        if (fs.existsSync(templatePath)) {
          log(`💡 يمكنك نسخ ملف القالب ${file.template} إلى ${file.path} وتعديله حسب إعداداتك`, 'warning');
        }
      } else {
        log(`⚠️ ملف ${file.path} غير موجود (اختياري)`, 'warning');
      }
    } else {
      log(`✓ ملف ${file.path} موجود`);
    }
  }
}

// التحقق من اتصال قاعدة البيانات (اختياري)
function checkDatabaseConnection() {
  log('\n🔍 هل ترغب في التحقق من اتصال قاعدة البيانات؟ (y/n)');
  
  // للبساطة، سنقوم بمحاولة تشغيل سكريبت فحص اتصال قاعدة البيانات إذا كان موجودًا
  const dbCheckScript = path.join(process.cwd(), 'scripts', 'check-db-connection.ts');
  
  if (fs.existsSync(dbCheckScript)) {
    try {
      log('\n🔄 جاري التحقق من اتصال قاعدة البيانات...');
      execSync('npx tsx scripts/check-db-connection.ts', { stdio: 'inherit' });
    } catch (error) {
      log('❌ فشل التحقق من اتصال قاعدة البيانات', 'error');
    }
  } else {
    log('⚠️ سكريبت التحقق من قاعدة البيانات غير موجود', 'warning');
  }
}

// الوظيفة الرئيسية
function main() {
  log('=== أداة التحقق من إعداد النظام ===\n');
  
  // التحقق من وجود المجلدات
  ensureDirectoriesExist();
  
  // التحقق من ملفات التكوين
  checkConfigFiles();
  
  // إظهار رسالة تأكيد
  log('\n✅ تم التحقق من إعداد النظام بنجاح', 'success');
  log('💡 يمكنك الآن تشغيل التطبيق باستخدام أحد الأوامر التالية:');
  log('   npm run dev              # تشغيل المشروع التقليدي');
  log('   npm run dev:unified      # تشغيل المشروع الموحد');
}

// تنفيذ البرنامج
main();
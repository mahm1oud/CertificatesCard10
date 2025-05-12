/**
 * سكريبت التثبيت الرئيسي لنظام الشهادات والبطاقات الإلكترونية
 * 
 * هذا السكريبت يقوم بإعداد البيئة الكاملة للتطبيق، بما في ذلك:
 * - تهيئة قاعدة البيانات (PostgreSQL أو MySQL)
 * - إنشاء المجلدات اللازمة
 * - إعداد ملفات البيئة (.env)
 * - تثبيت الاعتماديات
 * - بناء وتجميع التطبيق للنشر
 * 
 * طريقة الاستخدام:
 * node install/scripts/install.js [--mysql] [--help]
 * 
 * الخيارات:
 * --mysql: استخدام MySQL بدلاً من PostgreSQL كقاعدة بيانات
 * --help: عرض هذه الرسالة المساعدة
 * 
 * @version 1.0.0
 * @date May 2025
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const readline = require('readline');
const { promisify } = require('util');
const execPromise = promisify(exec);

// إنشاء واجهة لقراءة المدخلات
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// تحويل callback إلى promise لسهولة الاستخدام مع async/await
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// تحليل معلمات سطر الأوامر
const args = process.argv.slice(2);
const useMysql = args.includes('--mysql');
const showHelp = args.includes('--help');

// مسارات مهمة
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const ENV_TEMPLATE_PATH = path.join(ROOT_DIR, 'install', 'config', 'env.template');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const TEMP_DIR = path.join(ROOT_DIR, 'temp');
const FONTS_DIR = path.join(ROOT_DIR, 'fonts');

// عرض المساعدة إذا طلبها المستخدم
if (showHelp) {
  console.log(`
  سكريبت التثبيت الرئيسي لنظام الشهادات والبطاقات الإلكترونية

  طريقة الاستخدام:
  node install/scripts/install.js [--mysql] [--help]

  الخيارات:
  --mysql: استخدام MySQL بدلاً من PostgreSQL كقاعدة بيانات
  --help: عرض هذه الرسالة المساعدة
  `);
  process.exit(0);
}

/**
 * إنشاء مجلد إذا لم يكن موجوداً
 * @param {string} dirPath مسار المجلد
 * @param {string} dirName اسم المجلد (للعرض)
 */
const createDirIfNotExists = (dirPath, dirName) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ تم إنشاء مجلد ${dirName} بنجاح: ${dirPath}`);
    } catch (error) {
      console.error(`❌ فشل في إنشاء مجلد ${dirName}: ${error.message}`);
      throw error;
    }
  } else {
    console.log(`ℹ️ مجلد ${dirName} موجود بالفعل: ${dirPath}`);
  }
};

/**
 * نسخ ملف .env النموذجي وتحديثه
 * @param {Object} dbConfig إعدادات قاعدة البيانات
 */
const setupEnvFile = async (dbConfig) => {
  if (!fs.existsSync(ENV_TEMPLATE_PATH)) {
    console.error(`❌ ملف القالب .env غير موجود في: ${ENV_TEMPLATE_PATH}`);
    throw new Error('Missing .env template file');
  }

  // قراءة ملف القالب
  let envContent = fs.readFileSync(ENV_TEMPLATE_PATH, 'utf8');

  // تحديث إعدادات قاعدة البيانات
  if (useMysql) {
    envContent = envContent
      .replace(/DATABASE_TYPE=.*/, 'DATABASE_TYPE=mysql')
      .replace(/MYSQL_HOST=.*/, `MYSQL_HOST=${dbConfig.host}`)
      .replace(/MYSQL_PORT=.*/, `MYSQL_PORT=${dbConfig.port}`)
      .replace(/MYSQL_USER=.*/, `MYSQL_USER=${dbConfig.user}`)
      .replace(/MYSQL_PASSWORD=.*/, `MYSQL_PASSWORD=${dbConfig.password}`)
      .replace(/MYSQL_DATABASE=.*/, `MYSQL_DATABASE=${dbConfig.database}`);
  } else {
    // PostgreSQL (الافتراضي)
    envContent = envContent
      .replace(/DATABASE_TYPE=.*/, 'DATABASE_TYPE=postgres')
      .replace(/DATABASE_URL=.*/, `DATABASE_URL=postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  }

  // كتابة ملف .env المحدث
  fs.writeFileSync(ENV_PATH, envContent);
  console.log(`✅ تم إنشاء ملف .env بنجاح في: ${ENV_PATH}`);
};

/**
 * تثبيت اعتماديات المشروع (npm)
 */
const installDependencies = async () => {
  console.log('🔄 جاري تثبيت اعتماديات المشروع...');
  try {
    const { stdout, stderr } = await execPromise('npm install', { cwd: ROOT_DIR });
    console.log('✅ تم تثبيت الاعتماديات بنجاح');
    return true;
  } catch (error) {
    console.error('❌ فشل في تثبيت الاعتماديات:', error.message);
    return false;
  }
};

/**
 * بناء وتجميع التطبيق للنشر باستخدام سكريبت build-all.sh
 */
const buildApplication = async () => {
  console.log('🔄 جاري بناء التطبيق...');
  
  // التأكد من وجود السكريبت وإعطاءه صلاحيات التنفيذ
  const buildScript = path.join(ROOT_DIR, 'build-all.sh');
  if (!fs.existsSync(buildScript)) {
    console.error(`❌ سكريبت البناء غير موجود: ${buildScript}`);
    return false;
  }
  
  try {
    // إعطاء صلاحيات التنفيذ للسكريبت
    fs.chmodSync(buildScript, '755');
    console.log('✅ تم إعطاء صلاحيات التنفيذ لسكريبت البناء');
    
    // تنفيذ سكريبت البناء
    const { stdout, stderr } = await execPromise('./build-all.sh', { cwd: ROOT_DIR });
    console.log(stdout);
    if (stderr) console.error(stderr);
    console.log('✅ تم بناء التطبيق بنجاح');
    return true;
  } catch (error) {
    console.error('❌ فشل في بناء التطبيق:', error.message);
    return false;
  }
};

/**
 * تهيئة قاعدة البيانات
 */
const setupDatabase = async () => {
  console.log('🔄 جاري إعداد قاعدة البيانات...');
  
  // استخدام السكريبت المناسب لتهيئة قاعدة البيانات
  const dbScript = useMysql 
    ? path.join(ROOT_DIR, 'scripts', 'install-mysql.js')
    : path.join(ROOT_DIR, 'create-db.ts');
  
  if (!fs.existsSync(dbScript)) {
    console.error(`❌ سكريبت قاعدة البيانات غير موجود: ${dbScript}`);
    return false;
  }
  
  try {
    // تنفيذ سكريبت قاعدة البيانات
    if (useMysql) {
      const { stdout, stderr } = await execPromise(`node ${dbScript}`, { cwd: ROOT_DIR });
      console.log(stdout);
      if (stderr) console.error(stderr);
    } else {
      // استخدام ts-node لتنفيذ سكريبت TypeScript
      const { stdout, stderr } = await execPromise(`npx tsx ${dbScript}`, { cwd: ROOT_DIR });
      console.log(stdout);
      if (stderr) console.error(stderr);
    }
    
    console.log('✅ تم إعداد قاعدة البيانات بنجاح');
    return true;
  } catch (error) {
    console.error('❌ فشل في إعداد قاعدة البيانات:', error.message);
    return false;
  }
};

/**
 * تشغيل سكريبت بناء العميل للتحقق من الخطأ المبلغ عنه في ملف attached_assets
 */
const verifyClientScripts = async () => {
  console.log('🔄 التحقق من نصوص العميل وحل المشكلات...');
  
  // التحقق مما إذا كان الملف الذي يحتوي على الخطأ موجوداً
  const errorFilePath = path.join(ROOT_DIR, 'attached_assets', 'Pasted-not-available-index-9uTCfRAT-js-1-Failed-to-load-module-script-Expected-a-JavaScript-module-scr-1746333540038.txt');
  
  if (fs.existsSync(errorFilePath)) {
    console.log('⚠️ تم اكتشاف تقرير خطأ في الملفات المرفقة. جاري محاولة حل المشكلة...');
    
    try {
      // محاولة حل المشكلة بإعادة بناء العميل
      const buildClientScript = path.join(ROOT_DIR, 'build-client.sh');
      if (fs.existsSync(buildClientScript)) {
        // إعطاء صلاحيات التنفيذ للسكريبت
        fs.chmodSync(buildClientScript, '755');
        
        // تنفيذ سكريبت البناء
        const { stdout, stderr } = await execPromise('./build-client.sh', { cwd: ROOT_DIR });
        console.log(stdout);
        if (stderr) console.error(stderr);
        console.log('✅ تم إعادة بناء العميل بنجاح');
      }
    } catch (error) {
      console.error('⚠️ فشل في إعادة بناء العميل:', error.message);
      console.log('سيستمر السكريبت مع ذلك...');
    }
  }
  
  return true;
};

/**
 * العملية الرئيسية للتثبيت
 */
const install = async () => {
  console.log('🚀 بدء عملية تثبيت نظام الشهادات والبطاقات الإلكترونية');
  console.log(`ℹ️ نوع قاعدة البيانات المختار: ${useMysql ? 'MySQL' : 'PostgreSQL'}`);
  
  try {
    // 1. إنشاء المجلدات اللازمة
    console.log('\n📁 إنشاء المجلدات اللازمة...');
    createDirIfNotExists(LOGS_DIR, 'السجلات');
    createDirIfNotExists(UPLOADS_DIR, 'الملفات المرفوعة');
    createDirIfNotExists(TEMP_DIR, 'الملفات المؤقتة');
    createDirIfNotExists(FONTS_DIR, 'الخطوط');
    
    // 2. الحصول على معلومات قاعدة البيانات
    console.log('\n🗄️ إعداد قاعدة البيانات...');
    const dbConfig = {
      host: await question('أدخل مضيف قاعدة البيانات [localhost]: ') || 'localhost',
      port: await question(`أدخل منفذ قاعدة البيانات [${useMysql ? '3306' : '5432'}]: `) || (useMysql ? '3306' : '5432'),
      user: await question('أدخل اسم مستخدم قاعدة البيانات [postgres]: ') || 'postgres',
      password: await question('أدخل كلمة مرور قاعدة البيانات: ') || '',
      database: await question('أدخل اسم قاعدة البيانات [certificates]: ') || 'certificates'
    };
    
    // 3. إعداد ملف .env
    console.log('\n📝 إنشاء ملف .env...');
    await setupEnvFile(dbConfig);
    
    // 4. تثبيت الاعتماديات
    console.log('\n📦 تثبيت اعتماديات المشروع...');
    const dependenciesInstalled = await installDependencies();
    if (!dependenciesInstalled) {
      const continueAnyway = await question('⚠️ فشل في تثبيت الاعتماديات. هل ترغب في المتابعة على أي حال؟ (y/n): ');
      if (continueAnyway.toLowerCase() !== 'y') {
        throw new Error('تم إلغاء التثبيت بواسطة المستخدم');
      }
    }
    
    // 5. التحقق من نصوص العميل
    console.log('\n🔍 التحقق من نصوص العميل...');
    await verifyClientScripts();
    
    // 6. تهيئة قاعدة البيانات
    console.log('\n🗄️ تهيئة قاعدة البيانات...');
    const dbSetupSuccess = await setupDatabase();
    if (!dbSetupSuccess) {
      const continueAnyway = await question('⚠️ فشل في تهيئة قاعدة البيانات. هل ترغب في المتابعة على أي حال؟ (y/n): ');
      if (continueAnyway.toLowerCase() !== 'y') {
        throw new Error('تم إلغاء التثبيت بواسطة المستخدم');
      }
    }
    
    // 7. بناء التطبيق
    console.log('\n🔨 بناء التطبيق...');
    const buildSuccess = await buildApplication();
    if (!buildSuccess) {
      const continueAnyway = await question('⚠️ فشل في بناء التطبيق. هل ترغب في المتابعة على أي حال؟ (y/n): ');
      if (continueAnyway.toLowerCase() !== 'y') {
        throw new Error('تم إلغاء التثبيت بواسطة المستخدم');
      }
    }
    
    // 8. إكمال التثبيت
    console.log('\n🎉 تم اكتمال عملية التثبيت بنجاح!');
    console.log(`
    معلومات تسجيل الدخول:
    --------------------
    اسم المستخدم: admin
    كلمة المرور: 700700
    
    لبدء التطبيق في وضع التطوير:
    --------------------------
    npm run dev
    
    لبناء وتجميع التطبيق للنشر:
    ------------------------
    ./build-all.sh
    
    للحصول على مزيد من المعلومات، يرجى الرجوع إلى:
    ----------------------------------
    - دليل التطوير: DEVELOPER-GUIDE.md
    - دليل النشر: HOSTINGER-DEPLOYMENT-GUIDE.md
    `);
    
  } catch (error) {
    console.error(`\n❌ حدث خطأ أثناء عملية التثبيت: ${error.message}`);
    console.error('يرجى التحقق من السجلات ومحاولة إصلاح المشكلة ثم المحاولة مرة أخرى.');
  } finally {
    // إغلاق واجهة القراءة
    rl.close();
  }
};

// بدء عملية التثبيت
install();
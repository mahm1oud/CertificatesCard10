#!/usr/bin/env node

/**
 * سكريبت تثبيت قاعدة بيانات MySQL وإعداد بيئة هوستنجر
 * 
 * هذا السكريبت يقوم بشكل آلي بإعداد قاعدة بيانات MySQL وتهيئة النظام للعمل
 * على استضافة هوستنجر أو أي استضافة تدعم MySQL
 * 
 * كيفية الاستخدام:
 * NODE_ENV=production node scripts/install-mysql.js
 * 
 * يمكن التحكم في عملية التثبيت من خلال متغيرات البيئة:
 * - DB_NAME: اسم قاعدة البيانات
 * - DB_USER: اسم المستخدم
 * - DB_PASSWORD: كلمة المرور
 * - DB_HOST: اسم المضيف
 * - DB_PORT: رقم المنفذ
 * - ADMIN_PASSWORD: كلمة مرور المسؤول (اختياري)
 * - RESET_DB: تعيين إلى "true" لإعادة تعيين قاعدة البيانات (اختياري)
 */

// استدعاء المكتبات اللازمة
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');

// تقليل منتجات العمل
let connection = null;
let hostingerConfig = null;

// تكوين قارئ السطر للمدخلات التفاعلية
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = promisify(rl.question).bind(rl);

/**
 * تحميل إعدادات هوستنجر إذا كانت موجودة
 */
async function loadHostingerConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'hostinger.config.js');
    if (fs.existsSync(configPath)) {
      hostingerConfig = require(configPath);
      console.log('✅ تم تحميل ملف إعدادات هوستنجر بنجاح');
      return hostingerConfig;
    }
  } catch (error) {
    console.warn('⚠️ فشل في تحميل ملف إعدادات هوستنجر:', error.message);
  }
  return null;
}

/**
 * الحصول على معلومات الاتصال بقاعدة البيانات
 */
async function getDatabaseCredentials() {
  // البحث عن إعدادات الاتصال من المتغيرات البيئية أو ملف الإعدادات
  const dbConfig = hostingerConfig?.database || {};
  
  const credentials = {
    host: process.env.DB_HOST || dbConfig.host || process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || dbConfig.port || process.env.MYSQL_PORT || '3306'),
    user: process.env.DB_USER || dbConfig.user || process.env.MYSQL_USER || '',
    password: process.env.DB_PASSWORD || dbConfig.password || process.env.MYSQL_PASSWORD || '',
    database: process.env.DB_NAME || dbConfig.name || process.env.MYSQL_DATABASE || 'certificates',
    resetDb: process.env.RESET_DB === 'true'
  };

  // إذا لم تكن المعلومات موجودة، اطلب من المستخدم إدخالها
  if (!credentials.user) {
    credentials.user = await question('أدخل اسم مستخدم قاعدة البيانات: ');
  }
  
  if (!credentials.password) {
    credentials.password = await question('أدخل كلمة مرور قاعدة البيانات: ');
  }

  return credentials;
}

/**
 * إنشاء اتصال بقاعدة البيانات MySQL
 */
async function createConnection(credentials, connectToSpecificDb = true) {
  try {
    const connectionConfig = {
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
      password: credentials.password,
      multipleStatements: true
    };

    // إذا كان الاتصال بقاعدة بيانات محددة
    if (connectToSpecificDb) {
      connectionConfig.database = credentials.database;
    }

    // إنشاء اتصال
    const conn = await mysql.createConnection(connectionConfig);
    console.log('✅ تم الاتصال بخادم MySQL بنجاح');
    return conn;
  } catch (error) {
    console.error('❌ فشل في الاتصال بخادم MySQL:', error.message);
    throw error;
  }
}

/**
 * التحقق من وجود قاعدة البيانات وإنشائها إذا لم تكن موجودة
 */
async function checkAndCreateDatabase(credentials) {
  let rootConnection = null;
  try {
    // الاتصال بخادم MySQL بدون تحديد قاعدة بيانات
    rootConnection = await createConnection(credentials, false);
    
    // التحقق من وجود قاعدة البيانات
    console.log(`🔍 التحقق من وجود قاعدة البيانات "${credentials.database}"...`);
    const [rows] = await rootConnection.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${credentials.database}'`
    );

    if (rows.length === 0) {
      // إنشاء قاعدة البيانات إذا لم تكن موجودة
      console.log(`🔧 إنشاء قاعدة البيانات "${credentials.database}"...`);
      await rootConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${credentials.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('✅ تم إنشاء قاعدة البيانات بنجاح');
      
    } else if (credentials.resetDb) {
      // إعادة تعيين قاعدة البيانات إذا كان مطلوباً
      const confirm = await question(`⚠️ قاعدة البيانات "${credentials.database}" موجودة بالفعل. هل تريد إعادة تعيينها؟ (نعم/لا): `);
      if (confirm.toLowerCase() === 'نعم' || confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
        console.log(`🔄 إعادة تعيين قاعدة البيانات "${credentials.database}"...`);
        await rootConnection.execute(`DROP DATABASE \`${credentials.database}\``);
        await rootConnection.execute(`CREATE DATABASE \`${credentials.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('✅ تم إعادة تعيين قاعدة البيانات بنجاح');
      } else {
        console.log('⏭️ تم تخطي إعادة تعيين قاعدة البيانات');
      }
    } else {
      console.log('✅ قاعدة البيانات موجودة بالفعل');
    }
    
    return true;
  } catch (error) {
    console.error('❌ فشل في التحقق من قاعدة البيانات أو إنشائها:', error.message);
    throw error;
  } finally {
    if (rootConnection) {
      await rootConnection.end();
    }
  }
}

/**
 * استيراد هيكل قاعدة البيانات من ملف SQL
 */
async function importDatabaseSchema(credentials) {
  try {
    // الاتصال بقاعدة البيانات المحددة
    connection = await createConnection(credentials);
    
    // قراءة ملف SQL
    const sqlFilePath = path.join(__dirname, '..', 'certificates_database.sql');
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`ملف SQL غير موجود: ${sqlFilePath}`);
    }
    
    console.log('🔧 استيراد هيكل قاعدة البيانات...');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // تنفيذ استعلامات SQL
    await connection.query(sqlContent);
    
    console.log('✅ تم استيراد هيكل قاعدة البيانات بنجاح');
    return true;
  } catch (error) {
    console.error('❌ فشل في استيراد هيكل قاعدة البيانات:', error.message);
    throw error;
  }
}

/**
 * التحقق من وجود مستخدم المسؤول وإنشائه إذا لم يكن موجوداً
 */
async function checkAndCreateAdminUser(credentials) {
  try {
    // التحقق من وجود جدول المستخدمين
    const [tablesResult] = await connection.query(
      `SHOW TABLES LIKE 'users'`
    );
    
    if (tablesResult.length === 0) {
      console.warn('⚠️ جدول المستخدمين غير موجود، تخطي إنشاء المستخدم المسؤول');
      return false;
    }
    
    // التحقق من وجود مستخدم المسؤول
    const [adminResult] = await connection.query(
      `SELECT * FROM users WHERE username = 'admin'`
    );
    
    // الحصول على كلمة مرور المسؤول
    const adminPassword = process.env.ADMIN_PASSWORD || hostingerConfig?.app?.defaultAdminPassword || '700700';
    
    if (adminResult.length === 0) {
      // إنشاء مستخدم المسؤول إذا لم يكن موجوداً
      console.log('🔧 إنشاء مستخدم المسؤول...');
      
      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      // إدراج المستخدم
      await connection.execute(
        `INSERT INTO users (username, password, full_name, email, is_admin, role)
         VALUES ('admin', ?, 'مدير النظام', 'admin@example.com', true, 'admin')`,
        [hashedPassword]
      );
      
      console.log('✅ تم إنشاء مستخدم المسؤول بنجاح');
      console.log('👤 اسم المستخدم: admin');
      console.log(`🔑 كلمة المرور: ${adminPassword}`);
    } else {
      // تحديث كلمة مرور المسؤول إذا كان مطلوباً
      const updatePassword = await question('هل تريد تحديث كلمة مرور المسؤول؟ (نعم/لا): ');
      
      if (updatePassword.toLowerCase() === 'نعم' || updatePassword.toLowerCase() === 'yes' || updatePassword.toLowerCase() === 'y') {
        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        // تحديث كلمة المرور
        await connection.execute(
          `UPDATE users SET password = ? WHERE username = 'admin'`,
          [hashedPassword]
        );
        
        console.log('✅ تم تحديث كلمة مرور المسؤول بنجاح');
        console.log('👤 اسم المستخدم: admin');
        console.log(`🔑 كلمة المرور: ${adminPassword}`);
      } else {
        console.log('⏭️ تم تخطي تحديث كلمة مرور المسؤول');
        console.log('👤 اسم المستخدم: admin');
        console.log(`🔑 كلمة المرور الافتراضية: ${adminPassword}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ فشل في التحقق من مستخدم المسؤول أو إنشائه:', error.message);
    return false;
  }
}

/**
 * إنشاء ملف .env مع إعدادات الاتصال
 */
async function createEnvFile(credentials) {
  try {
    // الحصول على مسار ملف .env
    const envFilePath = path.join(__dirname, '..', '.env');
    
    // محتوى ملف .env
    const envContent = `# منصة الشهادات والبطاقات الإلكترونية - ملف الإعدادات البيئية
# تم إنشاؤه تلقائياً بواسطة سكريبت التثبيت
# تاريخ الإنشاء: ${new Date().toISOString().split('T')[0]}

# بيئة العمل
NODE_ENV=production

# إعدادات الخادم
PORT=3000

# إعدادات قاعدة البيانات MySQL
MYSQL_HOST=${credentials.host}
MYSQL_PORT=${credentials.port}
MYSQL_USER=${credentials.user}
MYSQL_PASSWORD=${credentials.password}
MYSQL_DATABASE=${credentials.database}

# إعدادات الجلسات
SESSION_SECRET=${generateRandomString(32)}
SESSION_NAME=certificates.sid

# إعدادات التشخيص
DEBUG_MODE=false
LOG_LEVEL=info
STORE_ERRORS=true
PERFORMANCE_MONITORING=true
REQUEST_TRACKING=true

# أمان إضافي
JWT_SECRET=${generateRandomString(32)}
`;
    
    // كتابة ملف .env
    fs.writeFileSync(envFilePath, envContent, 'utf8');
    
    console.log('✅ تم إنشاء ملف .env بنجاح');
    return true;
  } catch (error) {
    console.error('❌ فشل في إنشاء ملف .env:', error.message);
    return false;
  }
}

/**
 * إنشاء مجلدات النظام اللازمة
 */
async function createSystemFolders() {
  try {
    // قائمة المجلدات التي سيتم إنشاؤها
    const folders = [
      path.join(__dirname, '..', 'uploads'),
      path.join(__dirname, '..', 'uploads', 'certificates'),
      path.join(__dirname, '..', 'uploads', 'logos'),
      path.join(__dirname, '..', 'uploads', 'signatures'),
      path.join(__dirname, '..', 'temp'),
      path.join(__dirname, '..', 'logs'),
    ];
    
    // إنشاء المجلدات
    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`✅ تم إنشاء مجلد "${folder}"`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ فشل في إنشاء مجلدات النظام:', error.message);
    return false;
  }
}

/**
 * توليد سلسلة عشوائية
 */
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * الدالة الرئيسية لتنفيذ السكريبت
 */
async function main() {
  try {
    console.log('🚀 بدء عملية تثبيت قاعدة بيانات MySQL وإعداد بيئة هوستنجر...');
    
    // تحميل إعدادات هوستنجر
    await loadHostingerConfig();
    
    // الحصول على معلومات الاتصال بقاعدة البيانات
    const credentials = await getDatabaseCredentials();
    
    // التحقق من وجود قاعدة البيانات وإنشائها إذا لم تكن موجودة
    await checkAndCreateDatabase(credentials);
    
    // استيراد هيكل قاعدة البيانات
    await importDatabaseSchema(credentials);
    
    // التحقق من وجود مستخدم المسؤول وإنشائه إذا لم يكن موجوداً
    await checkAndCreateAdminUser(credentials);
    
    // إنشاء ملف .env
    await createEnvFile(credentials);
    
    // إنشاء مجلدات النظام
    await createSystemFolders();
    
    console.log('✨ تم تثبيت وإعداد النظام بنجاح!');
    console.log('📝 يمكنك الآن تشغيل النظام باستخدام الأمر التالي:');
    console.log('   NODE_ENV=production node server/index.js');
    
    return true;
  } catch (error) {
    console.error('❌ فشل في تثبيت النظام:', error.message);
    return false;
  } finally {
    // إغلاق اتصال قاعدة البيانات
    if (connection) {
      await connection.end();
    }
    
    // إغلاق قارئ السطر
    rl.close();
  }
}

// تنفيذ الدالة الرئيسية
main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ حدث خطأ غير متوقع:', error);
    process.exit(1);
  });
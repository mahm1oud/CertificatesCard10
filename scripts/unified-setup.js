/**
 * سكريبت التثبيت والإعداد الموحد
 * 
 * هذا السكريبت يقوم بجميع عمليات التثبيت والإعداد بخطوة واحدة:
 * - إنشاء وإعداد قاعدة البيانات (MySQL أو PostgreSQL)
 * - تهيئة ملفات البيئة
 * - إنشاء المجلدات اللازمة
 * - إنشاء المستخدم الأول (الإدارة)
 * - إعداد الخادم للتشغيل
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const readline = require('readline');
const mysql = require('mysql2/promise');
const { Pool, Client } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// --------------------------------
// وظائف مساعدة
// --------------------------------

/**
 * طباعة رسالة مع لون
 * @param {string} message الرسالة المراد طباعتها
 * @param {string} type نوع الرسالة (info, success, warning, error)
 */
function printMessage(message, type = 'info') {
  const colors = {
    info: '\x1b[36m%s\x1b[0m',     // أزرق فاتح
    success: '\x1b[32m%s\x1b[0m',  // أخضر
    warning: '\x1b[33m%s\x1b[0m',  // أصفر
    error: '\x1b[31m%s\x1b[0m'     // أحمر
  };
  
  console.log(colors[type] || colors.info, message);
}

/**
 * إنشاء واجهة قراءة من المستخدم
 * @returns {readline.Interface}
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * سؤال المستخدم
 * @param {string} question السؤال المراد طرحه
 * @param {string} defaultValue القيمة الافتراضية (اختيارية)
 * @returns {Promise<string>} إجابة المستخدم
 */
async function askQuestion(question, defaultValue = '') {
  const rl = createInterface();
  
  return new Promise(resolve => {
    rl.question(`${question}${defaultValue ? ` (افتراضي: ${defaultValue})` : ''}: `, (answer) => {
      rl.close();
      resolve(answer || defaultValue);
    });
  });
}

/**
 * إنشاء سلسلة عشوائية
 * @param {number} length طول السلسلة
 * @returns {string} سلسلة عشوائية
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * التحقق من وجود ملف
 * @param {string} filePath مسار الملف
 * @returns {boolean} هل الملف موجود
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * إنشاء مجلد إذا لم يكن موجودًا
 * @param {string} dirPath مسار المجلد
 */
function createDirIfNotExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    printMessage(`✅ تم إنشاء مجلد: ${dirPath}`, 'success');
  }
}

/**
 * تحميل ملف SQL وتنفيذه
 * @param {string} filePath مسار ملف SQL
 * @returns {string} محتوى الملف
 */
function loadSqlFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    printMessage(`❌ خطأ في قراءة ملف SQL ${filePath}: ${error.message}`, 'error');
    return '';
  }
}

/**
 * تقسيم ملف SQL إلى استعلامات فردية
 * @param {string} sqlContent محتوى ملف SQL
 * @returns {string[]} مصفوفة من الاستعلامات
 */
function splitSqlQueries(sqlContent) {
  // إزالة التعليقات والأسطر الفارغة
  const cleanedContent = sqlContent
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//gm, '')
    .trim();
  
  // تقسيم الاستعلامات على أساس الفاصلة المنقوطة
  return cleanedContent
    .split(';')
    .map(query => query.trim())
    .filter(query => query.length > 0);
}

// --------------------------------
// قاعدة البيانات - MySQL
// --------------------------------

/**
 * إنشاء اتصال MySQL
 * @param {Object} config إعدادات الاتصال
 * @param {boolean} withDatabase هل يتم تحديد قاعدة البيانات
 * @returns {Promise<mysql.Connection>} اتصال MySQL
 */
async function createMySqlConnection(config, withDatabase = true) {
  try {
    const connectionConfig = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      ...(withDatabase ? { database: config.database } : {})
    };
    
    return await mysql.createConnection(connectionConfig);
  } catch (error) {
    printMessage(`❌ خطأ في الاتصال بـ MySQL: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * إنشاء قاعدة بيانات MySQL
 * @param {Object} config إعدادات الاتصال
 */
async function setupMySqlDatabase(config) {
  printMessage(`🔄 إعداد قاعدة بيانات MySQL...`, 'info');
  
  try {
    // اتصال بدون تحديد قاعدة بيانات
    const connection = await createMySqlConnection(config, false);
    
    // إنشاء قاعدة البيانات إذا لم تكن موجودة
    printMessage(`🔄 التحقق من وجود قاعدة البيانات ${config.database}...`, 'info');
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    printMessage(`✅ تم التأكد من وجود قاعدة البيانات ${config.database}`, 'success');
    
    // إغلاق الاتصال
    await connection.end();
    
    // اتصال جديد مع تحديد قاعدة البيانات
    const dbConnection = await createMySqlConnection(config, true);
    
    // تحميل وتنفيذ ملف SQL
    const sqlFilePath = path.join(process.cwd(), 'certificates_database.sql');
    if (fileExists(sqlFilePath)) {
      printMessage(`🔄 جاري تنفيذ ملف SQL: ${sqlFilePath}...`, 'info');
      
      const sqlContent = loadSqlFile(sqlFilePath);
      const queries = splitSqlQueries(sqlContent);
      
      for (const query of queries) {
        try {
          await dbConnection.execute(query);
        } catch (error) {
          printMessage(`⚠️ خطأ في تنفيذ استعلام SQL: ${error.message}`, 'warning');
          // الاستمرار رغم الخطأ
        }
      }
      
      printMessage(`✅ تم تنفيذ ملف SQL بنجاح`, 'success');
    } else {
      printMessage(`⚠️ ملف SQL غير موجود: ${sqlFilePath}، سيتم إنشاء الجداول يدويًا`, 'warning');
      
      // إنشاء الجداول الأساسية يدويًا
      const tableQueries = [
        // جدول المستخدمين
        `CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          fullName VARCHAR(100),
          email VARCHAR(100),
          role ENUM('admin', 'user') DEFAULT 'user',
          active BOOLEAN DEFAULT TRUE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        
        // جدول التصنيفات
        `CREATE TABLE IF NOT EXISTS categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          displayOrder INT DEFAULT 0,
          icon VARCHAR(50) DEFAULT '📄',
          active BOOLEAN DEFAULT TRUE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        
        // جدول القوالب
        `CREATE TABLE IF NOT EXISTS templates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(100) NOT NULL,
          subtitle VARCHAR(100),
          description TEXT,
          categoryId INT,
          imageUrl VARCHAR(255),
          previewUrl VARCHAR(255),
          slug VARCHAR(100),
          active BOOLEAN DEFAULT TRUE,
          featured BOOLEAN DEFAULT FALSE,
          type ENUM('certificate', 'card', 'badge') DEFAULT 'certificate',
          direction ENUM('rtl', 'ltr') DEFAULT 'rtl',
          format ENUM('landscape', 'portrait') DEFAULT 'landscape',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
        )`,
        
        // جدول حقول القوالب
        `CREATE TABLE IF NOT EXISTS template_fields (
          id INT AUTO_INCREMENT PRIMARY KEY,
          templateId INT NOT NULL,
          name VARCHAR(50) NOT NULL,
          label VARCHAR(100) NOT NULL,
          labelAr VARCHAR(100),
          type ENUM('text', 'date', 'number', 'image', 'color', 'select') DEFAULT 'text',
          imageType VARCHAR(50),
          required BOOLEAN DEFAULT FALSE,
          defaultValue TEXT,
          placeholder VARCHAR(100),
          placeholderAr VARCHAR(100),
          options JSON,
          position JSON,
          style JSON,
          displayOrder INT DEFAULT 0,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (templateId) REFERENCES templates(id) ON DELETE CASCADE
        )`
      ];
      
      for (const query of tableQueries) {
        try {
          await dbConnection.execute(query);
        } catch (error) {
          printMessage(`❌ خطأ في إنشاء جدول: ${error.message}`, 'error');
        }
      }
      
      printMessage(`✅ تم إنشاء الجداول الأساسية بنجاح`, 'success');
    }
    
    // إنشاء مستخدم admin
    await setupAdminUser(dbConnection);
    
    // إغلاق الاتصال
    await dbConnection.end();
    
    printMessage(`✅ تم إعداد قاعدة بيانات MySQL بنجاح`, 'success');
    return true;
  } catch (error) {
    printMessage(`❌ فشل في إعداد قاعدة بيانات MySQL: ${error.message}`, 'error');
    return false;
  }
}

/**
 * إنشاء مستخدم admin
 * @param {mysql.Connection} connection اتصال قاعدة البيانات
 */
async function setupAdminUser(connection) {
  printMessage(`🔄 التحقق من وجود مستخدم admin...`, 'info');
  
  try {
    // التحقق من وجود مستخدم admin
    const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if (users.length === 0) {
      // إنشاء مستخدم admin إذا لم يكن موجودًا
      printMessage(`🔄 إنشاء مستخدم admin جديد...`, 'info');
      
      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash('700700', 10);
      
      // إدراج المستخدم
      await connection.execute(
        'INSERT INTO users (username, password, fullName, role, active) VALUES (?, ?, ?, ?, ?)',
        ['admin', hashedPassword, 'مدير النظام', 'admin', true]
      );
      
      printMessage(`✅ تم إنشاء مستخدم admin بنجاح (اسم المستخدم: admin، كلمة المرور: 700700)`, 'success');
    } else {
      // تحديث كلمة مرور admin إذا كان موجودًا
      printMessage(`🔄 تحديث كلمة مرور مستخدم admin...`, 'info');
      
      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash('700700', 10);
      
      // تحديث كلمة المرور
      await connection.execute(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, 'admin']
      );
      
      printMessage(`✅ تم تحديث كلمة مرور مستخدم admin (اسم المستخدم: admin، كلمة المرور: 700700)`, 'success');
    }
  } catch (error) {
    printMessage(`❌ خطأ في إعداد مستخدم admin: ${error.message}`, 'error');
  }
}

// --------------------------------
// قاعدة البيانات - PostgreSQL
// --------------------------------

/**
 * إنشاء اتصال PostgreSQL
 * @param {Object} config إعدادات الاتصال
 * @returns {Promise<pg.Client>} اتصال PostgreSQL
 */
async function createPgConnection(config) {
  try {
    const connectionConfig = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl
    };
    
    const client = new Client(connectionConfig);
    await client.connect();
    return client;
  } catch (error) {
    printMessage(`❌ خطأ في الاتصال بـ PostgreSQL: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * إنشاء قاعدة بيانات PostgreSQL
 * @param {Object} config إعدادات الاتصال
 */
async function setupPgDatabase(config) {
  printMessage(`🔄 إعداد قاعدة بيانات PostgreSQL...`, 'info');
  
  try {
    // اتصال بقاعدة بيانات postgres العامة
    const mainConfig = { ...config, database: 'postgres' };
    const mainClient = await createPgConnection(mainConfig);
    
    // التحقق من وجود قاعدة البيانات
    const { rows } = await mainClient.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [config.database]);
    
    if (rows.length === 0) {
      // إنشاء قاعدة البيانات إذا لم تكن موجودة
      printMessage(`🔄 إنشاء قاعدة بيانات ${config.database}...`, 'info');
      await mainClient.query(`CREATE DATABASE ${config.database}`);
      printMessage(`✅ تم إنشاء قاعدة البيانات ${config.database}`, 'success');
    } else {
      printMessage(`✅ قاعدة البيانات ${config.database} موجودة بالفعل`, 'success');
    }
    
    // إغلاق الاتصال
    await mainClient.end();
    
    // اتصال بقاعدة البيانات الجديدة
    const client = await createPgConnection(config);
    
    // تحميل وتنفيذ ملف SQL
    const sqlFilePath = path.join(process.cwd(), 'certificates_database_pg.sql');
    if (fileExists(sqlFilePath)) {
      printMessage(`🔄 جاري تنفيذ ملف SQL: ${sqlFilePath}...`, 'info');
      
      const sqlContent = loadSqlFile(sqlFilePath);
      const queries = splitSqlQueries(sqlContent);
      
      for (const query of queries) {
        try {
          await client.query(query);
        } catch (error) {
          printMessage(`⚠️ خطأ في تنفيذ استعلام SQL: ${error.message}`, 'warning');
          // الاستمرار رغم الخطأ
        }
      }
      
      printMessage(`✅ تم تنفيذ ملف SQL بنجاح`, 'success');
    } else {
      printMessage(`⚠️ ملف SQL غير موجود: ${sqlFilePath}، سيتم إنشاء الجداول يدويًا`, 'warning');
      
      // إنشاء الجداول الأساسية يدويًا
      const tableQueries = [
        // جدول المستخدمين
        `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          "fullName" VARCHAR(100),
          email VARCHAR(100),
          role VARCHAR(10) CHECK (role IN ('admin', 'user')) DEFAULT 'user',
          active BOOLEAN DEFAULT TRUE,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // جدول التصنيفات
        `CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          "displayOrder" INTEGER DEFAULT 0,
          icon VARCHAR(50) DEFAULT '📄',
          active BOOLEAN DEFAULT TRUE,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // جدول القوالب
        `CREATE TABLE IF NOT EXISTS templates (
          id SERIAL PRIMARY KEY,
          title VARCHAR(100) NOT NULL,
          subtitle VARCHAR(100),
          description TEXT,
          "categoryId" INTEGER,
          "imageUrl" VARCHAR(255),
          "previewUrl" VARCHAR(255),
          slug VARCHAR(100),
          active BOOLEAN DEFAULT TRUE,
          featured BOOLEAN DEFAULT FALSE,
          type VARCHAR(20) CHECK (type IN ('certificate', 'card', 'badge')) DEFAULT 'certificate',
          direction VARCHAR(3) CHECK (direction IN ('rtl', 'ltr')) DEFAULT 'rtl',
          format VARCHAR(20) CHECK (format IN ('landscape', 'portrait')) DEFAULT 'landscape',
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE SET NULL
        )`,
        
        // جدول حقول القوالب
        `CREATE TABLE IF NOT EXISTS template_fields (
          id SERIAL PRIMARY KEY,
          "templateId" INTEGER NOT NULL,
          name VARCHAR(50) NOT NULL,
          label VARCHAR(100) NOT NULL,
          "labelAr" VARCHAR(100),
          type VARCHAR(20) CHECK (type IN ('text', 'date', 'number', 'image', 'color', 'select')) DEFAULT 'text',
          "imageType" VARCHAR(50),
          required BOOLEAN DEFAULT FALSE,
          "defaultValue" TEXT,
          placeholder VARCHAR(100),
          "placeholderAr" VARCHAR(100),
          options JSONB,
          position JSONB,
          style JSONB,
          "displayOrder" INTEGER DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("templateId") REFERENCES templates(id) ON DELETE CASCADE
        )`
      ];
      
      for (const query of tableQueries) {
        try {
          await client.query(query);
        } catch (error) {
          printMessage(`❌ خطأ في إنشاء جدول: ${error.message}`, 'error');
        }
      }
      
      printMessage(`✅ تم إنشاء الجداول الأساسية بنجاح`, 'success');
    }
    
    // إنشاء مستخدم admin في PostgreSQL
    await setupPgAdminUser(client);
    
    // إغلاق الاتصال
    await client.end();
    
    printMessage(`✅ تم إعداد قاعدة بيانات PostgreSQL بنجاح`, 'success');
    return true;
  } catch (error) {
    printMessage(`❌ فشل في إعداد قاعدة بيانات PostgreSQL: ${error.message}`, 'error');
    return false;
  }
}

/**
 * إنشاء مستخدم admin في PostgreSQL
 * @param {pg.Client} client اتصال قاعدة البيانات
 */
async function setupPgAdminUser(client) {
  printMessage(`🔄 التحقق من وجود مستخدم admin...`, 'info');
  
  try {
    // التحقق من وجود مستخدم admin
    const { rows } = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);
    
    if (rows.length === 0) {
      // إنشاء مستخدم admin إذا لم يكن موجودًا
      printMessage(`🔄 إنشاء مستخدم admin جديد...`, 'info');
      
      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash('700700', 10);
      
      // إدراج المستخدم
      await client.query(
        'INSERT INTO users (username, password, "fullName", role, active) VALUES ($1, $2, $3, $4, $5)',
        ['admin', hashedPassword, 'مدير النظام', 'admin', true]
      );
      
      printMessage(`✅ تم إنشاء مستخدم admin بنجاح (اسم المستخدم: admin، كلمة المرور: 700700)`, 'success');
    } else {
      // تحديث كلمة مرور admin إذا كان موجودًا
      printMessage(`🔄 تحديث كلمة مرور مستخدم admin...`, 'info');
      
      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash('700700', 10);
      
      // تحديث كلمة المرور
      await client.query(
        'UPDATE users SET password = $1 WHERE username = $2',
        [hashedPassword, 'admin']
      );
      
      printMessage(`✅ تم تحديث كلمة مرور مستخدم admin (اسم المستخدم: admin، كلمة المرور: 700700)`, 'success');
    }
  } catch (error) {
    printMessage(`❌ خطأ في إعداد مستخدم admin: ${error.message}`, 'error');
  }
}

// --------------------------------
// إعداد ملفات البيئة
// --------------------------------

/**
 * إنشاء ملف .env
 * @param {Object} config إعدادات البيئة
 */
async function setupEnvFile(config) {
  printMessage(`🔄 إعداد ملف .env...`, 'info');
  
  const envPath = path.join(process.cwd(), '.env');
  const defaultContent = `# إعدادات البيئة
# تم إنشاء هذا الملف تلقائيًا بواسطة سكريبت التثبيت
# آخر تحديث: ${new Date().toLocaleString()}

# بيئة التشغيل: development أو production
NODE_ENV=${config.environment}

# منفذ التشغيل
PORT=${config.port}

# نوع قاعدة البيانات: mysql أو postgres
DB_TYPE=${config.dbType}

# إعدادات قاعدة البيانات المشتركة
DATABASE_URL=${config.dbUrl || ''}

# إعدادات MySQL
DB_HOST=${config.dbHost}
DB_PORT=${config.dbPort}
DB_USER=${config.dbUser}
DB_PASSWORD=${config.dbPassword}
DB_NAME=${config.dbName}
DB_CONNECTION_LIMIT=10

# مسارات المجلدات
UPLOADS_DIR=uploads
TEMP_DIR=temp
LOGS_DIR=logs
FONTS_DIR=fonts

# إعدادات الأمان
SESSION_SECRET=${config.sessionSecret}

# المضيفين المسموح بهم للطلبات (مفصولين بفواصل)
ALLOWED_ORIGINS=*
`;
  
  fs.writeFileSync(envPath, defaultContent, 'utf8');
  printMessage(`✅ تم إنشاء ملف .env بنجاح: ${envPath}`, 'success');
}

/**
 * إنشاء ملف hostinger.config.js
 * @param {Object} config إعدادات البيئة
 */
async function setupHostingerConfig(config) {
  printMessage(`🔄 إعداد ملف hostinger.config.js...`, 'info');
  
  const configPath = path.join(process.cwd(), 'hostinger.config.js');
  const defaultContent = `/**
 * إعدادات استضافة هوستنجر
 * تم إنشاء هذا الملف تلقائيًا بواسطة سكريبت التثبيت
 * آخر تحديث: ${new Date().toLocaleString()}
 */

module.exports = {
  // إعدادات قاعدة البيانات
  database: {
    type: '${config.dbType}',
    host: '${config.dbHost}',
    port: ${config.dbPort},
    user: '${config.dbUser}',
    password: '${config.dbPassword}',
    name: '${config.dbName}',
    connectionLimit: 10
  },
  
  // إعدادات الخادم
  server: {
    port: ${config.port},
    host: '0.0.0.0'
  },
  
  // إعدادات المسارات
  paths: {
    uploads: 'uploads',
    temp: 'temp',
    logs: 'logs',
    fonts: 'fonts',
    static: 'public'
  },
  
  // إعدادات الأمان
  security: {
    sessionSecret: '${config.sessionSecret}'
  },
  
  // إعدادات API
  api: {
    allowedOrigins: ['*']
  }
};
`;
  
  fs.writeFileSync(configPath, defaultContent, 'utf8');
  printMessage(`✅ تم إنشاء ملف hostinger.config.js بنجاح: ${configPath}`, 'success');
}

// --------------------------------
// إعداد المجلدات
// --------------------------------

/**
 * إنشاء مجلدات النظام
 */
async function setupDirectories() {
  printMessage(`🔄 إنشاء مجلدات النظام...`, 'info');
  
  const directories = [
    'uploads',
    'temp',
    'logs',
    'fonts'
  ];
  
  for (const dir of directories) {
    createDirIfNotExists(path.join(process.cwd(), dir));
  }
  
  printMessage(`✅ تم إنشاء جميع مجلدات النظام`, 'success');
}

// --------------------------------
// تنفيذ عملية التثبيت
// --------------------------------

/**
 * الوظيفة الرئيسية للتثبيت
 */
async function main() {
  try {
    printMessage(`
==============================================
  تثبيت وإعداد منصة الشهادات والبطاقات الإلكترونية
==============================================
    `, 'info');
    
    // 1. تحديد نوع التثبيت
    const setupType = await askQuestion(
      'نوع التثبيت (development, production)',
      'development'
    );
    
    // 2. تحديد نوع قاعدة البيانات
    const dbType = await askQuestion(
      'نوع قاعدة البيانات (mysql, postgres)',
      process.env.REPL_ID ? 'postgres' : 'mysql'
    );
    
    // 3. إعدادات قاعدة البيانات
    const dbConfig = {};
    
    if (dbType === 'mysql') {
      dbConfig.host = await askQuestion('مضيف MySQL (host)', 'localhost');
      dbConfig.port = parseInt(await askQuestion('منفذ MySQL (port)', '3306'));
      dbConfig.user = await askQuestion('اسم مستخدم MySQL (user)', 'root');
      dbConfig.password = await askQuestion('كلمة مرور MySQL (password)', '');
      dbConfig.database = await askQuestion('اسم قاعدة بيانات MySQL', 'certificates_db');
    } else {
      if (process.env.REPL_ID) {
        // في بيئة Replit، نستخدم DATABASE_URL
        dbConfig.url = process.env.DATABASE_URL;
        dbConfig.host = 'localhost';
        dbConfig.port = 5432;
        dbConfig.user = 'postgres';
        dbConfig.password = '';
        dbConfig.database = 'postgres';
        dbConfig.ssl = false;
      } else {
        dbConfig.host = await askQuestion('مضيف PostgreSQL (host)', 'localhost');
        dbConfig.port = parseInt(await askQuestion('منفذ PostgreSQL (port)', '5432'));
        dbConfig.user = await askQuestion('اسم مستخدم PostgreSQL (user)', 'postgres');
        dbConfig.password = await askQuestion('كلمة مرور PostgreSQL (password)', '');
        dbConfig.database = await askQuestion('اسم قاعدة بيانات PostgreSQL', 'certificates_db');
        dbConfig.ssl = false;
      }
    }
    
    // 4. إعدادات الخادم
    const serverPort = parseInt(await askQuestion('منفذ الخادم', '5000'));
    
    // 5. مفتاح الجلسة
    const sessionSecret = await askQuestion(
      'مفتاح الجلسة (SESSION_SECRET)',
      generateRandomString(32)
    );
    
    // 6. إنشاء إعدادات البيئة
    const configObject = {
      environment: setupType,
      dbType,
      dbHost: dbConfig.host,
      dbPort: dbConfig.port,
      dbUser: dbConfig.user,
      dbPassword: dbConfig.password,
      dbName: dbConfig.database,
      dbUrl: dbConfig.url,
      port: serverPort,
      sessionSecret
    };
    
    // 7. إعداد مجلدات النظام
    await setupDirectories();
    
    // 8. إنشاء ملفات البيئة
    await setupEnvFile(configObject);
    await setupHostingerConfig(configObject);
    
    // 9. إعداد قاعدة البيانات
    if (dbType === 'mysql') {
      await setupMySqlDatabase(dbConfig);
    } else {
      await setupPgDatabase(dbConfig);
    }
    
    // 10. الانتهاء من التثبيت
    printMessage(`
==============================================
  تم تثبيت وإعداد المنصة بنجاح! 🎉
==============================================

- خادم API: http://localhost:${serverPort}/api
- واجهة المستخدم: http://localhost:${serverPort}
- مستخدم المسؤول: admin / 700700

لتشغيل الخادم:
- بيئة التطوير: npm run dev
- بيئة الإنتاج: npm run start

للمزيد من المعلومات، يرجى قراءة الملفات التالية:
- README.md
- دليل-تثبيت-الخادم-الموحد.md
    `, 'success');
    
  } catch (error) {
    printMessage(`❌ حدث خطأ أثناء عملية التثبيت: ${error.message}`, 'error');
    console.error(error);
  }
}

// تنفيذ الوظيفة الرئيسية
main();
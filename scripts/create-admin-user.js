/**
 * سكريبت إنشاء مستخدم admin مباشرة في قاعدة البيانات
 * استخدم هذا السكريبت إذا كنت تواجه مشاكل في تسجيل الدخول
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');

// تحميل ملف .env
dotenv.config();

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m'
};

// دالة طباعة ملونة
function print(message, color = 'reset') {
  console.log(`${colors[color] || colors.reset}${message}${colors.reset}`);
}

/**
 * تشفير كلمة المرور باستخدام bcrypt
 * @param {string} password كلمة المرور
 * @returns {Promise<string>} كلمة المرور المشفرة
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

/**
 * إنشاء مستخدم admin في MySQL
 * @returns {Promise<boolean>} نجاح العملية
 */
async function createMySQLAdminUser() {
  print('محاولة إنشاء مستخدم admin في MySQL...', 'blue');
  
  // التحقق من معلومات الاتصال
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '3306';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'certificates_db';
  
  print(`معلومات الاتصال: ${dbHost}:${dbPort} / ${dbName}`, 'yellow');
  
  try {
    // إنشاء اتصال MySQL
    const connection = await mysql.createConnection({
      host: dbHost,
      port: parseInt(dbPort),
      user: dbUser,
      password: dbPassword,
      database: dbName
    });
    
    print('✅ تم الاتصال بقاعدة البيانات MySQL بنجاح', 'green');
    
    // التحقق من وجود جدول المستخدمين
    try {
      const [tables] = await connection.query('SHOW TABLES LIKE "users"');
      
      if (tables.length === 0) {
        print('⚠️ جدول المستخدمين غير موجود، جاري إنشاؤه...', 'yellow');
        
        // إنشاء جدول المستخدمين
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            fullName VARCHAR(100),
            email VARCHAR(100),
            role VARCHAR(20) DEFAULT 'user',
            active BOOLEAN DEFAULT TRUE,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        print('✅ تم إنشاء جدول المستخدمين بنجاح', 'green');
      }
      
      // كلمة المرور القياسية
      const password = '700700';
      const hashedPassword = await hashPassword(password);
      
      // التحقق من وجود المستخدم admin
      const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
      
      if (users.length === 0) {
        // إنشاء مستخدم admin
        await connection.execute(
          'INSERT INTO users (username, password, fullName, email, role, active) VALUES (?, ?, ?, ?, ?, ?)',
          ['admin', hashedPassword, 'مدير النظام', 'admin@example.com', 'admin', true]
        );
        
        print('✅ تم إنشاء مستخدم admin بنجاح', 'green');
        print('  اسم المستخدم: admin', 'green');
        print('  كلمة المرور: 700700', 'green');
      } else {
        // تحديث كلمة مرور المستخدم admin
        await connection.execute(
          'UPDATE users SET password = ?, active = TRUE WHERE username = ?',
          [hashedPassword, 'admin']
        );
        
        print('✅ تم تحديث كلمة مرور المستخدم admin بنجاح', 'green');
        print('  اسم المستخدم: admin', 'green');
        print('  كلمة المرور: 700700', 'green');
      }
      
      // إغلاق الاتصال
      await connection.end();
      
      return true;
    } catch (error) {
      print(`❌ خطأ في التعامل مع جدول المستخدمين: ${error.message}`, 'red');
      await connection.end();
      return false;
    }
  } catch (error) {
    print(`❌ خطأ في الاتصال بقاعدة البيانات MySQL: ${error.message}`, 'red');
    return false;
  }
}

/**
 * إنشاء مستخدم admin في PostgreSQL
 * @returns {Promise<boolean>} نجاح العملية
 */
async function createPostgresAdminUser() {
  print('محاولة إنشاء مستخدم admin في PostgreSQL...', 'blue');
  
  // التحقق من معلومات الاتصال
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'certificates_db';
  const dbUrl = process.env.DATABASE_URL;
  
  let pool;
  
  try {
    // إنشاء اتصال PostgreSQL
    if (dbUrl) {
      print(`استخدام رابط الاتصال: DATABASE_URL`, 'yellow');
      pool = new Pool({ connectionString: dbUrl });
    } else {
      print(`معلومات الاتصال: ${dbHost}:${dbPort} / ${dbName}`, 'yellow');
      pool = new Pool({
        host: dbHost,
        port: parseInt(dbPort),
        user: dbUser,
        password: dbPassword,
        database: dbName
      });
    }
    
    // التحقق من الاتصال
    await pool.query('SELECT NOW()');
    print('✅ تم الاتصال بقاعدة البيانات PostgreSQL بنجاح', 'green');
    
    // التحقق من وجود جدول المستخدمين
    try {
      const { rows } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'users'
        )
      `);
      
      if (!rows[0].exists) {
        print('⚠️ جدول المستخدمين غير موجود، جاري إنشاؤه...', 'yellow');
        
        // إنشاء جدول المستخدمين
        await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            "fullName" VARCHAR(100),
            email VARCHAR(100),
            role VARCHAR(20) DEFAULT 'user',
            active BOOLEAN DEFAULT TRUE,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        print('✅ تم إنشاء جدول المستخدمين بنجاح', 'green');
      }
      
      // كلمة المرور القياسية
      const password = '700700';
      const hashedPassword = await hashPassword(password);
      
      // التحقق من وجود المستخدم admin
      const { rows: users } = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
      
      if (users.length === 0) {
        // إنشاء مستخدم admin
        await pool.query(
          'INSERT INTO users (username, password, "fullName", email, role, active) VALUES ($1, $2, $3, $4, $5, $6)',
          ['admin', hashedPassword, 'مدير النظام', 'admin@example.com', 'admin', true]
        );
        
        print('✅ تم إنشاء مستخدم admin بنجاح', 'green');
        print('  اسم المستخدم: admin', 'green');
        print('  كلمة المرور: 700700', 'green');
      } else {
        // تحديث كلمة مرور المستخدم admin
        await pool.query(
          'UPDATE users SET password = $1, active = TRUE WHERE username = $2',
          [hashedPassword, 'admin']
        );
        
        print('✅ تم تحديث كلمة مرور المستخدم admin بنجاح', 'green');
        print('  اسم المستخدم: admin', 'green');
        print('  كلمة المرور: 700700', 'green');
      }
      
      // إغلاق الاتصال
      await pool.end();
      
      return true;
    } catch (error) {
      print(`❌ خطأ في التعامل مع جدول المستخدمين: ${error.message}`, 'red');
      await pool.end();
      return false;
    }
  } catch (error) {
    print(`❌ خطأ في الاتصال بقاعدة البيانات PostgreSQL: ${error.message}`, 'red');
    if (pool) await pool.end();
    return false;
  }
}

/**
 * محاولة إنشاء مستخدم admin في قواعد البيانات المختلفة
 */
async function createAdminUser() {
  print('== سكريبت إنشاء مستخدم admin ==', 'blue');
  
  // تحديد نوع قاعدة البيانات
  const dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();
  print(`نوع قاعدة البيانات: ${dbType}`, 'blue');
  
  let success = false;
  
  if (dbType === 'mysql') {
    success = await createMySQLAdminUser();
  } else if (dbType === 'postgres' || dbType === 'postgresql') {
    success = await createPostgresAdminUser();
  } else {
    print(`❌ نوع قاعدة البيانات غير مدعوم: ${dbType}`, 'red');
    return;
  }
  
  if (success) {
    print('\n✅ تمت عملية إنشاء مستخدم admin بنجاح!', 'green');
    print('معلومات تسجيل الدخول:', 'green');
    print('  اسم المستخدم: admin', 'green');
    print('  كلمة المرور: 700700', 'green');
    print('\nيمكنك الآن تسجيل الدخول إلى النظام باستخدام هذه المعلومات.', 'green');
  } else {
    print('\n❌ فشلت عملية إنشاء مستخدم admin', 'red');
    print('يرجى التحقق من ملفات السجل لمزيد من المعلومات.', 'red');
  }
}

// تنفيذ السكريبت
createAdminUser().catch(error => {
  print(`❌ خطأ غير متوقع: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
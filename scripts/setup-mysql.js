/**
 * سكريبت إنشاء وإعداد قاعدة بيانات MySQL
 * هذا السكريبت ينشئ هيكل قاعدة بيانات MySQL بناءً على مخطط التطبيق
 * 
 * استخدم هذا السكريبت بعد تكوين إعدادات الاتصال بقاعدة بيانات MySQL
 * 
 * كيفية الاستخدام:
 * NODE_ENV=production node scripts/setup-mysql.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// تكوين السجل
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// الحصول على بيانات الاتصال
async function getDatabaseCredentials() {
  // محاولة تحميل ملف إعدادات هوستنجر
  try {
    const hostingerConfigPath = path.join(process.cwd(), 'hostinger.config.js');
    if (fs.existsSync(hostingerConfigPath)) {
      log('تم العثور على ملف إعدادات هوستنجر');
      const hostingerConfig = require(hostingerConfigPath);
      
      if (hostingerConfig && hostingerConfig.database) {
        return {
          host: hostingerConfig.database.host || 'localhost',
          user: hostingerConfig.database.user,
          password: hostingerConfig.database.password,
          database: hostingerConfig.database.name,
          port: hostingerConfig.database.port || '3306'
        };
      }
    }
  } catch (error) {
    log(`خطأ في تحميل ملف إعدادات هوستنجر: ${error.message}`, 'error');
  }
  
  // إذا لم يتم تحميل ملف هوستنجر، نحاول استخدام المتغيرات البيئية
  try {
    // محاولة تحميل ملف .env
    require('dotenv').config();
    
    if (process.env.DATABASE_URL) {
      log('تم العثور على DATABASE_URL في المتغيرات البيئية');
      
      try {
        // تحليل رابط الاتصال
        // نموذج: mysql://user:password@host:port/database
        const url = new URL(process.env.DATABASE_URL);
        
        return {
          host: url.hostname,
          user: url.username,
          password: url.password,
          database: url.pathname.substring(1), // إزالة الشرطة المائلة الأولى
          port: url.port || '3306'
        };
      } catch (error) {
        log(`خطأ في تحليل DATABASE_URL: ${error.message}`, 'error');
      }
    }
    
    // استخدام المتغيرات البيئية المنفصلة
    if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
      log('استخدام متغيرات بيئية منفصلة للاتصال بقاعدة البيانات');
      
      return {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || '3306'
      };
    }
  } catch (error) {
    log(`خطأ في تحميل المتغيرات البيئية: ${error.message}`, 'error');
  }
  
  // إذا وصلنا إلى هنا، نطلب من المستخدم إدخال المعلومات
  log('لم يتم العثور على معلومات اتصال قاعدة البيانات. الرجاء إنشاء ملف hostinger.config.js أو ملف .env', 'warning');
  
  throw new Error('معلومات اتصال قاعدة البيانات غير متوفرة');
}

// إنشاء قاعدة البيانات إذا لم تكن موجودة
async function createDatabase() {
  const credentials = await getDatabaseCredentials();
  
  log(`محاولة الاتصال بخادم MySQL على ${credentials.host}:${credentials.port}...`);
  
  try {
    // إنشاء اتصال بخادم MySQL (بدون تحديد قاعدة بيانات)
    const connection = await mysql.createConnection({
      host: credentials.host,
      user: credentials.user,
      password: credentials.password,
      port: credentials.port
    });
    
    log('تم الاتصال بخادم MySQL بنجاح');
    
    // التحقق من وجود قاعدة البيانات
    const [rows] = await connection.execute(`SHOW DATABASES LIKE '${credentials.database}'`);
    
    if (rows.length === 0) {
      // إنشاء قاعدة البيانات إذا لم تكن موجودة
      log(`إنشاء قاعدة البيانات ${credentials.database}...`);
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${credentials.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      log(`تم إنشاء قاعدة البيانات بنجاح: ${credentials.database}`, 'success');
    } else {
      log(`قاعدة البيانات موجودة بالفعل: ${credentials.database}`);
    }
    
    // إغلاق الاتصال
    await connection.end();
    
    return credentials;
  } catch (error) {
    log(`خطأ في إنشاء قاعدة البيانات: ${error.message}`, 'error');
    throw error;
  }
}

// إنشاء الجداول في قاعدة البيانات
async function createTables() {
  const credentials = await createDatabase();
  
  log(`اتصال بقاعدة البيانات ${credentials.database}...`);
  
  try {
    // إنشاء اتصال بقاعدة البيانات
    const connection = await mysql.createConnection({
      host: credentials.host,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
      port: credentials.port
    });
    
    log('تم الاتصال بقاعدة البيانات بنجاح');
    
    // إنشاء جدول المستخدمين
    log('إنشاء جدول المستخدمين...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NULL,
        email VARCHAR(255) NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // إنشاء جدول الفئات
    log('إنشاء جدول الفئات...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT NULL,
        display_order INT DEFAULT 0,
        icon VARCHAR(255) NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // إنشاء جدول القوالب
    log('إنشاء جدول القوالب...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT NULL,
        background_image VARCHAR(255) NULL,
        thumbnail VARCHAR(255) NULL,
        fields JSON NULL,
        active BOOLEAN DEFAULT TRUE,
        category_id INT NULL,
        type VARCHAR(50) DEFAULT 'certificate',
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // إنشاء جدول الشهادات
    log('إنشاء جدول الشهادات...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS certificates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255) NOT NULL,
        template_id INT NOT NULL,
        user_id INT NULL,
        data JSON NULL,
        verification_code VARCHAR(50) NOT NULL UNIQUE,
        image_path VARCHAR(255) NULL,
        issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiry_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // إنشاء جدول تفضيلات المستخدمين
    log('إنشاء جدول تفضيلات المستخدمين...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        theme VARCHAR(50) DEFAULT 'light',
        layout VARCHAR(50) DEFAULT 'boxed',
        language VARCHAR(50) DEFAULT 'ar',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // إنشاء جدول الإحصائيات
    log('إنشاء جدول الإحصائيات...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS statistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        certificate_id INT NOT NULL,
        views INT DEFAULT 0,
        shares INT DEFAULT 0,
        last_viewed TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE
      )
    `);
    
    // إنشاء جدول تتبع الأخطاء
    log('إنشاء جدول تتبع الأخطاء...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        context JSON NULL,
        stack_trace TEXT NULL,
        user_id INT NULL,
        ip_address VARCHAR(50) NULL,
        user_agent TEXT NULL,
        path VARCHAR(255) NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // إنشاء جدول إعدادات العرض
    log('إنشاء جدول إعدادات العرض...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS display_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        display_mode VARCHAR(50) DEFAULT 'multi',
        template_display VARCHAR(50) DEFAULT 'grid',
        rows_per_page INT DEFAULT 12,
        show_filters BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // إنشاء جدول إعدادات SEO
    log('إنشاء جدول إعدادات SEO...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS seo_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NULL,
        description TEXT NULL,
        keywords TEXT NULL,
        og_image VARCHAR(255) NULL,
        twitter_card VARCHAR(255) NULL,
        robots_txt TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // إغلاق الاتصال
    await connection.end();
    
    log('تم إنشاء الجداول بنجاح', 'success');
    
    return credentials;
  } catch (error) {
    log(`خطأ في إنشاء الجداول: ${error.message}`, 'error');
    throw error;
  }
}

// إنشاء مستخدم admin افتراضي
async function createDefaultAdmin() {
  const credentials = await createTables();
  
  log('محاولة إنشاء مستخدم admin افتراضي...');
  
  try {
    // إنشاء اتصال بقاعدة البيانات
    const connection = await mysql.createConnection({
      host: credentials.host,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
      port: credentials.port
    });
    
    // التحقق من وجود مستخدم admin
    const [adminUsers] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if (adminUsers.length === 0) {
      // إنشاء كلمة مرور مشفرة
      const defaultPassword = '700700';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      // إدراج مستخدم admin
      log('إنشاء مستخدم admin...');
      await connection.execute(
        'INSERT INTO users (username, password, full_name, is_admin) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'مدير النظام', true]
      );
      
      log('تم إنشاء مستخدم admin بنجاح', 'success');
      log(`اسم المستخدم: admin`, 'success');
      log(`كلمة المرور: ${defaultPassword}`, 'success');
    } else {
      // تحديث كلمة مرور المستخدم الموجود
      log('مستخدم admin موجود بالفعل، تحديث كلمة المرور...');
      
      const defaultPassword = '700700';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      await connection.execute(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, 'admin']
      );
      
      log('تم تحديث كلمة مرور مستخدم admin بنجاح', 'success');
      log(`اسم المستخدم: admin`, 'success');
      log(`كلمة المرور: ${defaultPassword}`, 'success');
    }
    
    // إنشاء تفضيلات المستخدم
    const [adminUser] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
    if (adminUser.length > 0) {
      const userId = adminUser[0].id;
      
      // التحقق من وجود تفضيلات للمستخدم
      const [preferences] = await connection.execute('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
      
      if (preferences.length === 0) {
        // إنشاء تفضيلات افتراضية
        await connection.execute(
          'INSERT INTO user_preferences (user_id, theme, layout, language) VALUES (?, ?, ?, ?)',
          [userId, 'light', 'boxed', 'ar']
        );
        
        log('تم إنشاء تفضيلات افتراضية للمستخدم admin', 'success');
      }
    }
    
    // التحقق من وجود إعدادات العرض وإنشائها إذا لزم الأمر
    const [displaySettings] = await connection.execute('SELECT * FROM display_settings');
    
    if (displaySettings.length === 0) {
      await connection.execute(
        'INSERT INTO display_settings (display_mode, template_display, rows_per_page, show_filters) VALUES (?, ?, ?, ?)',
        ['multi', 'grid', 12, true]
      );
      
      log('تم إنشاء إعدادات العرض الافتراضية', 'success');
    }
    
    // التحقق من وجود إعدادات SEO وإنشائها إذا لزم الأمر
    const [seoSettings] = await connection.execute('SELECT * FROM seo_settings');
    
    if (seoSettings.length === 0) {
      await connection.execute(
        'INSERT INTO seo_settings (title, description) VALUES (?, ?)',
        ['منصة الشهادات والبطاقات الإلكترونية', 'منصة متكاملة لإنشاء وإدارة الشهادات والبطاقات الإلكترونية بتصاميم احترافية']
      );
      
      log('تم إنشاء إعدادات SEO الافتراضية', 'success');
    }
    
    // إنشاء فئة افتراضية إذا لم تكن موجودة
    const [categories] = await connection.execute('SELECT * FROM categories');
    
    if (categories.length === 0) {
      await connection.execute(
        'INSERT INTO categories (name, slug, description, display_order, icon, active) VALUES (?, ?, ?, ?, ?, ?)',
        ['شهادات تقدير', 'appreciation', 'شهادات تقدير متنوعة', 1, '🏆', true]
      );
      
      log('تم إنشاء فئة افتراضية', 'success');
    }
    
    // إنشاء قالب افتراضي إذا لم يكن موجودًا
    const [templates] = await connection.execute('SELECT * FROM templates');
    
    if (templates.length === 0) {
      // الحصول على معرف الفئة
      const [categoryResult] = await connection.execute('SELECT id FROM categories LIMIT 1');
      const categoryId = categoryResult[0].id;
      
      // إنشاء قالب افتراضي
      const fieldsJson = JSON.stringify([
        { name: 'recipient_name', label: 'اسم المستلم', type: 'text', required: true, x: 50, y: 50, fontSize: 24, fontColor: '#000000' },
        { name: 'certificate_title', label: 'عنوان الشهادة', type: 'text', required: true, x: 50, y: 30, fontSize: 28, fontColor: '#000000' },
        { name: 'date', label: 'التاريخ', type: 'date', required: true, x: 50, y: 70, fontSize: 16, fontColor: '#000000' }
      ]);
      
      await connection.execute(
        'INSERT INTO templates (title, slug, description, category_id, fields, active, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['شهادة تقدير نموذجية', 'sample-certificate', 'قالب شهادة تقدير نموذجي', categoryId, fieldsJson, true, 'certificate']
      );
      
      log('تم إنشاء قالب افتراضي', 'success');
    }
    
    // إغلاق الاتصال
    await connection.end();
    
    log('تم إعداد قاعدة البيانات بنجاح', 'success');
  } catch (error) {
    log(`خطأ في إنشاء مستخدم admin: ${error.message}`, 'error');
    throw error;
  }
}

// الدالة الرئيسية
async function main() {
  try {
    log('بدء إعداد قاعدة بيانات MySQL...');
    await createDefaultAdmin();
    log('تم الانتهاء من إعداد قاعدة بيانات MySQL بنجاح', 'success');
  } catch (error) {
    log(`فشل في إعداد قاعدة بيانات MySQL: ${error.message}`, 'error');
    process.exit(1);
  }
}

// تنفيذ السكريبت
main();
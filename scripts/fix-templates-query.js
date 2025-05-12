/**
 * سكريبت إصلاح مشكلة استرجاع القوالب والفئات
 * يقوم بالتحقق من وجود الجداول وإنشاء بيانات تجريبية
 */

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
 * إصلاح مشكلة القوالب والفئات في MySQL
 * @returns {Promise<boolean>} نجاح العملية
 */
async function fixMySQLTemplates() {
  print('إصلاح مشكلة القوالب والفئات في MySQL...', 'blue');
  
  // التحقق من معلومات الاتصال
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '3306';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'certificates_db';
  
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
    
    // التحقق من وجود جدول الفئات وإنشائه إذا لم يكن موجودًا
    try {
      const [categoriesTables] = await connection.query('SHOW TABLES LIKE "categories"');
      
      if (categoriesTables.length === 0) {
        print('⚠️ جدول الفئات غير موجود، جاري إنشاؤه...', 'yellow');
        
        // إنشاء جدول الفئات
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            displayOrder INT DEFAULT 0,
            icon VARCHAR(50) DEFAULT '📄',
            active BOOLEAN DEFAULT TRUE,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        print('✅ تم إنشاء جدول الفئات بنجاح', 'green');
      }
      
      // التحقق من وجود جدول القوالب وإنشائه إذا لم يكن موجودًا
      const [templatesTables] = await connection.query('SHOW TABLES LIKE "templates"');
      
      if (templatesTables.length === 0) {
        print('⚠️ جدول القوالب غير موجود، جاري إنشاؤه...', 'yellow');
        
        // إنشاء جدول القوالب
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS templates (
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
          )
        `);
        
        print('✅ تم إنشاء جدول القوالب بنجاح', 'green');
      }
      
      // التحقق من وجود بيانات في جدول الفئات
      const [categoriesCount] = await connection.execute('SELECT COUNT(*) as count FROM categories');
      
      if (categoriesCount[0].count === 0) {
        print('⚠️ لا توجد فئات، جاري إضافة فئات تجريبية...', 'yellow');
        
        // إضافة فئات تجريبية
        await connection.execute(`
          INSERT INTO categories (name, slug, description, displayOrder, icon, active)
          VALUES 
            ('شهادات تقدير', 'appreciation', 'شهادات تقدير متنوعة', 1, '🏆', TRUE),
            ('شهادات تخرج', 'graduation', 'شهادات تخرج لمختلف المراحل التعليمية', 2, '🎓', TRUE),
            ('شهادات مشاركة', 'participation', 'شهادات مشاركة في الفعاليات والدورات', 3, '🤝', TRUE),
            ('بطاقات تهنئة', 'congratulations', 'بطاقات تهنئة لمختلف المناسبات', 4, '🎉', TRUE)
        `);
        
        print('✅ تم إضافة فئات تجريبية بنجاح', 'green');
      }
      
      // التحقق من وجود بيانات في جدول القوالب
      const [templatesCount] = await connection.execute('SELECT COUNT(*) as count FROM templates');
      
      if (templatesCount[0].count === 0) {
        print('⚠️ لا توجد قوالب، جاري إضافة قوالب تجريبية...', 'yellow');
        
        // إضافة قوالب تجريبية
        await connection.execute(`
          INSERT INTO templates (title, subtitle, description, categoryId, imageUrl, previewUrl, slug, active, featured, type, direction, format)
          VALUES 
            ('شهادة تقدير نموذج 1', 'شهادة تقدير للمتفوقين', 'شهادة تقدير للطلاب المتفوقين في المدارس والجامعات', 1, '/static/certificate-template-1.jpg', '/static/certificate-preview-1.jpg', 'appreciation-1', TRUE, TRUE, 'certificate', 'rtl', 'landscape'),
            ('شهادة تخرج نموذج 1', 'شهادة تخرج للجامعات', 'شهادة تخرج رسمية للجامعات والمعاهد', 2, '/static/certificate-template-2.jpg', '/static/certificate-preview-2.jpg', 'graduation-1', TRUE, FALSE, 'certificate', 'rtl', 'landscape'),
            ('بطاقة تهنئة نموذج 1', 'بطاقة تهنئة بالنجاح', 'بطاقة تهنئة بمناسبة النجاح والتفوق', 4, '/static/card-template-1.jpg', '/static/card-preview-1.jpg', 'congratulations-1', TRUE, TRUE, 'card', 'rtl', 'portrait')
        `);
        
        print('✅ تم إضافة قوالب تجريبية بنجاح', 'green');
      }
      
      // التحقق من وجود مشكلة في الاستعلام في storage.ts
      print(`
يجب إصلاح الدالة getAllTemplates في ملف storage.ts. حول الأسطر 770-780:

تغيير:
const [{ count }] = await db
  .select({ count: sql<number>\`count(*)\` })
  .from(templates)
  .where(conditions.length ? and(...conditions) : sql\`1=1\`);

return { templates: templatesData, total: Number(count) };

إلى:
const countResult = await db
  .select({ count: sql<number>\`count(*)\` })
  .from(templates)
  .where(conditions.length ? and(...conditions) : sql\`1=1\`);

const total = countResult.length > 0 ? Number(countResult[0].count) : 0;
return { templates: templatesData, total };
`, 'yellow');
      
      // إغلاق الاتصال
      await connection.end();
      
      return true;
    } catch (error) {
      print(`❌ خطأ في التعامل مع جداول: ${error.message}`, 'red');
      await connection.end();
      return false;
    }
  } catch (error) {
    print(`❌ خطأ في الاتصال بقاعدة البيانات MySQL: ${error.message}`, 'red');
    return false;
  }
}

/**
 * إصلاح مشكلة القوالب والفئات في PostgreSQL
 * @returns {Promise<boolean>} نجاح العملية
 */
async function fixPostgresTemplates() {
  print('إصلاح مشكلة القوالب والفئات في PostgreSQL...', 'blue');
  
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
    
    // التحقق من وجود الجداول
    try {
      // التحقق من وجود جدول الفئات
      const { rows: categoriesExists } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'categories'
        )
      `);
      
      if (!categoriesExists[0].exists) {
        print('⚠️ جدول الفئات غير موجود، جاري إنشاؤه...', 'yellow');
        
        // إنشاء جدول الفئات
        await pool.query(`
          CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            "displayOrder" INTEGER DEFAULT 0,
            icon VARCHAR(50) DEFAULT '📄',
            active BOOLEAN DEFAULT TRUE,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        print('✅ تم إنشاء جدول الفئات بنجاح', 'green');
      }
      
      // التحقق من وجود جدول القوالب
      const { rows: templatesExists } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'templates'
        )
      `);
      
      if (!templatesExists[0].exists) {
        print('⚠️ جدول القوالب غير موجود، جاري إنشاؤه...', 'yellow');
        
        // إنشاء جدول القوالب
        await pool.query(`
          CREATE TABLE IF NOT EXISTS templates (
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
          )
        `);
        
        print('✅ تم إنشاء جدول القوالب بنجاح', 'green');
      }
      
      // التحقق من وجود بيانات في جدول الفئات
      const { rows: categoriesCount } = await pool.query('SELECT COUNT(*) as count FROM categories');
      
      if (parseInt(categoriesCount[0].count) === 0) {
        print('⚠️ لا توجد فئات، جاري إضافة فئات تجريبية...', 'yellow');
        
        // إضافة فئات تجريبية
        await pool.query(`
          INSERT INTO categories (name, slug, description, "displayOrder", icon, active)
          VALUES 
            ('شهادات تقدير', 'appreciation', 'شهادات تقدير متنوعة', 1, '🏆', TRUE),
            ('شهادات تخرج', 'graduation', 'شهادات تخرج لمختلف المراحل التعليمية', 2, '🎓', TRUE),
            ('شهادات مشاركة', 'participation', 'شهادات مشاركة في الفعاليات والدورات', 3, '🤝', TRUE),
            ('بطاقات تهنئة', 'congratulations', 'بطاقات تهنئة لمختلف المناسبات', 4, '🎉', TRUE)
        `);
        
        print('✅ تم إضافة فئات تجريبية بنجاح', 'green');
      }
      
      // التحقق من وجود بيانات في جدول القوالب
      const { rows: templatesCount } = await pool.query('SELECT COUNT(*) as count FROM templates');
      
      if (parseInt(templatesCount[0].count) === 0) {
        print('⚠️ لا توجد قوالب، جاري إضافة قوالب تجريبية...', 'yellow');
        
        // إضافة قوالب تجريبية
        await pool.query(`
          INSERT INTO templates (title, subtitle, description, "categoryId", "imageUrl", "previewUrl", slug, active, featured, type, direction, format)
          VALUES 
            ('شهادة تقدير نموذج 1', 'شهادة تقدير للمتفوقين', 'شهادة تقدير للطلاب المتفوقين في المدارس والجامعات', 1, '/static/certificate-template-1.jpg', '/static/certificate-preview-1.jpg', 'appreciation-1', TRUE, TRUE, 'certificate', 'rtl', 'landscape'),
            ('شهادة تخرج نموذج 1', 'شهادة تخرج للجامعات', 'شهادة تخرج رسمية للجامعات والمعاهد', 2, '/static/certificate-template-2.jpg', '/static/certificate-preview-2.jpg', 'graduation-1', TRUE, FALSE, 'certificate', 'rtl', 'landscape'),
            ('بطاقة تهنئة نموذج 1', 'بطاقة تهنئة بالنجاح', 'بطاقة تهنئة بمناسبة النجاح والتفوق', 4, '/static/card-template-1.jpg', '/static/card-preview-1.jpg', 'congratulations-1', TRUE, TRUE, 'card', 'rtl', 'portrait')
        `);
        
        print('✅ تم إضافة قوالب تجريبية بنجاح', 'green');
      }
      
      // التحقق من وجود مشكلة في الاستعلام في storage.ts
      print(`
يجب إصلاح الدالة getAllTemplates في ملف storage.ts. حول الأسطر 770-780:

تغيير:
const [{ count }] = await db
  .select({ count: sql<number>\`count(*)\` })
  .from(templates)
  .where(conditions.length ? and(...conditions) : sql\`1=1\`);

return { templates: templatesData, total: Number(count) };

إلى:
const countResult = await db
  .select({ count: sql<number>\`count(*)\` })
  .from(templates)
  .where(conditions.length ? and(...conditions) : sql\`1=1\`);

const total = countResult.length > 0 ? Number(countResult[0].count) : 0;
return { templates: templatesData, total };
`, 'yellow');
      
      // إغلاق الاتصال
      await pool.end();
      
      return true;
    } catch (error) {
      print(`❌ خطأ في التعامل مع جداول: ${error.message}`, 'red');
      if (pool) await pool.end();
      return false;
    }
  } catch (error) {
    print(`❌ خطأ في الاتصال بقاعدة البيانات PostgreSQL: ${error.message}`, 'red');
    if (pool) await pool.end();
    return false;
  }
}

/**
 * إصلاح مشكلة القوالب في قواعد البيانات المختلفة
 */
async function fixTemplatesAndCategories() {
  print('== سكريبت إصلاح مشكلة القوالب والفئات ==', 'blue');
  
  // تحديد نوع قاعدة البيانات
  const dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();
  print(`نوع قاعدة البيانات: ${dbType}`, 'blue');
  
  let success = false;
  
  if (dbType === 'mysql') {
    success = await fixMySQLTemplates();
  } else if (dbType === 'postgres' || dbType === 'postgresql') {
    success = await fixPostgresTemplates();
  } else {
    print(`❌ نوع قاعدة البيانات غير مدعوم: ${dbType}`, 'red');
    return;
  }
  
  if (success) {
    print('\n✅ تمت عملية إصلاح مشكلة القوالب والفئات بنجاح!', 'green');
    print(`
للإصلاح النهائي، يجب تعديل ملف storage.ts لتصحيح استعلام count
قم بتحرير الملف يدويًا أو استخدام patch-storage-count.js
    `, 'yellow');
  } else {
    print('\n❌ فشلت عملية إصلاح مشكلة القوالب والفئات', 'red');
    print('يرجى التحقق من السجلات لمزيد من المعلومات.', 'red');
  }
}

// تنفيذ السكريبت
fixTemplatesAndCategories().catch(error => {
  print(`❌ خطأ غير متوقع: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
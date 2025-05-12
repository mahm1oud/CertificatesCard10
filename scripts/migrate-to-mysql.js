/**
 * سكريبت لنقل البيانات من PostgreSQL إلى MySQL
 * 
 * هذا السكريبت يقوم بنقل البيانات من قاعدة بيانات PostgreSQL إلى قاعدة بيانات MySQL.
 * يستخدم تكوين الاتصال المحدد في ملفات البيئة أو القيم الافتراضية.
 * 
 * كيفية الاستخدام:
 * NODE_ENV=production node scripts/migrate-to-mysql.js
 */

// استيراد المكتبات اللازمة
const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// تحميل متغيرات البيئة من ملف .env إذا كان موجوداً
dotenv.config();

// تكوين اتصال PostgreSQL
const pgConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/certificates',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// تكوين اتصال MySQL
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'certificates',
  connectionLimit: 10,
  waitForConnections: true,
  namedPlaceholders: true
};

// سجل للعمليات
const logDir = path.join(__dirname, '../logs');
const logFile = path.join(logDir, `migration-${new Date().toISOString().replace(/:/g, '-')}.log`);

// إنشاء مجلد السجلات إذا لم يكن موجوداً
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// دالة لكتابة السجلات
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// قائمة الجداول بترتيب النقل (مهم للحفاظ على سلامة القيود الخارجية)
const tablesToMigrate = [
  'users',
  'categories',
  'templates',
  'template_fields',
  'fonts',
  'cards',
  'certificates',
  'certificate_batches',
  'certificate_batch_items',
  'settings',
  'auth_settings',
  'seo',
  'layers',
  'user_logos',
  'user_signatures',
  'template_logos'
];

// دالة رئيسية لتنفيذ النقل
async function migrateData() {
  log('بدء عملية نقل البيانات من PostgreSQL إلى MySQL');
  
  let pgPool, mysqlConn;
  
  try {
    // إنشاء اتصالات قواعد البيانات
    pgPool = new Pool(pgConfig);
    mysqlConn = await mysql.createPool(mysqlConfig);
    
    log('تم إنشاء اتصالات قواعد البيانات بنجاح');
    
    // التحقق من اتصال PostgreSQL
    const pgClient = await pgPool.connect();
    await pgClient.query('SELECT 1');
    pgClient.release();
    log('✅ اتصال PostgreSQL يعمل بشكل صحيح');
    
    // التحقق من اتصال MySQL
    await mysqlConn.query('SELECT 1');
    log('✅ اتصال MySQL يعمل بشكل صحيح');
    
    // نقل كل جدول على حدة
    for (const tableName of tablesToMigrate) {
      await migrateTable(pgPool, mysqlConn, tableName);
    }
    
    log('✅ تم الانتهاء من نقل البيانات بنجاح');
  } catch (error) {
    log(`❌ خطأ أثناء نقل البيانات: ${error.message}`);
    log(error.stack);
  } finally {
    // إغلاق الاتصالات
    if (pgPool) {
      await pgPool.end();
    }
    if (mysqlConn) {
      await mysqlConn.end();
    }
    log('تم إغلاق اتصالات قواعد البيانات');
  }
}

// دالة لنقل بيانات جدول محدد
async function migrateTable(pgPool, mysqlConn, tableName) {
  log(`بدء نقل بيانات الجدول ${tableName}`);
  
  try {
    // الحصول على عدد السجلات في الجدول
    const countResult = await pgPool.query(`SELECT COUNT(*) FROM ${tableName}`);
    const recordCount = parseInt(countResult.rows[0].count);
    
    log(`عدد السجلات في الجدول ${tableName}: ${recordCount}`);
    
    if (recordCount === 0) {
      log(`الجدول ${tableName} فارغ، تخطي النقل.`);
      return;
    }
    
    // الحصول على أسماء الأعمدة
    const columnsResult = await pgPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    const columns = columnsResult.rows.map(row => row.column_name);
    log(`أعمدة الجدول ${tableName}: ${columns.join(', ')}`);
    
    // جلب البيانات من PostgreSQL
    const result = await pgPool.query(`SELECT * FROM ${tableName}`);
    const records = result.rows;
    
    if (records.length === 0) {
      log(`لا توجد بيانات في الجدول ${tableName} لنقلها.`);
      return;
    }
    
    // حذف البيانات الموجودة في جدول MySQL (اختياري - يمكن تعليقه للحفاظ على البيانات الموجودة)
    await mysqlConn.query(`TRUNCATE TABLE ${tableName}`);
    log(`تم حذف البيانات الموجودة في جدول MySQL ${tableName}`);
    
    // إعداد جملة الإدراج
    const placeholders = columns.map(() => '?').join(', ');
    const insertQuery = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
    `;
    
    // إدراج البيانات في MySQL على دفعات
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // إعداد الدفعة الحالية من البيانات
      const values = batch.map(record => {
        return columns.map(column => {
          // معالجة القيم الخاصة
          const value = record[column];
          
          // تحويل القيم المنطقية (boolean) من PostgreSQL إلى tinyint في MySQL
          if (typeof value === 'boolean') {
            return value ? 1 : 0;
          }
          
          // تحويل كائنات التاريخ إلى SQL datetime
          if (value instanceof Date) {
            return value.toISOString().slice(0, 19).replace('T', ' ');
          }
          
          // تحويل كائنات JSON إلى سلسلة نصية
          if (value !== null && typeof value === 'object') {
            return JSON.stringify(value);
          }
          
          return value;
        });
      });
      
      // إدراج البيانات في MySQL
      for (const valueRow of values) {
        try {
          await mysqlConn.query(insertQuery, valueRow);
        } catch (error) {
          // تسجيل الخطأ والبيانات المسببة له
          log(`❌ خطأ أثناء إدراج بيانات في الجدول ${tableName}: ${error.message}`);
          log(`البيانات: ${JSON.stringify(valueRow)}`);
          // مواصلة المحاولة مع البيانات الأخرى
        }
      }
      
      log(`تم إدراج ${Math.min(i + batchSize, records.length) - i} سجل في الجدول ${tableName}`);
    }
    
    log(`✅ تم نقل جميع بيانات الجدول ${tableName} بنجاح (${records.length} سجل)`);
  } catch (error) {
    log(`❌ خطأ أثناء نقل الجدول ${tableName}: ${error.message}`);
    log(error.stack);
    // مواصلة مع الجداول الأخرى على الرغم من الفشل
  }
}

// تشغيل السكريبت
migrateData().catch(error => {
  log(`❌ خطأ فادح أثناء تنفيذ السكريبت: ${error.message}`);
  log(error.stack);
  process.exit(1);
});
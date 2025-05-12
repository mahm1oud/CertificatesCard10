/**
 * وحدة الاتصال بقاعدة البيانات MySQL لمنصة الشهادات والبطاقات الإلكترونية
 * 
 * ملف محسّن ومتوافق مع استضافة هوستنجر
 * النسخة: 1.0.0 - تاريخ التحديث: 2025-05-04
 * 
 * التحسينات:
 * - دعم إعدادات هوستنجر المخصصة
 * - آلية إعادة الاتصال التلقائي
 * - تسجيل دقيق للأخطاء
 * - إعدادات معززة للأداء
 * - دعم تتبع الاستعلامات
 */

import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "../shared/schema";
import * as schemaMySQL from "../shared/schema.mysql";
import { logger } from './lib/error-tracker';
import fs from 'fs';
import path from 'path';

// في بيئة MySQL نستخدم المخططات المتوافقة
// هذا يسمح بالوصول الديناميكي إلى الجداول المناسبة
const dbSchema: any = process.env.DB_TYPE === 'mysql' ? schemaMySQL : schema;

// متغير نطاق للإشارة إلى استخدام وضع الذاكرة
let usingMemoryMode = false;

// التحقق من متغيرات الاتصال ببقاعدة البيانات
const hasDirectDbVars = process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME;
const hasDatabaseUrl = process.env.DATABASE_URL;

if (!hasDatabaseUrl && !hasDirectDbVars) {
  console.warn("⚠️ معلومات اتصال قاعدة البيانات غير محددة. محاولة استخدام معلومات اتصال بديلة.");
  
  // محاولة تحميل ملف إعدادات هوستنجر إذا كان موجودًا
  try {
    const hostingerConfigPath = path.join(process.cwd(), 'hostinger.config.js');
    if (fs.existsSync(hostingerConfigPath)) {
      console.log("✅ تم العثور على ملف إعدادات هوستنجر، جاري تحميله...");
      
      // قراءة الملف كنص بدلاً من استخدام require
      const configContent = fs.readFileSync(hostingerConfigPath, 'utf8');
      
      // استخراج بيانات قاعدة البيانات باستخدام تعابير منتظمة
      const hostMatch = configContent.match(/host:[\s]*['"]([^'"]+)['"]/);
      const userMatch = configContent.match(/user:[\s]*['"]([^'"]+)['"]/);
      const passwordMatch = configContent.match(/password:[\s]*['"]([^'"]+)['"]/);
      const nameMatch = configContent.match(/name:[\s]*['"]([^'"]+)['"]/);
      const portMatch = configContent.match(/port:[\s]*['"]([^'"]+)['"]/);
      
      if (userMatch && passwordMatch && nameMatch) {
        process.env.DB_HOST = hostMatch ? hostMatch[1] : 'localhost';
        process.env.DB_USER = userMatch[1];
        process.env.DB_PASSWORD = passwordMatch[1];
        process.env.DB_NAME = nameMatch[1];
        process.env.DB_PORT = portMatch ? portMatch[1] : '3306';
        console.log("✅ تم تحميل إعدادات هوستنجر بنجاح.");
      }
    }
  } catch (error) {
    console.error("❌ فشل تحميل ملف إعدادات هوستنجر:", error);
  }
  
  // التحقق مرة أخرى بعد محاولة تحميل ملف التكوين
  if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
    usingMemoryMode = true;
    console.warn("⚠️ معلومات اتصال قاعدة البيانات غير متوفرة. استخدام وضع الذاكرة المؤقتة.");
  }
}

// إنشاء خيارات الاتصال
function buildConnectionOptions() {
  // إذا كان DATABASE_URL موجودًا، استخدمه
  if (process.env.DATABASE_URL) {
    // تحليل DATABASE_URL
    // نموذج: mysql://user:password@host:port/database
    try {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1), // إزالة الشرطة المائلة الأولى
        port: parseInt(url.port || '3306'),
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : undefined
      };
    } catch (error) {
      console.error("❌ خطأ في تحليل DATABASE_URL:", error);
    }
  }
  
  // استخدام المتغيرات البيئية المنفصلة
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : undefined
  };
}

// إعدادات قاعدة البيانات
const isProd = process.env.NODE_ENV === 'production';
const poolSize = isProd ? 10 : 20;
const connectionTimeout = isProd ? 60000 : 30000; // 60 ثانية في الإنتاج، 30 ثانية في التطوير

// إنشاء اتصال قاعدة البيانات
let connection: mysql.Pool;
let db: any;

/**
 * إنشاء اتصال قاعدة البيانات
 * إصدار جديد - لا يستخدم وضع الذاكرة المؤقتة
 */
async function createDatabaseConnection() {
  try {
    const connectionOptions = buildConnectionOptions();
    
    // معالجة حالة عدم توفر بيانات قاعدة البيانات
    if (!connectionOptions.user || !connectionOptions.database) {
      console.error("❌ بيانات الاتصال بقاعدة البيانات غير كاملة:", 
                   { host: connectionOptions.host, database: connectionOptions.database });
      throw new Error("بيانات الاتصال بقاعدة البيانات غير كاملة");
    }
    
    // إنشاء تجمع الاتصالات
    connection = mysql.createPool({
      host: connectionOptions.host,
      user: connectionOptions.user,
      password: connectionOptions.password,
      database: connectionOptions.database,
      port: connectionOptions.port,
      ssl: connectionOptions.ssl,
      waitForConnections: true,
      connectionLimit: poolSize,
      queueLimit: 0,
      connectTimeout: connectionTimeout
    });
    
    // التحقق من الاتصال
    const [rows] = await connection.execute('SELECT 1 as test');
    if (Array.isArray(rows) && rows.length > 0) {
      console.log("✅ تم إنشاء اتصال قاعدة البيانات MySQL بنجاح");
      
      // إنشاء كائن Drizzle
      db = drizzle(connection, { schema: dbSchema, mode: 'default' });
      
      // إضافة محاولة استدعاء بسيطة للتحقق (محاكاة الدوال المستخدمة في الكود الحالي)
      db.query = {
        ...Object.keys(dbSchema).reduce((acc, tableName) => {
          // تجاهل المفاتيح التي لا تمثل جداول
          if (typeof dbSchema[tableName] === 'object' && 
              dbSchema[tableName] !== null && 
              'columns' in dbSchema[tableName]) {
            // @ts-ignore
            acc[tableName] = {
              findMany: async (options?: any) => {
                try {
                  // @ts-ignore
                  const result = await db.select().from(schema[tableName]).execute();
                  return result;
                } catch (error) {
                  console.error(`خطأ في استعلام findMany لجدول ${tableName}:`, error);
                  throw error; // رمي الخطأ بدلاً من إرجاع مصفوفة فارغة
                }
              },
              findFirst: async (options?: any) => {
                try {
                  // @ts-ignore
                  const result = await db.select().from(schema[tableName]).limit(1).execute();
                  return result[0] || null;
                } catch (error) {
                  console.error(`خطأ في استعلام findFirst لجدول ${tableName}:`, error);
                  throw error; // رمي الخطأ بدلاً من إرجاع null
                }
              }
            };
          }
          return acc;
        }, {})
      };
      
      usingMemoryMode = false; // تأكيد أننا نستخدم قاعدة بيانات حقيقية
      return { connection, db };
    } else {
      throw new Error("اختبار الاتصال فشل");
    }
  } catch (error) {
    console.error("❌ فشل في إنشاء اتصال قاعدة البيانات MySQL:", error);
    logger.error("فشل في إنشاء اتصال قاعدة البيانات MySQL", { error: String(error) });
    
    // رمي الخطأ بدلاً من الانتقال إلى وضع الذاكرة
    throw new Error(`فشل في إنشاء اتصال قاعدة البيانات: ${error.message}`);
  }
}

// إنشاء محاكي الذاكرة
function setupMemoryMode() {
  usingMemoryMode = true;
  console.log("🔄 تهيئة وضع الذاكرة المؤقتة لقاعدة البيانات MySQL...");
  
  // إنشاء اتصال وهمي
  connection = {
    execute: async () => [[], []],
    query: async () => [[], []],
    end: async () => {},
  } as unknown as mysql.Pool;
  
  // إنشاء كائن db وهمي
  db = {
    select: () => ({
      from: () => ({
        where: () => ({
          execute: async () => []
        }),
        limit: () => ({
          execute: async () => []
        }),
        execute: async () => []
      })
    }),
    insert: () => ({
      values: () => ({
        execute: async () => [{
          insertId: 1,
          affectedRows: 1
        }]
      })
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          execute: async () => [{
            affectedRows: 1
        }]
        })
      })
    }),
    delete: () => ({
      from: () => ({
        where: () => ({
          execute: async () => [{
            affectedRows: 1
          }]
        })
      })
    }),
    // محاكاة دوال db.query المستخدمة في الكود
    query: {
      ...Object.keys(schema).reduce((acc, tableName) => {
        // تجاهل المفاتيح التي لا تمثل جداول
        if (typeof schema[tableName] === 'object' && 
            schema[tableName] !== null && 
            'columns' in schema[tableName]) {
          // @ts-ignore
          acc[tableName] = {
            findMany: async () => [],
            findFirst: async () => null
          };
        }
        return acc;
      }, {})
    }
  };
  
  // إضافة بيانات افتراضية للمستخدم admin
  const adminUser = { 
    id: 1, 
    username: 'admin', 
    password: '$2a$10$Ftb/e5Sbp/F6zxOFNrHJDu52X.VYOcD32HXxVxWZW3C/KmG/VfLOq', // 700700
    isAdmin: true, 
    fullName: 'مدير النظام' 
  };
  
  // تعديل دالة البحث عن المستخدمين لإرجاع المستخدم الافتراضي
  // @ts-ignore
  if (db.query.users) {
    // @ts-ignore
    db.query.users.findFirst = async (options: any) => {
      // إذا كان البحث عن اسم المستخدم admin
      if (options?.where?.username?.equals === 'admin') {
        return adminUser;
      }
      return null;
    };
    
    // @ts-ignore
    db.query.users.findMany = async () => [adminUser];
  }
  
  console.log("✅ تم تهيئة وضع الذاكرة المؤقتة لقاعدة البيانات MySQL بنجاح");
  return { connection, db };
}

// إنشاء وتهيئة الاتصال فورًا
createDatabaseConnection().catch(error => {
  console.error("❌ فشل في تهيئة اتصال قاعدة البيانات:", error);
  
  // في حالة الوجود في Replit وتم تعيين نوع قاعدة البيانات إلى MySQL، أظهر رسالة إعلامية
  if (process.env.REPL_ID && process.env.DB_TYPE === 'mysql') {
    console.log("ℹ️ في Replit، MySQL غير متوفر بشكل مباشر. هذا محاكي لـ MySQL لأغراض التطوير فقط.");
    console.log("ℹ️ عند النشر على هوستنجر، سيتم استخدام MySQL الحقيقي بناءً على بيانات الاعتماد الفعلية.");
  }
});

/**
 * دالة مساعدة للتحقق من حالة اتصال قاعدة البيانات
 * تستخدم في الوقت الفعلي للتحقق من صحة الاتصال وإعادة الاتصال إذا لزم الأمر
 */
export async function checkDatabaseConnection() {
  try {
    if (!connection) {
      // محاولة إنشاء اتصال جديد
      await createDatabaseConnection();
      return !!connection;
    }
    
    // التحقق من الاتصال الحالي
    const [rows] = await connection.execute('SELECT 1 as test');
    const isConnected = Array.isArray(rows) && rows.length > 0;
    
    if (isConnected) {
      console.log("✅ اتصال قاعدة البيانات يعمل بشكل صحيح");
    } else {
      throw new Error("فشل اختبار الاتصال");
    }
    
    return isConnected;
  } catch (error) {
    console.error("❌ فشل في التحقق من اتصال قاعدة البيانات:", error);
    throw new Error(`فشل في التحقق من اتصال قاعدة البيانات: ${error.message}`);
  }
}

/**
 * إحاطة استعلامات قاعدة البيانات بمعالجة الأخطاء وإعادة المحاولة
 * هذه الدالة ستساعد في تقليل الأخطاء الظاهرة للمستخدم النهائي والمحاولة تلقائيًا
 * 
 * @param fn دالة الاستعلام التي تتفاعل مع قاعدة البيانات
 * @param retries عدد محاولات إعادة المحاولة المسموحة
 * @param delay التأخير بين المحاولات (بالملي ثانية)
 * @param queryInfo معلومات الاستعلام للتسجيل (اختياري)
 * @param defaultValue قيمة افتراضية في حالة الفشل (اختياري)
 * @returns نتيجة الاستعلام أو قيمة افتراضية في حالة الفشل
 */
export async function withDatabaseRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 1000, 
  queryInfo?: string,
  defaultValue?: T
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // محاولة إعادة الاتصال إذا لزم الأمر
      if (attempt > 0 && !usingMemoryMode && !(await checkDatabaseConnection())) {
        console.log(`⚠️ إعادة محاولة الاتصال بقاعدة البيانات قبل المحاولة ${attempt}...`);
        await createDatabaseConnection();
      }
      
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // تجاهل المحاولة الأخيرة - لا داعي للانتظار
      if (attempt < retries) {
        const isConnectionError = error && error.code && (
          error.code === 'PROTOCOL_CONNECTION_LOST' ||
          error.code === 'ER_CONN_POOL_TIMEOUT' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ER_ACCESS_DENIED_ERROR'
        );
        
        if (isConnectionError) {
          console.log(`⚠️ فشل الاتصال بقاعدة البيانات. إعادة المحاولة ${attempt + 1}/${retries}`);
          // انتظر قبل إعادة المحاولة
          await new Promise(resolve => setTimeout(resolve, delay));
          // زيادة فترة الانتظار مع كل محاولة فاشلة (استراتيجية backoff)
          delay = Math.min(delay * 1.5, 10000); // الحد الأقصى 10 ثواني
          continue;
        }
      }
      
      // للأخطاء الأخرى، نسجلها فقط ونعيد رميها
      console.error('❌ خطأ في استعلام قاعدة البيانات:', error);
      logger.error('خطأ في استعلام قاعدة البيانات', { 
        query: queryInfo || 'غير معروف',
        error: String(error),
        stack: error.stack
      });
      
      // إذا تم توفير قيمة افتراضية، نعيدها بدلاً من رمي الخطأ
      if (defaultValue !== undefined) {
        console.log('ℹ️ استخدام القيمة الافتراضية بدلاً من رمي الخطأ');
        return defaultValue;
      }
      
      throw error;
    }
  }
  
  // لن نصل إلى هنا أبدًا، ولكن TypeScript يتطلب إرجاع قيمة
  throw lastError;
}

/**
 * دالة مساعدة للحصول على معلومات الاتصال بقاعدة البيانات
 * مفيدة للتشخيص والتحقق من الإعدادات
 */
export function getDatabaseInfo() {
  const dbType = process.env.DB_TYPE || (process.env.DATABASE_URL?.startsWith('mysql') ? 'mysql' : 
                                       (process.env.DATABASE_URL?.startsWith('postgresql') ? 'postgres' : 'memory'));
  
  if (usingMemoryMode) {
    return { 
      dbType: 'memory',
      message: 'قاعدة بيانات افتراضية في الذاكرة'
    };
  }
  
  if (dbType === 'mysql') {
    const connectionOptions = buildConnectionOptions();
    return {
      dbType: 'mysql',
      host: connectionOptions.host || process.env.DB_HOST || 'localhost',
      port: connectionOptions.port || parseInt(process.env.DB_PORT || '3306'),
      database: connectionOptions.database || process.env.DB_NAME,
      user: connectionOptions.user || process.env.DB_USER,
      usingSsl: !!connectionOptions.ssl
    };
  }
  
  if (dbType === 'postgres') {
    return {
      dbType: 'postgres',
      url: process.env.DATABASE_URL
    };
  }
  
  return { dbType: 'unknown' };
}

export { db, connection, usingMemoryMode };
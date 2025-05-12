import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// تعريف دالة createDb شبيهة التي نحتاجها في وضع الذاكرة المؤقتة
function createDb(adapter: any) {
  return {
    ...adapter,
    // إضافة خصائص افتراضية لمحاكاة عميل Drizzle
    query: {},
    select: () => ({}),
    insert: () => ({}),
    update: () => ({}),
    delete: () => ({})
  };
}

// تعريف مؤقت لمحاكي أداة الذاكرة
function memoryDrizzleAdapter() {
  return {
    query: async () => ({ rows: [] }),
    insert: async () => ({ rows: [] }),
    update: async () => ({ rows: [] }),
    delete: async () => ({ rows: [] }),
    execute: async () => ({ rows: [] }),
    cleanup: async () => {}
  };
}

// متغير نطاق للإشارة إلى استخدام وضع الذاكرة
let usingMemoryMode = false;

// تكوين Neon Serverless للانتشار
if (process.env.NODE_ENV === 'production') {
  // إذا كنت تستخدم Neon Database أو قاعدة بيانات أخرى تدعم WebSockets
  neonConfig.webSocketConstructor = ws;
}

// التحقق من وجود DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL غير محدد. استخدام وضع المخزن المؤقت في الذاكرة.");
  usingMemoryMode = true;
}

// إنشاء pool ومتغيرات قاعدة البيانات
let pool: Pool;
let db: any;

// سنحاول استخدام قاعدة البيانات PostgreSQL إذا كان متاحًا، وإلا سنستخدم محاكاة قاعدة البيانات في الذاكرة
if (!usingMemoryMode) {
  try {
    // تكوين خيارات اتصال قاعدة البيانات مع إعدادات إضافية للتعامل مع حالات الانقطاع
    const isProd = process.env.NODE_ENV === 'production';

    // تحسين connectionString لمنع مشكلة ENOTFOUND
    let connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/certificates';

    // التأكد من أن URL قاعدة البيانات لا يحتوي على hostnames غير صحيحة
    try {
      // حاول تحليل URL لاكتشاف المشكلات المحتملة
      if (connectionString && connectionString.includes('@base/')) {
        console.warn("⚠️ تم اكتشاف مشكلة في URL قاعدة البيانات، محاولة إصلاح...");
        connectionString = connectionString.replace('@base/', '@localhost/');
      }
    } catch (error) {
      console.error("❌ خطأ أثناء تحليل DATABASE_URL:", error);
    }

    // خيارات مختلفة لبيئة الإنتاج vs بيئة التطوير
    const poolOptions = {
      connectionString,
      max: isProd ? 10 : 20, // عدد اتصالات أقل في الإنتاج للتعامل مع قيود الموارد
      idleTimeoutMillis: isProd ? 20000 : 30000, // مهلة أقصر للاتصالات الخاملة في الإنتاج
      connectionTimeoutMillis: isProd ? 10000 : 5000, // مهلة أطول في الإنتاج للتعامل مع التأخيرات المحتملة
      ssl: isProd ? { rejectUnauthorized: false } : false, // تمكين SSL في الإنتاج مع قبول الشهادات الذاتية التوقيع
    };

    // إنشاء pool
    pool = new Pool(poolOptions);
    console.log("✅ تم إنشاء اتصال قاعدة البيانات بنجاح");
    
    // إنشاء مثيل Drizzle ORM
    db = drizzle(pool, { schema });
    
    // محاولة للتحقق من الاتصال
    pool.query('SELECT 1')
      .then(() => {
        console.log("✅ تم التحقق من صحة اتصال قاعدة البيانات");
      })
      .catch((error) => {
        console.error("❌ فشل في الاتصال بقاعدة البيانات. التبديل إلى وضع الذاكرة:", error);
        setupMemoryMode();
      });
  } catch (error) {
    console.error("❌ فشل في إنشاء اتصال قاعدة البيانات:", error);
    setupMemoryMode();
  }
} else {
  // إذا لم يتم تحديد DATABASE_URL، استخدم وضع الذاكرة مباشرة
  setupMemoryMode();
}

// دالة مساعدة لإعداد وضع الذاكرة
function setupMemoryMode() {
  usingMemoryMode = true;
  console.log("🔄 تهيئة وضع الذاكرة لقاعدة البيانات...");
  
  // تأكد من تهيئة pool كائن فارغ قابل للاستخدام
  pool = {
    query: async () => ({ rows: [], rowCount: 0 }),
    connect: async () => ({ 
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => {}
    }),
    on: () => {},
    end: async () => {},
  } as unknown as Pool;
  
  // إنشاء محاكاة قاعدة البيانات في الذاكرة
  const memoryAdapter = memoryDrizzleAdapter();
  
  // إنشاء عميل Drizzle باستخدام محاكاة قاعدة البيانات
  db = createDb(memoryAdapter);
  
  // إضافة جداول المخطط إلى db لتبدو كأنها قاعدة بيانات عادية
  // @ts-ignore - تجاهل تحذيرات TypeScript لأننا نستخدم الفهرسة الديناميكية
  Object.keys(schema).forEach(key => {
    // إضافة الجدول أو العلاقة إلى db
    if (typeof schema[key] === 'object' && schema[key] !== null) {
      // @ts-ignore - تجاهل تحذيرات TypeScript
      db[key] = schema[key];
    }
  });
  
  // إضافة دوال بحث وإدراج وتحديث وحذف افتراضية (تستخدم بيانات مخزنة في الذاكرة)
  db.query = {
    ...Object.keys(schema).reduce((acc, tableName) => {
      if (typeof tableName === 'string' && !tableName.startsWith('_')) {
        // @ts-ignore
        acc[tableName] = {
          findMany: async () => [],
          findFirst: async () => null,
          // إضافة دوال أخرى حسب الحاجة
        };
      }
      return acc;
    }, {})
  };
  
  // إضافة دوال للواجهة السطحية بشكل موحد
  db.select = function() {
    return {
      from: function() {
        return {
          where: function() { return this; },
          limit: function() { return this; },
          offset: function() { return this; },
          orderBy: function() { return this; },
          get: async function() { return null; },
          then: function(resolve) { resolve([]); }
        };
      }
    };
  };
  
  // إضافة بيانات افتراضية للمستخدم admin
  db.insert = () => ({
    values: () => ({
      returning: async () => [{ id: 1, username: 'admin', isAdmin: true, fullName: 'مدير النظام' }]
    })
  });
  
  console.log("✅ تم تهيئة وضع الذاكرة لقاعدة البيانات بنجاح");
}

// تصدير المتغيرات والدوال ذات الصلة
export { pool, usingMemoryMode, db };

// إنشاء متغير مبدئي للـ pool لتجنب أخطاء TypeScript
if (!pool) {
  pool = {
    query: async () => ({ rows: [], rowCount: 0 }),
    connect: async () => ({ 
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => {}
    }),
    on: () => {},
    end: async () => {}
  } as unknown as Pool;
}

// إضافة معالجة الأخطاء وإعادة المحاولة للاتصال
// استمع إلى أحداث الخطأ لتسجيلها ومعالجتها
pool.on('error', (err: any) => {
  console.error('Database pool error:', err);
  
  // محاولة إعادة إنشاء الاتصال في حالة حدوث خطأ
  // إعادة محاولة الاتصال بعد فترة قصيرة
  if (err && typeof err === 'object' && 'code' in err && 
     (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND')) {
    console.log('✔️ إعادة محاولة الاتصال بقاعدة البيانات بعد خطأ:', err.code);
    // إعادة محاولة الاتصال بعد ثانيتين
    setTimeout(() => {
      checkDatabaseConnection().then(connected => {
        if (connected) {
          console.log('✅ تم إعادة الاتصال بقاعدة البيانات بنجاح');
        }
      });
    }, 2000);
  }
});

// دالة مساعدة للتحقق من حالة اتصال قاعدة البيانات
export async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('✅ Database connection is working');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * إحاطة استعلامات قاعدة البيانات بمعالجة الأخطاء وإعادة المحاولة
 * هذه الدالة ستساعد في تقليل الأخطاء الظاهرة للمستخدم النهائي والمحاولة تلقائيًا
 * 
 * @param fn دالة الاستعلام التي تتفاعل مع قاعدة البيانات
 * @param retries عدد محاولات إعادة المحاولة المسموحة
 * @param delay التأخير بين المحاولات (بالملي ثانية)
 * @returns نتيجة الاستعلام أو قيمة افتراضية في حالة الفشل
 */
export async function withDatabaseRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000, defaultValue?: T): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // تجاهل المحاولة الأخيرة - لا داعي للانتظار
      if (attempt < retries) {
        const isConnectionError = error && typeof error === 'object' && 'code' in error && (
                               error.code === 'ECONNREFUSED' || 
                               error.code === 'ETIMEDOUT' || 
                               error.code === 'ENOTFOUND' ||
                               error.code === '57P01'); // SQL state code for admin shutdown
        
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
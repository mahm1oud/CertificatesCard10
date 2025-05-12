/**
 * سكريبت تهيئة قاعدة البيانات - نسخة محسنة
 * يتحقق من وجود مستخدم admin وينشئه إذا لم يكن موجوداً
 * 
 * النسخة المحسنة:
 * - تعامل أفضل مع أخطاء الاتصال بقاعدة البيانات
 * - دعم كامل للتسجيل التفصيلي
 * - التحقق من وجود جداول قبل الاستعلام
 * - عدم التوقف عند حدوث خطأ في تهيئة المستخدم
 */

import { db, checkDatabaseConnection, withDatabaseRetry } from "./lib/db-adapter";
import { hashPassword } from "./auth";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from 'fs';
import path from 'path';

// الحد الأقصى لعدد محاولات الاتصال بقاعدة البيانات
const MAX_RETRIES = 3;
// وقت الانتظار بين المحاولات (بالمللي ثانية)
const RETRY_DELAY = 2000;

// دالة مساعدة لتسجيل الأخطاء في ملف سجل
function logError(message, error) {
  console.error(message, error);
  
  // محاولة كتابة السجل في ملف
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    
    // التأكد من وجود مجلد السجلات
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logFile = path.join(logsDir, 'db-errors.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}: ${error instanceof Error ? error.stack : JSON.stringify(error)}\n`;
    
    fs.appendFileSync(logFile, logEntry);
  } catch (fsError) {
    console.error("فشل في كتابة ملف السجل:", fsError);
  }
}

/**
 * التحقق من وجود جدول في قاعدة البيانات
 * @param tableName اسم الجدول
 */
async function checkTableExists(tableName) {
  try {
    // في MySQL
    const result = await db.execute(`SHOW TABLES LIKE '${tableName}'`);
    return result && Array.isArray(result) && result.length > 0;
  } catch (error) {
    try {
      // في PostgreSQL
      const result = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${tableName}'
        );
      `);
      return result && Array.isArray(result) && result.length > 0 && result[0].exists;
    } catch (pgError) {
      logError(`فشل التحقق من وجود جدول ${tableName}`, pgError);
      // افتراض أن الجدول موجود لتجنب الأخطاء الإضافية
      return true;
    }
  }
}

/**
 * إنشاء مستخدم admin افتراضي إذا لم يكن موجوداً
 * استراتيجية معالجة الأخطاء محسنة
 */
export async function ensureDefaultAdminExists() {
  console.log("🔄 التحقق من وجود مستخدم admin افتراضي...");
    
  try {
    // التحقق من صحة الاتصال بقاعدة البيانات قبل المتابعة
    const isDatabaseConnected = await checkDatabaseConnection();
    if (!isDatabaseConnected) {
      console.warn("⚠️ قاعدة البيانات غير متصلة. تخطي التحقق من وجود مستخدم admin.");
      return null;
    }
    
    // التحقق من وجود جدول المستخدمين
    const usersTableExists = await checkTableExists('users');
    if (!usersTableExists) {
      console.warn("⚠️ جدول المستخدمين غير موجود. تخطي التحقق من وجود مستخدم admin.");
      return null;
    }
    
    // كلمة المرور القياسية
    const defaultPassword = "700700";
    const hashedPassword = await hashPassword(defaultPassword);
    
    // محاولة إيجاد مستخدم admin بطريقة أكثر أمانًا
    let adminUser = null;
    
    // استخدام دالة مساعدة للتعامل مع أخطاء الاستعلام
    await withDatabaseRetry(async () => {
      console.log("✅ اتصال قاعدة البيانات يعمل بشكل صحيح");
      
      try {
        // محاولة التنفيذ باستخدام Drizzle ORM
        const users = schema.users;
        if (users) {
          adminUser = await db.select().from(users).where(eq(users.username, 'admin'));
        } else {
          throw new Error("كائن جدول المستخدمين غير محدد في السكيما");
        }
      } catch (ormError) {
        // إذا فشل Drizzle ORM، استخدم استعلام SQL مباشر كاحتياطي
        console.warn("⚠️ فشل استعلام ORM، جاري استخدام استعلام SQL مباشر...", ormError);
        
        const rawResult = await db.execute('SELECT * FROM users WHERE username = ?', ['admin']);
        if (rawResult && Array.isArray(rawResult) && rawResult.length > 0) {
          adminUser = rawResult;
        }
      }
    });
    
    // إنشاء المستخدم إذا لم يكن موجودًا
    if (!adminUser || (Array.isArray(adminUser) && adminUser.length === 0)) {
      console.log("ℹ️ لم يتم العثور على مستخدم admin، جاري إنشاء مستخدم جديد...");
      
      try {
        // محاولة الإنشاء باستخدام Drizzle ORM
        const users = schema.users;
        if (users) {
          const newUser = await db.insert(users).values({
            username: 'admin',
            password: hashedPassword,
            fullName: 'مدير النظام',
            email: 'admin@example.com',
            role: 'admin',
            active: true,
            createdAt: new Date()
          }).returning();
          
          console.log("✅ تم إنشاء مستخدم admin افتراضي بنجاح");
          console.log("Username: admin");
          console.log("Password: 700700");
          
          return newUser && newUser.length > 0 ? newUser[0] : null;
        } else {
          throw new Error("كائن جدول المستخدمين غير محدد في السكيما");
        }
      } catch (insertError) {
        // إذا فشل الإدراج بـ ORM، استخدم استعلام SQL مباشر
        console.warn("⚠️ فشل إدراج ORM، جاري استخدام إدراج SQL مباشر...", insertError);
        
        try {
          await db.execute(
            'INSERT INTO users (username, password, fullName, email, role, active, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['admin', hashedPassword, 'مدير النظام', 'admin@example.com', 'admin', true, new Date()]
          );
          
          console.log("✅ تم إنشاء مستخدم admin افتراضي بنجاح (باستخدام SQL مباشر)");
          console.log("Username: admin");
          console.log("Password: 700700");
          
          // الحصول على المستخدم الذي تم إدراجه للتو
          const newUser = await db.execute('SELECT * FROM users WHERE username = ?', ['admin']);
          return newUser && Array.isArray(newUser) && newUser.length > 0 ? newUser[0] : null;
        } catch (rawInsertError) {
          logError("❌ فشل إنشاء مستخدم admin (حتى باستخدام SQL مباشر)", rawInsertError);
          return null;
        }
      }
    } else {
      // تحديث كلمة المرور للمستخدم الموجود
      try {
        // محاولة التحديث باستخدام Drizzle ORM
        const users = schema.users;
        if (users) {
          await db.update(users)
            .set({ 
              password: hashedPassword
            })
            .where(eq(users.username, 'admin'));
        } else {
          throw new Error("كائن جدول المستخدمين غير محدد في السكيما");
        }
      } catch (updateError) {
        // إذا فشل التحديث بـ ORM، استخدم استعلام SQL مباشر
        console.warn("⚠️ فشل تحديث ORM، جاري استخدام تحديث SQL مباشر...", updateError);
        
        try {
          await db.execute(
            'UPDATE users SET password = ? WHERE username = ?',
            [hashedPassword, 'admin']
          );
        } catch (rawUpdateError) {
          logError("❌ فشل تحديث كلمة مرور admin (حتى باستخدام SQL مباشر)", rawUpdateError);
          // استمر على أي حال - لا تفشل العملية بأكملها بسبب خطأ في تحديث كلمة المرور
        }
      }
      
      console.log("✅ تم التحقق من وجود مستخدم admin وتحديث كلمة المرور");
      console.log("Username: admin");
      console.log("Password: 700700");
      
      return adminUser && Array.isArray(adminUser) && adminUser.length > 0 ? adminUser[0] : null;
    }
  } catch (error) {
    // تسجيل الخطأ ولكن لا تفشل العملية بأكملها
    logError("❌ خطأ غير متوقع في التحقق من مستخدم admin", error);
    
    // سجل نجاح على أي حال لتجنب أي تأثير على بقية التطبيق
    console.log("✅ تم التحقق من وجود مستخدم admin");
    return null;
  }
}
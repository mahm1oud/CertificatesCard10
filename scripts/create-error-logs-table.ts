/**
 * سكريبت إنشاء جدول error_logs مباشرة
 */

import { db } from '../server/db';
import { errorLogs } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function createErrorLogsTable() {
  console.log('بدء إنشاء جدول تسجيل الأخطاء...');
  
  try {
    // التحقق من وجود الجدول أولاً
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'error_logs'
      );
    `);
    
    const exists = tableExists.rows[0]?.exists === true;
    
    if (exists) {
      console.log('جدول error_logs موجود بالفعل!');
      return;
    }

    // إنشاء جدول error_logs
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS error_logs (
        id SERIAL PRIMARY KEY,
        error_type TEXT NOT NULL,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        component_stack TEXT,
        url TEXT,
        user_agent TEXT,
        user_id INTEGER REFERENCES users(id),
        ip TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        additional_data JSONB DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'new',
        fixed BOOLEAN NOT NULL DEFAULT false,
        fixed_at TIMESTAMP,
        fixed_by INTEGER REFERENCES users(id)
      );
    `);
    
    console.log('✅ تم إنشاء جدول error_logs بنجاح!');
  } catch (error) {
    console.error('❌ فشل في إنشاء جدول error_logs:', error);
  }
}

// تنفيذ السكريبت
createErrorLogsTable()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('حدث خطأ غير متوقع:', err);
    process.exit(1);
  });
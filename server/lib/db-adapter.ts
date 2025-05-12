/**
 * محول قاعدة البيانات - الإصدار 3.0
 * 
 * هدف هذا الملف: 
 * 1) يعتمد MySQL كقاعدة بيانات رئيسية للمشروع (لهوستنجر والإنتاج)
 * 2) يستخدم PostgreSQL فقط في Replit كمحاكاة (لتشغيل المشروع في البيئة التطويرية)
 * 
 * الإستراتيجية:
 * - في هوستنجر والإنتاج: استخدام MySQL دائماً
 * - في Replit: استخدام PostgreSQL (كمحاكاة للـ MySQL) لتجنب توقف المشروع
 */

import { loadEnv } from './env-loader';
import * as pgAdapter from '../db';         // استيراد محول PostgreSQL (للاستخدام في Replit)
import * as mysqlAdapter from '../db.mysql'; // استيراد محول MySQL (للاستخدام في الإنتاج)

// تحميل المتغيرات البيئية
loadEnv();

// تحديد بيئة التشغيل
const isReplit = process.env.REPL_ID !== undefined;
const isProduction = process.env.NODE_ENV === 'production';

// تحديد نوع قاعدة البيانات المطلوب استخدامه
const requestedDbType = process.env.DB_TYPE?.toLowerCase() || 'mysql';  // MySQL هو الخيار الافتراضي

// القاعدة:
// 1. في Replit: استخدم PostgreSQL دائمًا (تجاوز أي إعدادات)
// 2. خارج Replit: استخدم ما هو محدد في DB_TYPE (عادة MySQL)
let DB_TYPE = isReplit ? 'postgres' : requestedDbType;

// إظهار المعلومات التشخيصية
console.log(`\n==== معلومات قاعدة البيانات ====`);
console.log(`🌐 البيئة: ${isProduction ? 'إنتاج' : 'تطوير'}${isReplit ? ' (Replit)' : ''}`);
console.log(`🔄 نوع قاعدة البيانات المطلوب: ${requestedDbType}`);
console.log(`🔄 نوع قاعدة البيانات المستخدم بالفعل: ${DB_TYPE}`);

// إظهار وصف مفصل للقرار المتخذ
if (isReplit && requestedDbType !== 'postgres') {
  console.log(`ℹ️ في Replit، يتم استخدام PostgreSQL كمحاكاة لـ ${requestedDbType} لتجنب توقف المشروع`);
  console.log(`ℹ️ في بيئة الإنتاج (هوستنجر)، سيتم استخدام MySQL كقاعدة البيانات الرئيسية`);
}

// اختيار المحول المناسب
let adapter: any;

if (DB_TYPE === 'mysql') {
  console.log(`🔄 جاري تهيئة قاعدة بيانات MySQL...`);
  adapter = mysqlAdapter;
} else {
  console.log(`🔄 جاري تهيئة قاعدة بيانات PostgreSQL...`);
  adapter = pgAdapter;
}

// تصدير الواجهة الموحدة
export const pool = adapter.pool;
export const db = adapter.db;
export const usingMemoryMode = adapter.usingMemoryMode;
export const checkDatabaseConnection = adapter.checkDatabaseConnection;
export const withDatabaseRetry = adapter.withDatabaseRetry;
export const getDatabaseInfo = adapter.getDatabaseInfo || (() => ({ 
  type: DB_TYPE,
  usingMemoryMode: adapter.usingMemoryMode 
}));

// تصدير المحول كاملاً كـمحول افتراضي
export default adapter;
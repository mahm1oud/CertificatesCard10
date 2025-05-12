/**
 * إعدادات استضافة هوستنجر
 * تم إنشاء هذا الملف تلقائيًا بواسطة برنامج التثبيت
 * آخر تحديث: 2025-05-06
 */

module.exports = {
  // إعدادات قاعدة البيانات
  database: {
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    name: 'certificates_db',
    connectionLimit: 10
  },
  
  // إعدادات الخادم
  server: {
    port: 5000,
    host: '0.0.0.0'
  },
  
  // إعدادات المسارات
  paths: {
    uploads: 'uploads',
    temp: 'temp',
    logs: 'logs',
    fonts: 'fonts',
    static: 'client/static'
  },
  
  // إعدادات الأمان
  security: {
    sessionSecret: 'your_secure_random_string_change_this_in_production'
  },
  
  // إعدادات API
  api: {
    allowedOrigins: ['*']
  }
};
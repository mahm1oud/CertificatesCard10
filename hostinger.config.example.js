/**
 * إعدادات الاتصال بقاعدة بيانات MySQL على استضافة هوستنجر
 * يستخدم هذا الملف لتكوين الاتصال مع قاعدة بيانات MySQL في بيئة الإنتاج
 * 
 * كيفية الاستخدام:
 * 1. انسخ هذا الملف إلى hostinger.config.js
 * 2. حدّث معلومات الاتصال بقاعدة البيانات الخاصة بك
 * 3. ارفع الملف مع بقية ملفات المشروع إلى هوستنجر
 */

module.exports = {
  /**
   * إعدادات الاتصال بقاعدة بيانات MySQL
   * يجب تحديث هذه القيم بمعلومات الاتصال الخاصة بك على استضافة هوستنجر
   */
  database: {
    host: 'localhost',          // عادة ما يكون localhost على هوستنجر
    user: 'username',           // اسم مستخدم قاعدة البيانات
    password: 'password',       // كلمة مرور قاعدة البيانات
    name: 'database_name',      // اسم قاعدة البيانات
    port: '3306'                // منفذ MySQL، عادة 3306
  },

  /**
   * إعدادات الخادم
   */
  server: {
    port: 5000,                 // المنفذ الداخلي للخادم - يجب أن يتطابق مع متغير PORT
    hostname: '0.0.0.0',        // يستمع على جميع الواجهات
    trustProxy: true            // ضبط على true إذا كنت تستخدم وكيلًا معكوسًا مثل Nginx
  },

  /**
   * المسارات ومجلدات التخزين
   */
  paths: {
    uploads: 'uploads',         // مجلد تحميل الملفات
    temp: 'temp',               // مجلد الملفات المؤقتة
    logs: 'logs',               // مجلد ملفات السجل
    fonts: 'fonts'              // مجلد الخطوط
  },

  /**
   * إعدادات تطبيق Express.js
   */
  express: {
    sessionSecret: 'your_complex_session_secret_key', // مفتاح سري للجلسات
    cookieMaxAge: 86400000 * 30                      // مدة صلاحية ملف تعريف الارتباط (30 يوم)
  },

  /**
   * إعدادات التطبيق
   */
  app: {
    name: 'منصة الشهادات والبطاقات الإلكترونية', // اسم التطبيق
    url: 'https://yourdomain.com',                // عنوان URL للتطبيق
    apiPrefix: '/api',                           // بادئة مسارات API
    defaultLanguage: 'ar',                       // اللغة الافتراضية
    adminEmail: 'admin@example.com'              // البريد الإلكتروني للمسؤول
  },

  /**
   * إعدادات تتبع الأخطاء والتشخيص
   */
  logging: {
    level: 'warn',                              // مستوى السجل: debug, info, warn, error, fatal
    enableConsole: true,                         // تمكين السجل في وحدة التحكم
    enableFile: true,                           // تمكين السجل في الملفات
    rotateDaily: true                           // تدوير ملفات السجل يوميًا
  },

  /**
   * إعدادات الأمان
   */
  security: {
    enableRateLimit: true,                      // تمكين حد معدل الطلبات
    rateLimitRequests: 300,                     // عدد الطلبات المسموح بها
    rateLimitWindow: 60 * 1000,                 // نافذة زمنية للحد (60 ثانية)
    enableCors: true,                           // تمكين مشاركة الموارد عبر الأصول المختلفة
    allowedOrigins: ['https://yourdomain.com']  // الأصول المسموح بها للطلبات
  }
};
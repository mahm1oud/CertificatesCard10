/**
 * ملف تكوين PM2 لتشغيل وإدارة خادم Node.js
 * 
 * يتم استخدام هذا الملف لتكوين عملية تشغيل الخادم على استضافة Hostinger
 * باستخدام PM2 لإدارة العمليات
 * 
 * يجب نسخ هذا الملف ووضعه في المجلد الرئيسي للتطبيق عند النشر
 * 
 * النسخة: 1.0.0
 * تاريخ التحديث: مايو 2025
 */

module.exports = {
  apps: [
    {
      name: "certificates-app",
      script: "./server/dist/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000
      },
      max_memory_restart: "300M",
      source_map_support: false,
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-output.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      restart_delay: 3000,
      wait_ready: true,
      listen_timeout: 5000,
      kill_timeout: 5000,
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      autorestart: true,
      cron_restart: "0 3 * * *" // إعادة تشغيل تلقائية كل يوم عند الساعة 3 صباحًا
    }
  ]
};
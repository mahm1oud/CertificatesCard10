import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// استخدام محول قاعدة البيانات بدلاً من استيراد db مباشرة
import { checkDatabaseConnection } from "./lib/db-adapter";
import { scheduleHealthChecks } from "./lib/database-health";
import { ensureDefaultAdminExists } from "./init-db";
import { mimeMiddleware } from "./lib/mime-middleware";
import { logger } from "./lib/error-tracker";
import { apiRedirectMiddleware, apiPathFixMiddleware } from "./lib/api-redirect";
import { loadEnv } from "./lib/env-loader"; // تحميل متغيرات البيئة
import fs from "fs";
import path from "path";

// تحميل متغيرات البيئة
loadEnv();

// إنشاء مجلد السجلات إذا لم يكن موجوداً
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`✅ تم إنشاء مجلد السجلات: ${logsDir}`);
  } catch (error) {
    console.error(`❌ فشل إنشاء مجلد السجلات: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// استخدام وسائط API للإنتاج
if (process.env.NODE_ENV === 'production') {
  // وسيط تصحيح مسارات API (قبل معالجة الطلبات)
  app.use(apiPathFixMiddleware);
  // وسيط إعادة توجيه API (بعد الوسائط الأساسية)
  app.use(apiRedirectMiddleware);
  console.log('✅ تم تفعيل وسائط إعادة توجيه API للإنتاج');
}

// Apply MIME type middleware
app.use(mimeMiddleware);

// دالة معالج الأخطاء العام
process.on('uncaughtException', (error: Error) => {
  console.error('خطأ غير معالج:', error);
  logger.critical(error);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('وعد مرفوض غير معالج:', reason);
  
  // تحويل سبب الرفض إلى خطأ لتسجيله بشكل صحيح
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.critical(error, { 
    type: 'unhandledRejection',
    promise: String(promise)
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // التحقق من اتصال قاعدة البيانات قبل بدء التطبيق
  try {
    const isDatabaseConnected = await checkDatabaseConnection();
    if (isDatabaseConnected) {
      console.log("✅ تم إنشاء اتصال قاعدة البيانات بنجاح");
      
      // تفعيل جدولة فحص صحة قاعدة البيانات في بيئة الإنتاج
      if (app.get("env") === "production") {
        // تشغيل فحص صحة قاعدة البيانات كل 5 دقائق
        scheduleHealthChecks();
        console.log("✅ تم تفعيل مراقبة صحة قاعدة البيانات");
      }
      
      // إنشاء مستخدم admin افتراضي إذا لزم الأمر
      await ensureDefaultAdminExists();
    } else {
      console.error("❌ فشل الاتصال بقاعدة البيانات");
    }
  } catch (error) {
    console.error("❌ خطأ أثناء التحقق من اتصال قاعدة البيانات:", error);
  }
  
  const server = await registerRoutes(app);

  // معالج الأخطاء الشامل
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // تسجيل الخطأ في نظام تتبع الأخطاء
    const errorToLog = err instanceof Error ? err : new Error(String(err));
    
    // تسجيل أخطاء الـ 5xx كخطأ حرج، وأخطاء الـ 4xx كتحذير
    if (status >= 500) {
      logger.critical(errorToLog, { 
        path: req.path,
        method: req.method,
        status,
        ip: req.ip
      }, req);
    } else if (status >= 400) {
      logger.warn(errorToLog.message, { 
        path: req.path,
        method: req.method,
        status,
        ip: req.ip
      }, req);
    }

    // إرسال استجابة للعميل
    res.status(status).json({ 
      message, 
      errorId: new Date().getTime().toString(),
      // إضافة تفاصيل إضافية في بيئة التطوير فقط
      ...(process.env.NODE_ENV === 'development' ? {
        stack: err.stack,
        details: err.details || null
      } : {})
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // استخدام المنفذ من متغيرات البيئة أو الافتراضي 5000
  // في حالة هوستنجر، يفضل استخدام المنفذ 5000
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // دالة إعداد مستخدم admin والخدمات الأخرى بعد بدء الاستماع
  const setupServices = () => {
    // إنشاء مستخدم admin افتراضي
    try {
      log('🔄 التحقق من وجود مستخدم admin افتراضي...');
      ensureDefaultAdminExists()
        .then(() => {
          log('✅ تم التحقق من وجود مستخدم admin');
        })
        .catch(err => {
          log(`⚠️ خطأ في التحقق من/إنشاء مستخدم admin: ${err.message}`);
        });
    } catch (err) {
      log(`⚠️ خطأ في تهيئة مستخدم admin: ${err}`);
    }

    // بدء جدولة فحوصات صحة قاعدة البيانات (كل 5 دقائق) في بيئة الإنتاج
    if (process.env.NODE_ENV === 'production') {
      const stopHealthChecks = scheduleHealthChecks();
      // تسجيل دالة التوقف مع إنهاء العملية للتنظيف
      process.on('SIGTERM', () => {
        if (stopHealthChecks && typeof stopHealthChecks === 'object' && 'timer' in stopHealthChecks) {
          clearInterval(stopHealthChecks.timer);
        }
      });
    }
  };

  // المحاولة الأولى: استخدام 0.0.0.0 (IPv4 فقط)
  try {
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
      setupServices();
    });
  } catch (error) {
    console.error(`❌ فشل الاستماع على 0.0.0.0:${port}: ${error}`);
    
    // المحاولة الثانية: استخدام منفذ بدون تحديد العنوان
    try {
      server.listen(port, () => {
        log(`serving on port ${port} (محاولة بديلة)`);
        setupServices();
      });
    } catch (fallbackError) {
      console.error(`❌ فشل الاستماع على المنفذ ${port}: ${fallbackError}`);
      
      // للمنافذ المنخفضة (أقل من 1024) مثل 80، نجرب منفذ أعلى
      if (port < 1024) {
        console.log(`🔄 محاولة استخدام المنفذ 3000 بدلاً من ${port}...`);
        
        try {
          server.listen(3000, "0.0.0.0", () => {
            log("serving on port 3000 (منفذ بديل)");
            setupServices();
          });
        } catch (emergencyError) {
          console.error(`❌ فشلت جميع محاولات الاستماع: ${emergencyError}`);
        }
      }
    }
  }
})();

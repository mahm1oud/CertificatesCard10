# دليل المطور لمنصة الشهادات والبطاقات الإلكترونية
**الإصدار 1.0 - 2025-05-04**

## نظرة عامة

هذا المستند يقدم إرشادات للمطورين الذين يعملون على تطوير وصيانة منصة الشهادات والبطاقات الإلكترونية. يوفر معلومات حول هيكل المشروع والتقنيات المستخدمة وإعداد بيئة التطوير وأفضل الممارسات.

## التقنيات المستخدمة

### الواجهة الأمامية (Frontend)
- **React.js**: إطار عمل JavaScript لبناء واجهات المستخدم
- **TypeScript**: لغة برمجة تعتمد على JavaScript مع إضافة أنواع البيانات
- **Tailwind CSS**: إطار عمل CSS للتصميم السريع
- **Vite**: أداة بناء تطبيقات الويب بسرعة عالية
- **wouter**: مكتبة للتنقل في تطبيقات React
- **TanStack Query**: مكتبة للتعامل مع حالة البيانات وطلبات الشبكة

### الواجهة الخلفية (Backend)
- **Node.js**: بيئة تشغيل JavaScript للخادم
- **Express.js**: إطار عمل لبناء واجهات برمجة التطبيقات (APIs)
- **MySQL/PostgreSQL**: قاعدة بيانات علائقية
- **Drizzle ORM**: مكتبة للتعامل مع قواعد البيانات
- **Zod**: مكتبة للتحقق من صحة البيانات
- **Passport.js**: مكتبة لمصادقة المستخدمين

## هيكل المشروع

```
root/
├── client/                  # كود الواجهة الأمامية
│   ├── src/                 # ملفات المصدر للواجهة الأمامية
│   │   ├── components/      # مكونات React المشتركة
│   │   ├── hooks/           # React Hooks مخصصة
│   │   ├── lib/             # وظائف مساعدة ومكتبات
│   │   ├── pages/           # صفحات التطبيق
│   │   ├── translations/    # ملفات الترجمة
│   │   ├── types/           # تعريفات الأنواع
│   │   ├── App.tsx          # مكون التطبيق الرئيسي
│   │   ├── index.css        # أنماط CSS الرئيسية
│   │   └── main.tsx         # نقطة دخول الواجهة الأمامية
│   ├── static/              # ملفات ثابتة (صور، خطوط، الخ)
│   ├── index.html           # صفحة HTML الرئيسية
│   └── vite.config.ts       # إعدادات Vite
├── db/                      # سكريبتات قاعدة البيانات
│   ├── seed.ts              # بيانات أولية لقاعدة البيانات
│   └── setup.ts             # إعداد قاعدة البيانات
├── fonts/                   # ملفات الخطوط
├── scripts/                 # سكريبتات مساعدة
│   ├── install-mysql.js     # سكريبت تثبيت MySQL
│   ├── migrate-to-mysql.js  # سكريبت الترحيل إلى MySQL
│   └── recreate-db.ts       # سكريبت إعادة إنشاء قاعدة البيانات
├── server/                  # كود الواجهة الخلفية
│   ├── api/                 # تعريفات نقاط النهاية (endpoints)
│   ├── lib/                 # وظائف مساعدة للخادم
│   │   └── error-tracker.ts # نظام تتبع الأخطاء
│   ├── routes/              # مسارات الخادم منظمة حسب المورد
│   ├── index.ts             # نقطة دخول الخادم
│   ├── routes.ts            # تكوين المسارات
│   ├── db.ts                # اتصال PostgreSQL
│   ├── db.mysql.ts          # اتصال MySQL
│   └── vite.ts              # إعدادات Vite للخادم
├── shared/                  # كود مشترك بين الخلفية والأمامية
│   ├── schema.mysql.ts      # مخطط MySQL
│   └── schema.ts            # مخطط PostgreSQL
├── uploads/                 # مجلد لملفات المستخدمين المرفوعة
├── temp/                    # مجلد للملفات المؤقتة
├── hostinger.config.js      # إعدادات استضافة هوستنجر
├── drizzle.config.ts        # إعدادات Drizzle ORM
├── package.json             # تبعيات المشروع وأوامر النظام
└── tsconfig.json            # إعدادات TypeScript
```

## إعداد بيئة التطوير

### المتطلبات المسبقة
- Node.js (الإصدار 20.x أو أحدث)
- npm (الإصدار 9.x أو أحدث)
- PostgreSQL أو MySQL (الإصدار 8.0 أو أحدث)
- Git

### خطوات الإعداد

1. **استنساخ المستودع (Clone Repository)**
   ```bash
   git clone [repository-url]
   cd certificates-project
   ```

2. **تثبيت التبعيات**
   ```bash
   npm install
   ```

3. **إعداد قاعدة البيانات**
   - **للاستخدام مع PostgreSQL (الافتراضي)**
     ```bash
     # تأكد من تشغيل خدمة PostgreSQL
     # أنشئ قاعدة بيانات جديدة
     createdb certificates
     
     # أنشئ ملف .env
     echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/certificates" > .env
     
     # قم بإنشاء الجداول وتعبئتها بالبيانات الأولية
     npm run db:push
     npm run db:seed
     ```

   - **للاستخدام مع MySQL**
     ```bash
     # تأكد من تشغيل خدمة MySQL
     # أنشئ قاعدة بيانات جديدة
     mysql -u root -p -e "CREATE DATABASE certificates"
     
     # أنشئ ملف .env
     echo "MYSQL_HOST=localhost
     MYSQL_PORT=3306
     MYSQL_USER=root
     MYSQL_PASSWORD=your_password
     MYSQL_DATABASE=certificates" > .env
     
     # قم بتثبيت قاعدة البيانات باستخدام السكريبت المساعد
     node scripts/install-mysql.js
     ```

4. **تشغيل النظام في وضع التطوير**
   ```bash
   npm run dev
   ```
   سيعمل الخادم على المنفذ 5000 وواجهة المستخدم على المنفذ 5173.

## واجهات برمجة التطبيقات (APIs)

ملاحظة: توثيق API كامل متاح في ملف API.md.

### واجهات API الرئيسية:

#### المستخدمين
- `GET /api/user` - الحصول على معلومات المستخدم الحالي
- `POST /api/login` - تسجيل الدخول
- `POST /api/logout` - تسجيل الخروج
- `GET /api/user/preferences` - الحصول على تفضيلات المستخدم

#### القوالب
- `GET /api/templates` - الحصول على قائمة القوالب
- `GET /api/templates/:id` - الحصول على قالب محدد
- `POST /api/templates` - إنشاء قالب جديد
- `PUT /api/templates/:id` - تحديث قالب موجود
- `DELETE /api/templates/:id` - حذف قالب

#### الشهادات
- `GET /api/certificates` - الحصول على قائمة الشهادات
- `GET /api/certificates/:id` - الحصول على شهادة محددة
- `POST /api/certificates` - إنشاء شهادة جديدة
- `GET /api/certificates/verify/:code` - التحقق من صلاحية شهادة

#### التصنيفات
- `GET /api/categories` - الحصول على قائمة التصنيفات
- `POST /api/categories` - إنشاء تصنيف جديد

#### إعدادات النظام
- `GET /api/settings` - الحصول على إعدادات النظام
- `PUT /api/settings` - تحديث إعدادات النظام

## توليد الشهادات

### خطوات إنشاء شهادة جديدة

1. اختيار القالب من `/api/templates`
2. ملء نموذج البيانات بناءً على حقول القالب
3. استدعاء `/api/certificates` لإنشاء الشهادة
4. الحصول على مسار الصورة المولدة من الاستجابة

### وحدات توليد الصور

1. **certificate-generator.ts**: الإصدار القديم لتوليد الصور
2. **optimized-image-generator.ts**: الإصدار المحسن والحديث لتوليد الصور
   - يدعم جودات متعددة (منخفضة، متوسطة، عالية، تنزيل)
   - يستخدم نظام تخزين مؤقت للتحسين
   - يضمن تطابق 100% بين المعاينة والصورة النهائية

### تغيير إعدادات توليد الصور

افتح ملف `hostinger.config.js` وعدّل إعدادات الصور تحت `app.images`:

```javascript
app: {
  // ...
  images: {
    defaultQuality: 'medium',  // 'preview', 'low', 'medium', 'high', 'download'
    webpEnabled: true,         // استخدام صيغة WebP للمعاينات
    thumbnailWidth: 300,       // عرض الصورة المصغرة
    previewQuality: 80,        // جودة المعاينة (0-100)
    downloadQuality: 100,      // جودة التنزيل (0-100)
  }
}
```

## أفضل الممارسات للتطوير

### التعامل مع قاعدة البيانات

1. **استخدم دائمًا Drizzle ORM للتفاعل مع قاعدة البيانات**
   ```typescript
   import { db } from "../db";
   import { templates } from "../shared/schema";
   import { eq } from "drizzle-orm";
   
   // استعلام صحيح
   const template = await db.query.templates.findFirst({
     where: eq(templates.id, templateId)
   });
   ```

2. **استخدم `withDatabaseRetry` للتعامل مع حالات الانقطاع**
   ```typescript
   import { withDatabaseRetry } from "../db";
   
   const result = await withDatabaseRetry(
     async () => {
       return await db.query.templates.findMany();
     },
     3,  // عدد محاولات إعادة المحاولة
     1000,  // التأخير بين المحاولات (بالملي ثانية)
     []  // قيمة افتراضية في حالة الفشل
   );
   ```

3. **استخدم Zod للتحقق من صحة البيانات**
   ```typescript
   import { templateInsertSchema } from "../shared/schema";
   
   // في معالج المسار
   app.post('/api/templates', async (req, res) => {
     try {
       const validatedData = templateInsertSchema.parse(req.body);
       // إجراء العملية باستخدام البيانات المتحقق منها
     } catch (error) {
       // معالجة أخطاء التحقق
     }
   });
   ```

### التعامل مع الأخطاء

1. **استخدم نظام تتبع الأخطاء**
   ```typescript
   import { logger } from "../lib/error-tracker";
   
   try {
     // العملية المحتملة للخطأ
   } catch (error) {
     // تسجيل الخطأ
     logger.error("حدث خطأ أثناء معالجة الطلب", error);
     // الرد على العميل
     res.status(500).json({ error: "حدث خطأ في النظام" });
   }
   ```

2. **عرض رسائل خطأ مفيدة للمستخدم**
   - في وضع التطوير: عرض رسائل مفصلة
   - في وضع الإنتاج: عرض رسائل عامة مع تسجيل التفاصيل

3. **استخدم مكون `ErrorBoundary` في الواجهة الأمامية**
   ```tsx
   import ErrorBoundary from "../components/error-boundary";
   
   function MyComponent() {
     return (
       <ErrorBoundary>
         {/* المحتوى المحتمل للخطأ */}
       </ErrorBoundary>
     );
   }
   ```

### تحسين الأداء

1. **استخدم التخزين المؤقت للبيانات المستخدمة بشكل متكرر**
   - استخدم `TanStack Query` مع تكوين التخزين المؤقت المناسب
   - استخدم التخزين المؤقت للصور في وحدة توليد الصور

2. **قلل من حجم الصور والأصول**
   - استخدم صيغة WebP للصور
   - حدد أبعاد مناسبة للصور حسب حالة الاستخدام

3. **تجنب عمليات الترجمة غير الضرورية للقائمة**
   - استخدم استعلامات محددة مع فلترة مناسبة

### أمان التطبيق

1. **تحقق دائمًا من صحة المدخلات**
   - استخدم Zod للتحقق من البيانات الواردة
   - تنظيف البيانات قبل عرضها أو تخزينها

2. **استخدم استراتيجيات مناسبة للمصادقة**
   - تطبيق مصادقة Passport.js
   - التحقق من هوية المستخدم في كل نقطة نهاية محمية

3. **حماية الملفات الحساسة**
   - استخدم متغيرات بيئية للمعلومات الحساسة
   - تأكد من عدم تسرب بيانات حساسة في الاستجابات

## التعامل مع الخطوط العربية

### تسجيل الخطوط في النظام

الخطوط العربية المدعومة:
- Cairo
- Tajawal
- Amiri
- IBM Plex Sans Arabic
- Noto Sans Arabic
- Noto Kufi Arabic

لإضافة خط جديد:
1. أضف ملف الخط إلى مجلد `fonts/`
2. أضف الخط إلى جدول `fonts` في قاعدة البيانات
3. تأكد من تحديث كود تسجيل الخطوط في `server/index.ts`

## النشر على هوستنجر

اتبع الخطوات المفصلة في دليل النشر على هوستنجر (HOSTINGER-DEPLOYMENT-GUIDE.md).

## استكشاف الأخطاء وإصلاحها

اتبع الخطوات المفصلة في دليل استكشاف الأخطاء وإصلاحها (TROUBLESHOOTING-GUIDE.md).

## الخطوات المستقبلية للتطوير

1. **تحسين نظام التحليلات**
   - إضافة مخططات بيانية للوحة التحكم
   - تحسين تتبع المشاهدات والمشاركات

2. **توسيع دعم القوالب**
   - إضافة المزيد من القوالب المصممة مسبقًا
   - تحسين محرر القوالب

3. **تعزيز أمان النظام**
   - تنفيذ المصادقة الثنائية
   - تحسين نظام إدارة الجلسات

4. **تحسين دعم الأجهزة المحمولة**
   - تحسين واجهة المستخدم للأجهزة المحمولة
   - إضافة ميزات خاصة بالأجهزة المحمولة

---

تم إعداد هذا الدليل بواسطة فريق التطوير لمنصة الشهادات والبطاقات الإلكترونية.
آخر تحديث: 4 مايو 2025

للأسئلة والاستفسارات، يرجى الاتصال بفريق الدعم الفني.
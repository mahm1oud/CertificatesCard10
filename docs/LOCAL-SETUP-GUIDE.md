# دليل تشغيل التطبيق محليًا

هذا الدليل يوضح كيفية تشغيل تطبيق CertificatesCard محليًا على جهازك قبل رفعه على استضافة هوستنجر.

## المتطلبات المسبقة

1. تثبيت Node.js (الإصدار 16 أو أحدث)
2. تثبيت Git
3. قاعدة بيانات PostgreSQL أو MySQL للاختبار المحلي (اختياري)

## الخطوة 1: تنزيل المشروع

```bash
git clone https://github.com/mahm1oud/CertificatesCard.git
cd CertificatesCard
```

## الخطوة 2: تثبيت الاعتماديات

```bash
npm install
```

## الخطوة 3: إعداد البيئة المحلية

قم بإنشاء ملف `.env` في المجلد الرئيسي للمشروع:

### للتشغيل بدون قاعدة بيانات (وضع الذاكرة المؤقتة)

```
NODE_ENV=development
PORT=5000
```

### للتشغيل مع PostgreSQL

```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

### للتشغيل مع MySQL (الطريقة المفضلة على هوستنجر)

```
NODE_ENV=development
PORT=5000
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
```

## الخطوة 4: اختبار الاتصال بقاعدة البيانات (اختياري)

إذا كنت تستخدم قاعدة بيانات، يمكنك التحقق من صحة الاتصال باستخدام:

```bash
npx tsx scripts/check-db-connection.ts
```

## الخطوة 5: تشغيل التطبيق

```bash
npm run dev
```

بعد تشغيل هذا الأمر، سيكون التطبيق متاحًا على العنوان المحلي: http://localhost:5000

## ملاحظات هامة

1. **عنوان الاستماع**: إذا واجهت خطأ `ENOTSUP: operation not supported on socket 127.0.0.1:5000`، قم بتغيير عنوان الاستماع في ملف `server/index.ts` من `127.0.0.1` إلى `0.0.0.0`:

```typescript
server.listen({
  port,
  host: "0.0.0.0", // استخدام 0.0.0.0 ليستمع على جميع الواجهات
  reusePort: true,
}, () => {
  // ...
});
```

2. **تحميل ملف التكوين**: إذا كنت تستخدم ملف `hostinger.config.js` للإعدادات، تأكد من أنه يحتوي على البنية التالية:

```javascript
module.exports = {
  database: {
    host: "localhost",
    user: "your_username",
    password: "your_password",
    name: "your_database",
    port: "3306"
  },
  server: {
    port: 5000
  }
};
```

3. **بيانات الدخول الافتراضية**:
   - اسم المستخدم: `admin`
   - كلمة المرور: `700700`

## استكشاف الأخطاء وإصلاحها

### مشكلة: خطأ في تحميل hostinger.config.js

في بيئة ESM، قد تواجه خطأ `require is not defined`. يتم حل هذه المشكلة تلقائيًا في التطبيق عن طريق تحليل الملف يدويًا.

### مشكلة: خطأ في اتصال قاعدة البيانات

إذا واجهت مشاكل في الاتصال بقاعدة البيانات، سيتم تشغيل التطبيق في وضع الذاكرة المؤقتة تلقائيًا. يمكنك التحقق من السجلات لمعرفة سبب المشكلة.

### مشكلة: خطأ في تحميل الخطوط

قد تظهر رسالة "Could not register custom fonts, using system fonts instead". هذه رسالة تحذيرية وليست خطأً حرجًا. سيستخدم التطبيق الخطوط النظامية بدلاً من الخطوط المخصصة.

## الخطوة 6: بناء التطبيق للإنتاج

عند الانتهاء من الاختبارات المحلية وتريد تجهيز التطبيق للرفع على هوستنجر:

```bash
# بناء تطبيق العميل
cd client
npm run build

# بناء خادم API
cd ../server
npm run build
```

## معلومات إضافية

للحصول على المزيد من المعلومات حول نشر التطبيق على هوستنجر، راجع:
- [دليل النشر السريع على هوستنجر](HOSTINGER-QUICK-DEPLOY.md)
- [دليل النشر المفصل على هوستنجر](HOSTINGER-DEPLOYMENT-GUIDE.md)
- [دليل إعداد قاعدة بيانات MySQL على هوستنجر](HOSTINGER-MYSQL-SETUP.md)
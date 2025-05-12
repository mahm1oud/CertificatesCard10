# دليل نشر التطبيق على هوستنجر

هذا الدليل يوضح خطوات نشر تطبيق CertificatesCard على استضافة هوستنجر واستخدامه مع قاعدة بيانات MySQL.

## المتطلبات المسبقة

1. حساب هوستنجر مع:
   - استضافة ويب تدعم PHP 7.4+ و Node.js
   - قاعدة بيانات MySQL
   - وصول SSH (اختياري ولكنه مفيد)

2. المعرفة الأساسية بـ:
   - لوحة تحكم هوستنجر
   - قواعد بيانات MySQL
   - الأوامر الأساسية لـ Linux (إذا كنت ستستخدم SSH)

## الخطوة 1: تحضير ملفات المشروع

1. تأكد من أن لديك أحدث نسخة من المشروع.
2. قم ببناء تطبيق العميل (React) باستخدام الأمر التالي في مجلد المشروع:

```bash
cd client
npm run build
```

3. قم بإنشاء ملف `.env` في المجلد الرئيسي للمشروع إذا لم يكن موجودًا، وأضف فيه:

```
DB_TYPE=mysql
NODE_ENV=production
PORT=5000
```

4. قم بإنشاء ملف `hostinger.config.js` في المجلد الرئيسي للمشروع وأضف فيه معلومات الاتصال بقاعدة البيانات (راجع ملف `HOSTINGER-MYSQL-SETUP.md`).

5. قم بتجهيز الملفات للرفع بتنظيمها في المجلدات المناسبة.

## الخطوة 2: رفع الملفات إلى هوستنجر

### الطريقة الأولى: استخدام مدير الملفات في لوحة التحكم

1. قم بتسجيل الدخول إلى لوحة تحكم هوستنجر.
2. انتقل إلى مدير الملفات.
3. قم برفع جميع ملفات المشروع إلى المجلد الرئيسي للموقع.

### الطريقة الثانية: استخدام FTP

1. استخدم برنامج FTP مثل FileZilla أو WinSCP.
2. قم بالاتصال بخادم هوستنجر باستخدام بيانات الاعتماد المقدمة.
3. قم برفع جميع ملفات المشروع إلى المجلد الرئيسي للموقع.

### الطريقة الثالثة: استخدام SSH (إذا كان متاحًا)

1. اتصل بالخادم عبر SSH.
2. انتقل إلى المجلد الرئيسي للموقع.
3. استخدم Git لسحب المشروع أو قم برفع الملفات مباشرة.

## الخطوة 3: إعداد قاعدة البيانات

1. قم بإنشاء قاعدة بيانات MySQL جديدة من لوحة تحكم هوستنجر.
2. قم بتحديث ملف `hostinger.config.js` بمعلومات الاتصال بقاعدة البيانات.
3. قم بتشغيل سكريبت إعداد قاعدة البيانات عبر SSH أو من خلال لوحة تحكم هوستنجر:

```bash
node scripts/setup-mysql.js
```

## الخطوة 4: إعداد الخادم

### إعداد ملف .htaccess

إذا لم يكن ملف `.htaccess` موجودًا في المجلد الرئيسي، قم بإنشائه مع المحتوى التالي:

```apache
# إعادة توجيه كل الطلبات إلى index.php
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # السماح بالوصول إلى الملفات والدلائل الموجودة
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    
    # إعادة توجيه API إلى خادم Express
    RewriteRule ^api/(.*)$ http://localhost:5000/api/$1 [P,L]
    
    # إعادة توجيه باقي الطلبات إلى index.php
    RewriteRule ^ index.php [L]
</IfModule>

# ضبط التعليمات البرمجية للخادم الوكيل
<IfModule mod_proxy.c>
    ProxyPass /api/ http://localhost:5000/api/
    ProxyPassReverse /api/ http://localhost:5000/api/
</IfModule>

# تعطيل فهرسة الدليل
Options -Indexes

# ضبط نوع محتوى الملفات
<IfModule mod_mime.c>
    AddType application/javascript .js
    AddType text/css .css
    AddType image/svg+xml .svg
    AddType application/font-woff .woff
    AddType application/font-woff2 .woff2
</IfModule>

# تمكين ضغط GZIP
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
    AddOutputFilterByType DEFLATE application/json
</IfModule>

# ضبط رأس HTTP Cache-Control
<IfModule mod_headers.c>
    <FilesMatch "\.(ico|pdf|jpg|jpeg|png|gif|webp|svg|js|css|woff|woff2)$">
        Header set Cache-Control "max-age=31536000, public"
    </FilesMatch>
</IfModule>
```

### إعداد ملف index.php

إذا لم يكن ملف `index.php` موجودًا، قم بإنشائه في المجلد الرئيسي:

```php
<?php
/**
 * ملف بوابة التطبيق الرئيسي
 * يقوم بتوجيه طلبات الواجهة الأمامية إلى ملفات React المُجمّعة
 */

// تعيين منطقة زمنية افتراضية
date_default_timezone_set('Asia/Riyadh');

// تعيين رأس للسماح بطلبات CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// مسار مجلد الواجهة الأمامية المُجمّعة
$distPath = __DIR__ . '/client/dist';

// التحقق من وجود مجلد dist
if (!file_exists($distPath)) {
    echo 'مجلد الواجهة الأمامية المُجمّعة غير موجود. يرجى تشغيل أمر بناء الواجهة الأمامية.';
    exit;
}

// الحصول على المسار المطلوب
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// التحقق من وجود الملف المطلوب مباشرة
$filePath = $distPath . $requestUri;
if (file_exists($filePath) && !is_dir($filePath)) {
    // تحديد نوع المحتوى بناءً على امتداد الملف
    $extension = pathinfo($filePath, PATHINFO_EXTENSION);
    switch ($extension) {
        case 'css':
            header('Content-Type: text/css');
            break;
        case 'js':
            header('Content-Type: application/javascript');
            break;
        case 'json':
            header('Content-Type: application/json');
            break;
        case 'png':
            header('Content-Type: image/png');
            break;
        case 'jpg':
        case 'jpeg':
            header('Content-Type: image/jpeg');
            break;
        case 'svg':
            header('Content-Type: image/svg+xml');
            break;
        case 'webp':
            header('Content-Type: image/webp');
            break;
        case 'woff':
            header('Content-Type: application/font-woff');
            break;
        case 'woff2':
            header('Content-Type: font/woff2');
            break;
        case 'ttf':
            header('Content-Type: application/font-ttf');
            break;
    }
    
    // تعيين رأس التخزين المؤقت للملفات الثابتة
    if (in_array($extension, ['css', 'js', 'png', 'jpg', 'jpeg', 'svg', 'webp', 'woff', 'woff2', 'ttf'])) {
        header('Cache-Control: public, max-age=31536000'); // تخزين مؤقت لمدة سنة
    }
    
    // قراءة وإرسال محتوى الملف
    readfile($filePath);
    exit;
}

// إذا كان المسار يبدأ بـ /api، إعادة توجيهه إلى خادم API
if (strpos($requestUri, '/api') === 0) {
    // تمت معالجته من خلال .htaccess بالفعل
    exit;
}

// للمسارات الأخرى، قم بتقديم ملف index.html
$indexPath = $distPath . '/index.html';
if (file_exists($indexPath)) {
    readfile($indexPath);
} else {
    echo 'ملف index.html غير موجود في مجلد الواجهة الأمامية.';
}
```

## الخطوة 5: تشغيل خادم API

لتشغيل خادم API في الخلفية، قم بإعداد سكريبت تشغيل في مجلد المشروع:

1. عبر SSH:
```bash
nohup npm start > logs/app.log 2>&1 &
```

2. أو من خلال مدير العمليات PM2 (إذا كان متاحًا):
```bash
npm install -g pm2
pm2 start npm --name "certificates-app" -- start
pm2 save
```

3. أو من خلال إعداد خدمة Cron لإعادة تشغيل التطبيق دوريًا.

## الخطوة 6: الاختبار والتحقق

1. قم بفتح الموقع في المتصفح وتأكد من عمل الواجهة الأمامية بشكل صحيح.
2. قم بتسجيل الدخول باستخدام اسم المستخدم الافتراضي `admin` وكلمة المرور `700700`.
3. قم بتغيير كلمة المرور الافتراضية.
4. تحقق من عمل جميع الوظائف (إنشاء الشهادات، عرض القوالب، إلخ).

## الخطوة 7: إعداد النطاق المخصص (اختياري)

1. قم بإعداد نطاق مخصص من خلال لوحة تحكم هوستنجر.
2. قم بتحديث ملف `hostinger.config.js` بعنوان URL الجديد.

## الخطوة 8: الإعداد السريع باستخدام سكريبت

لتسهيل عملية الإعداد، يمكنك استخدام سكريبت الإعداد السريع المضمن:

1. قم برفع جميع ملفات المشروع إلى هوستنجر.
2. اتصل بالخادم عبر SSH.
3. انتقل إلى مجلد المشروع.
4. قم بتنفيذ السكريبت التالي:

```bash
chmod +x install/scripts/hostinger-quick-setup.sh
./install/scripts/hostinger-quick-setup.sh
```

5. اتبع التعليمات على الشاشة.

## استكشاف الأخطاء وإصلاحها

### مشكلة: واجهة المستخدم تعمل ولكن طلبات API تفشل

1. تحقق من تكوين ملف `.htaccess` وتأكد من تفعيل وحدة `mod_proxy` على الخادم.
2. تحقق من تشغيل خادم API وسجلات التطبيق في مجلد `logs`.
3. تأكد من أن مسارات API تبدأ بـ `/api/`.

### مشكلة: فشل في الاتصال بقاعدة البيانات

1. تحقق من معلومات الاتصال في ملف `hostinger.config.js`.
2. تأكد من وجود قاعدة البيانات وأن المستخدم لديه صلاحيات كافية.
3. راجع سجلات التطبيق للحصول على رسائل الخطأ المحددة.

### مشكلة: أخطاء في تحميل ملفات JavaScript أو CSS

1. تحقق من وجود جميع الملفات في مجلد `client/dist`.
2. تأكد من تكوين ملف `.htaccess` بشكل صحيح لخدمة نوع MIME المناسب.
3. امسح ذاكرة التخزين المؤقت للمتصفح وأعد تحميل الصفحة.

## المراجع

- [دليل إعداد قاعدة بيانات MySQL على هوستنجر](HOSTINGER-MYSQL-SETUP.md)
- [دليل استكشاف الأخطاء وإصلاحها](../TROUBLESHOOTING-GUIDE.md)
- [سكريبت الإعداد السريع لهوستنجر](../install/scripts/hostinger-quick-setup.sh)
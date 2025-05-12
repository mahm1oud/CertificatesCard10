# دليل نشر تطبيق الشهادات والبطاقات على استضافة Hostinger

## نظرة عامة

هذا الدليل يشرح الخطوات اللازمة لنشر تطبيق الشهادات والبطاقات على استضافة Hostinger. يغطي هذا الدليل الإعداد الأولي، وتهيئة قاعدة البيانات، وتكوين الخادم، والإطلاق النهائي.

## المتطلبات المسبقة

قبل البدء في عملية النشر، تأكد من توفر المتطلبات التالية:

1. **حساب استضافة على Hostinger** مع:
   - دعم Node.js (يفضل الإصدار 18.x أو أحدث)
   - دعم قواعد بيانات MySQL
   - وصول SSH (مضمن في معظم خطط Hostinger Premium و Business)
   - اسم نطاق مسجل ومكون

2. **أدوات التطوير المحلية**:
   - Git
   - Node.js و npm
   - مدير العمليات PM2 (سيتم تثبيته أثناء عملية النشر إذا لم يكن موجودًا)

## خطوات النشر

### 1. إعداد قاعدة البيانات MySQL

1. سجل الدخول إلى لوحة تحكم Hostinger

2. انتقل إلى قسم "قواعد البيانات" وأنشئ قاعدة بيانات MySQL جديدة:
   - اختر اسمًا لقاعدة البيانات (مثلاً `certificates`)
   - أنشئ مستخدمًا جديدًا أو استخدم مستخدمًا موجودًا
   - امنح المستخدم كافة الصلاحيات على قاعدة البيانات

3. لاحظ معلومات الاتصال التالية:
   - اسم المضيف (عادة `localhost` أو `mysql.yourdomain.com`)
   - اسم المستخدم
   - كلمة المرور
   - اسم قاعدة البيانات

### 2. تحضير ملفات المشروع

#### الخيار أ: النشر من الحزمة المجمعة

إذا كنت تستخدم الحزمة المجمعة المنشأة بواسطة سكريبت `build-all.sh`:

1. قم بتشغيل `build-all.sh` لإنشاء حزمة البناء:
   ```bash
   ./build-all.sh
   ```

2. قم بنقل محتويات مجلد `build` إلى خادم Hostinger باستخدام FTP أو SCP:
   ```bash
   scp -r build/* user@yourdomain.com:~/public_html/
   ```

#### الخيار ب: النشر من Git

1. اتصل بخادم Hostinger عبر SSH:
   ```bash
   ssh user@yourdomain.com
   ```

2. انتقل إلى المجلد الذي ستقوم بالنشر فيه:
   ```bash
   cd ~/public_html
   ```

3. استنسخ المستودع:
   ```bash
   git clone https://github.com/yourusername/certificates-app.git .
   ```

4. قم بتثبيت الاعتماديات:
   ```bash
   npm install
   ```

5. قم ببناء المشروع:
   ```bash
   ./build-all.sh
   ```

### 3. تهيئة البيئة

1. أنشئ ملف تكوين Hostinger:
   - إذا كنت تستخدم حزمة البناء المجمعة، قم بنسخ ملف `hostinger.config.js.example` إلى `hostinger.config.js`
   - قم بتحرير الملف وتعيين المعلومات الصحيحة:

   ```javascript
   // hostinger.config.js
   module.exports = {
     database: {
       host: 'localhost',        // اسم مضيف قاعدة البيانات
       port: 3306,               // منفذ MySQL (عادة 3306)
       user: 'your_db_user',     // اسم مستخدم قاعدة البيانات
       password: 'your_db_pass', // كلمة مرور قاعدة البيانات
       database: 'certificates'  // اسم قاعدة البيانات
     },
     server: {
       port: 5000,               // المنفذ الذي سيعمل عليه الخادم
       timeoutSeconds: 30,       // مهلة الطلب (بالثواني)
       maxRequestSize: '10mb'    // الحد الأقصى لحجم الطلب
     },
     application: {
       appUrl: 'https://yourdomain.com', // عنوان URL للتطبيق
       appName: 'منصة الشهادات والبطاقات', // اسم التطبيق
       analyticsEnabled: true,           // تمكين تحليلات المشاهدات
       uploadLimit: 10               // الحد الأقصى لحجم الملفات المرفوعة (ميجابايت)
     },
     logging: {
       level: 'info',            // مستوى التسجيل
       errorTracking: true,      // تتبع الأخطاء
       logDir: 'logs'            // مجلد السجلات
     },
     security: {
       enableCors: true,         // تمكين CORS
       enableCsrf: true,         // تمكين حماية CSRF
       sessionExpiryDays: 7      // مدة صلاحية الجلسة (بالأيام)
     }
   };
   ```

2. قم بتشغيل سكريبت إعداد Hostinger:
   ```bash
   chmod +x install/scripts/hostinger-setup.sh
   ./install/scripts/hostinger-setup.sh
   ```

   هذا السكريبت سيقوم تلقائيًا بما يلي:
   - إنشاء المجلدات اللازمة
   - إعداد ملف `.env` بناءً على `hostinger.config.js`
   - تثبيت PM2 إذا لم يكن موجودًا
   - تكوين Nginx (إذا كان متاحًا)
   - إعداد شهادات SSL (إذا كان متاحًا)
   - بدء تشغيل التطبيق باستخدام PM2

### 4. إعداد تكوين Nginx

إذا كان لديك وصول إلى إعدادات Nginx (متوفر في بعض خطط استضافة Hostinger):

1. أنشئ ملف تكوين Nginx جديد:
   ```bash
   sudo nano /etc/nginx/conf.d/yourdomain.com.conf
   ```

2. أضف التكوين التالي (سيتم إنشاؤه تلقائيًا بواسطة `hostinger-setup.sh` إذا كان لديك صلاحيات sudo):

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       
       # تحويل جميع الطلبات إلى HTTPS
       location / {
           return 301 https://$host$request_uri;
       }
   }

   server {
       listen 443 ssl;
       server_name yourdomain.com www.yourdomain.com;
       
       # تكوين SSL
       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_prefer_server_ciphers on;
       
       # إعدادات الأمان
       add_header X-Frame-Options SAMEORIGIN;
       add_header X-Content-Type-Options nosniff;
       add_header X-XSS-Protection "1; mode=block";
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
       
       # مجلد الجذر للتطبيق
       root /home/username/public_html;
       
       # الملفات الثابتة
       location /static/ {
           alias /home/username/public_html/client/static/;
           expires 30d;
           add_header Cache-Control "public, max-age=2592000";
       }
       
       # ملفات الواجهة الأمامية
       location / {
           try_files $uri $uri/ /index.html;
           expires 1h;
           add_header Cache-Control "public, max-age=3600";
       }
       
       # تمرير طلبات API إلى خادم Node.js
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
       
       # سجلات الوصول والأخطاء
       access_log /home/username/public_html/logs/nginx-access.log;
       error_log /home/username/public_html/logs/nginx-error.log;
   }
   ```

3. قم بالتحقق من صحة التكوين وإعادة تحميل Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 5. إعداد شهادات SSL

إذا لم تكن شهادة SSL قد تم إعدادها بالفعل:

1. قم بتثبيت Certbot إذا لم يكن موجودًا:
   ```bash
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. قم بإنشاء شهادة:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. اتبع التعليمات على الشاشة لإكمال الإعداد

### 6. تشغيل التطبيق باستخدام PM2

1. قم بتثبيت PM2 عالميًا (إذا لم يتم تثبيته بالفعل):
   ```bash
   npm install -g pm2
   ```

2. قم بتشغيل التطبيق:
   ```bash
   pm2 start ecosystem.config.js
   ```

3. تكوين PM2 ليعمل عند إعادة تشغيل النظام:
   ```bash
   pm2 save
   pm2 startup
   ```

4. تحقق من حالة التطبيق:
   ```bash
   pm2 status
   ```

### 7. تشغيل مهام قاعدة البيانات (إذا لزم الأمر)

إذا كنت بحاجة إلى إنشاء جداول قاعدة البيانات وإدراج البيانات الأولية:

1. قم بالانتقال إلى مجلد التطبيق:
   ```bash
   cd ~/public_html
   ```

2. قم بتشغيل سكريبت إنشاء قاعدة البيانات:
   ```bash
   node scripts/setup-mysql.js
   ```

3. إنشاء مستخدم admin افتراضي (إذا لم يكن موجودًا):
   ```bash
   node db/seed.ts
   ```

## اختبار النشر

1. افتح متصفح الويب وانتقل إلى موقع التطبيق: `https://yourdomain.com`

2. تأكد من تحميل الصفحة الرئيسية بشكل صحيح

3. قم بتسجيل الدخول باستخدام المعلومات الافتراضية:
   - اسم المستخدم: `admin`
   - كلمة المرور: `700700`

4. تأكد من تغيير كلمة المرور الافتراضية فورًا بعد تسجيل الدخول

## استكشاف الأخطاء وإصلاحها

### مشكلات الاتصال بقاعدة البيانات

إذا واجهت مشكلات في الاتصال بقاعدة البيانات:

1. تحقق من صحة معلومات الاتصال في `hostinger.config.js` و `.env`

2. تأكد من أن المستخدم يملك صلاحيات كافية للوصول إلى قاعدة البيانات

3. تحقق من سجلات الأخطاء:
   ```bash
   tail -f logs/error.log
   ```

### مشكلات PM2

إذا كان التطبيق لا يعمل بشكل صحيح مع PM2:

1. تحقق من حالة العملية:
   ```bash
   pm2 status
   ```

2. شاهد السجلات:
   ```bash
   pm2 logs certificates-app
   ```

3. إعادة تشغيل العملية:
   ```bash
   pm2 restart certificates-app
   ```

### مشكلات Nginx

إذا كانت طلبات API تفشل أو الصفحات الثابتة لا تظهر:

1. تحقق من سجلات Nginx:
   ```bash
   tail -f logs/nginx-error.log
   ```

2. تأكد من أن Nginx يعمل:
   ```bash
   sudo systemctl status nginx
   ```

3. تحقق من صحة تكوين Nginx:
   ```bash
   sudo nginx -t
   ```

## تحديث التطبيق

لتحديث التطبيق إلى أحدث إصدار:

1. قم بنسخ التغييرات الجديدة:
   ```bash
   git pull origin main
   ```

2. قم بتثبيت أي اعتماديات جديدة:
   ```bash
   npm install
   ```

3. قم بإعادة بناء التطبيق:
   ```bash
   ./build-all.sh
   ```

4. قم بإعادة تشغيل التطبيق:
   ```bash
   pm2 restart certificates-app
   ```

## النسخ الاحتياطي والاستعادة

### إنشاء نسخة احتياطية

1. قم بإنشاء نسخة احتياطية لقاعدة البيانات:
   ```bash
   mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME > backup-$(date +%Y%m%d).sql
   ```

2. قم بإنشاء نسخة احتياطية لملفات التطبيق:
   ```bash
   tar -czf app-backup-$(date +%Y%m%d).tar.gz public_html/
   ```

### استعادة من نسخة احتياطية

1. استعادة قاعدة البيانات:
   ```bash
   mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < backup-file.sql
   ```

2. استعادة ملفات التطبيق:
   ```bash
   tar -xzf app-backup-file.tar.gz
   ```

## الدعم والمساعدة

إذا واجهت أي مشكلة أثناء النشر، يرجى الاطلاع على دليل استكشاف الأخطاء وإصلاحها في الوثائق أو الاتصال بفريق الدعم الفني.

## موارد إضافية

- [توثيق Hostinger](https://www.hostinger.com/tutorials/category/vps)
- [توثيق Node.js](https://nodejs.org/en/docs/)
- [توثيق PM2](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [توثيق Nginx](https://nginx.org/en/docs/)

---

**تاريخ التحديث:** مايو 2025
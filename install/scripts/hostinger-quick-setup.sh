#!/bin/bash

# سكريبت سريع لإعداد التطبيق على هوستنجر
# يقوم هذا السكريبت بإعداد البيئة وتهيئة قاعدة البيانات على هوستنجر
# يجب تشغيل هذا السكريبت في المجلد الرئيسي للمشروع بعد رفع الملفات إلى هوستنجر

# تفعيل وضع تتبع الأخطاء
set -e

# ألوان الطرفية
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# دالة لعرض رسائل نجاح
function success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# دالة لعرض رسائل خطأ
function error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

# دالة لعرض معلومات
function info() {
  echo -e "${BLUE}ℹ️ $1${NC}"
}

# دالة لعرض تحذيرات
function warning() {
  echo -e "${YELLOW}⚠️ $1${NC}"
}

# التأكد من وجود المجلدات الضرورية
function create_directories() {
  info "إنشاء المجلدات الضرورية..."
  
  mkdir -p logs
  mkdir -p uploads
  mkdir -p uploads/certificates
  mkdir -p uploads/templates
  mkdir -p uploads/profiles
  mkdir -p client/static
  
  # ضبط صلاحيات المجلدات للكتابة
  chmod -R 755 logs
  chmod -R 755 uploads
  
  success "تم إنشاء المجلدات وضبط الصلاحيات بنجاح"
}

# التحقق من وجود ملف .htaccess
function setup_htaccess() {
  info "إعداد ملف .htaccess..."
  
  if [ ! -f ".htaccess" ]; then
    cat > .htaccess << EOL
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
EOL
    success "تم إنشاء ملف .htaccess بنجاح"
  else
    success "ملف .htaccess موجود بالفعل"
  fi
}

# إنشاء ملف index.php
function setup_index_php() {
  info "إعداد ملف index.php..."
  
  if [ ! -f "index.php" ]; then
    cat > index.php << EOL
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
\$distPath = __DIR__ . '/client/dist';

// التحقق من وجود مجلد dist
if (!file_exists(\$distPath)) {
    echo 'مجلد الواجهة الأمامية المُجمّعة غير موجود. يرجى تشغيل أمر بناء الواجهة الأمامية.';
    exit;
}

// الحصول على المسار المطلوب
\$requestUri = parse_url(\$_SERVER['REQUEST_URI'], PHP_URL_PATH);

// التحقق من وجود الملف المطلوب مباشرة
\$filePath = \$distPath . \$requestUri;
if (file_exists(\$filePath) && !is_dir(\$filePath)) {
    // تحديد نوع المحتوى بناءً على امتداد الملف
    \$extension = pathinfo(\$filePath, PATHINFO_EXTENSION);
    switch (\$extension) {
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
    if (in_array(\$extension, ['css', 'js', 'png', 'jpg', 'jpeg', 'svg', 'webp', 'woff', 'woff2', 'ttf'])) {
        header('Cache-Control: public, max-age=31536000'); // تخزين مؤقت لمدة سنة
    }
    
    // قراءة وإرسال محتوى الملف
    readfile(\$filePath);
    exit;
}

// إذا كان المسار يبدأ بـ /api، إعادة توجيهه إلى خادم API
if (strpos(\$requestUri, '/api') === 0) {
    // تمت معالجته من خلال .htaccess بالفعل
    exit;
}

// للمسارات الأخرى، قم بتقديم ملف index.html
\$indexPath = \$distPath . '/index.html';
if (file_exists(\$indexPath)) {
    readfile(\$indexPath);
} else {
    echo 'ملف index.html غير موجود في مجلد الواجهة الأمامية.';
}
EOL
    success "تم إنشاء ملف index.php بنجاح"
  else
    success "ملف index.php موجود بالفعل"
  fi
}

# إنشاء ملف hostinger.config.js إذا لم يكن موجودًا
function create_hostinger_config() {
  info "إنشاء ملف إعدادات هوستنجر..."
  
  if [ ! -f "hostinger.config.js" ]; then
    cat > hostinger.config.js << EOL
/**
 * إعدادات الاتصال بقاعدة بيانات MySQL على استضافة هوستنجر
 * يستخدم هذا الملف لتكوين الاتصال مع قاعدة بيانات MySQL في بيئة الإنتاج
 * 
 * النسخة: 1.0 - تاريخ التحديث: 2025-05-04
 */
module.exports = {
  /**
   * إعدادات الاتصال بقاعدة بيانات MySQL
   * يجب تحديث هذه القيم بمعلومات الاتصال الخاصة بك على استضافة هوستنجر
   */
  database: {
    host: 'localhost',
    user: 'اسم_المستخدم',
    password: 'كلمة_المرور',
    name: 'اسم_قاعدة_البيانات',
    port: '3306'
  },
  
  /**
   * إعدادات الخادم
   */
  server: {
    port: 5000,
    host: '0.0.0.0'
  },
  
  /**
   * المسارات ومجلدات التخزين
   */
  paths: {
    uploads: './uploads',
    logs: './logs',
    fonts: './fonts',
    static: './client/static'
  },
  
  /**
   * إعدادات تطبيق Express.js
   */
  express: {
    trustProxy: true,
    compression: true,
    bodyLimit: '10mb'
  },
  
  /**
   * إعدادات التطبيق
   */
  app: {
    baseUrl: 'https://your-domain.com',
    apiPrefix: '/api',
    adminEmail: 'admin@example.com'
  },
  
  /**
   * إعدادات تتبع الأخطاء والتشخيص
   */
  logging: {
    errorLogToFile: true,
    errorLogToDatabase: true,
    errorLogToConsole: true,
    accessLogEnabled: true
  },
  
  /**
   * إعدادات الأمان
   */
  security: {
    sessionSecret: 'استبدل_هذا_بسلسلة_عشوائية_آمنة',
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // أسبوع واحد
    csrfProtection: true
  }
};
EOL
    success "تم إنشاء ملف hostinger.config.js بنجاح"
    warning "يرجى تحديث إعدادات الاتصال بقاعدة البيانات في ملف hostinger.config.js قبل المتابعة"
  else
    success "ملف hostinger.config.js موجود بالفعل"
  fi
}

# إنشاء ملف .env للإنتاج إذا لم يكن موجودًا
function create_env_file() {
  info "إنشاء ملف .env للإنتاج..."
  
  if [ ! -f ".env" ]; then
    cat > .env << EOL
# نوع قاعدة البيانات المستخدمة: mysql أو postgresql
DB_TYPE=mysql

# عنوان الاتصال بقاعدة البيانات - سيتم استخدام معلومات من hostinger.config.js بدلاً من هذا
# DATABASE_URL=mysql://username:password@localhost:3306/database_name

# إعدادات التطبيق
NODE_ENV=production
PORT=5000

# إعدادات أمان لمصادقة OAuth وجلسات المستخدمين
SESSION_SECRET=change_this_to_secure_random_string
EOL
    success "تم إنشاء ملف .env للإنتاج بنجاح"
  else
    success "ملف .env موجود بالفعل"
  fi
}

# تثبيت حزم Node.js
function install_node_packages() {
  info "تثبيت حزم Node.js..."
  
  if command -v npm &> /dev/null; then
    npm install --production
    success "تم تثبيت حزم Node.js بنجاح"
  else
    error "لم يتم العثور على npm. يرجى تثبيت Node.js أولاً"
  fi
}

# بناء تطبيق العميل (React)
function build_client() {
  info "بناء تطبيق العميل (React)..."
  
  if [ -d "client" ]; then
    cd client
    npm install
    npm run build
    cd ..
    success "تم بناء تطبيق العميل بنجاح"
  else
    error "مجلد client غير موجود"
  fi
}

# إعداد قاعدة بيانات MySQL
function setup_mysql() {
  info "إعداد قاعدة بيانات MySQL..."
  
  node scripts/setup-mysql.js
  
  if [ $? -eq 0 ]; then
    success "تم إعداد قاعدة بيانات MySQL بنجاح"
  else
    error "فشل في إعداد قاعدة بيانات MySQL"
  fi
}

# الدالة الرئيسية
function main() {
  echo ""
  echo "================================================================"
  echo "             سكريبت الإعداد السريع على هوستنجر                 "
  echo "                    الإصدار: 1.0.0                              "
  echo "================================================================"
  echo ""
  
  # إنشاء البنية الأساسية
  create_directories
  setup_htaccess
  setup_index_php
  create_hostinger_config
  create_env_file
  
  echo ""
  warning "يرجى تحديث معلومات الاتصال بقاعدة البيانات في ملف hostinger.config.js قبل المتابعة"
  read -p "هل تريد المتابعة؟ (y/n): " confirm
  
  if [[ $confirm != [yY] ]]; then
    echo ""
    info "يمكنك تشغيل السكريبت مرة أخرى بعد تحديث ملف الإعدادات"
    exit 0
  fi
  
  echo ""
  # تثبيت الحزم وبناء التطبيق
  install_node_packages
  build_client
  
  # إعداد قاعدة البيانات
  setup_mysql
  
  echo ""
  echo "================================================================"
  echo "                     تم الإعداد بنجاح!                          "
  echo "================================================================"
  echo ""
  info "لتشغيل التطبيق، قم بتنفيذ الأمر التالي:"
  echo "  npm start"
  echo ""
  info "لتسجيل الدخول إلى النظام، استخدم:"
  echo "  اسم المستخدم: admin"
  echo "  كلمة المرور: 700700"
  echo ""
  warning "يرجى تغيير كلمة مرور المستخدم admin بعد تسجيل الدخول لأول مرة"
  echo ""
}

# تنفيذ السكريبت
main
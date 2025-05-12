#!/bin/bash

# سكريبت إعداد التطبيق على استضافة Hostinger
# النسخة 1.0.0 - تاريخ التحديث: مايو 2025
#
# هذا السكريبت يقوم بإعداد التطبيق بشكل متكامل على استضافة Hostinger، بما في ذلك:
# - تهيئة قاعدة بيانات MySQL
# - إعداد ملفات البيئة (.env)
# - إنشاء المجلدات اللازمة
# - تثبيت PM2 لإدارة الخادم
# - تكوين Nginx (إذا كان متاحًا)
# - إعداد شهادات SSL (إذا كانت متاحة)

# مسار ملف التكوين الخاص بإعدادات Hostinger
HOSTINGER_CONFIG_FILE="hostinger.config.js"

# دالة لعرض رسائل مع الوقت
log() {
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  echo "[$timestamp] $1"
}

# دالة عرض المساعدة
show_help() {
  echo "سكريبت إعداد التطبيق على استضافة Hostinger"
  echo "استخدام: ./hostinger-setup.sh [OPTIONS]"
  echo ""
  echo "الخيارات:"
  echo "  -h, --help            عرض هذه الرسالة المساعدة"
  echo "  -c, --config FILE     تحديد ملف التكوين (الافتراضي: hostinger.config.js)"
  echo "  --clean               حذف الملفات والإعدادات السابقة قبل البدء"
  echo "  --skip-db             تخطي إعداد قاعدة البيانات"
  echo "  --skip-nginx          تخطي تكوين Nginx"
  echo "  --skip-ssl            تخطي إعداد شهادات SSL"
  echo ""
  echo "مثال: ./hostinger-setup.sh --config custom.config.js"
  exit 0
}

# معالجة الخيارات من سطر الأوامر
CLEAN_MODE=0
SKIP_DB=0
SKIP_NGINX=0
SKIP_SSL=0

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      ;;
    -c|--config)
      HOSTINGER_CONFIG_FILE="$2"
      shift 2
      ;;
    --clean)
      CLEAN_MODE=1
      shift
      ;;
    --skip-db)
      SKIP_DB=1
      shift
      ;;
    --skip-nginx)
      SKIP_NGINX=1
      shift
      ;;
    --skip-ssl)
      SKIP_SSL=1
      shift
      ;;
    *)
      echo "❌ خيار غير معروف: $1"
      show_help
      ;;
  esac
done

# التحقق من وجود ملف التكوين
if [ ! -f "$HOSTINGER_CONFIG_FILE" ]; then
  log "❌ ملف التكوين $HOSTINGER_CONFIG_FILE غير موجود"
  log "يرجى نسخ ملف hostinger.config.js.example إلى $HOSTINGER_CONFIG_FILE وتخصيصه"
  exit 1
fi

log "🚀 بدء إعداد التطبيق على استضافة Hostinger"
log "📝 سيتم استخدام ملف التكوين: $HOSTINGER_CONFIG_FILE"

# إنشاء المجلدات اللازمة
log "📁 إنشاء المجلدات اللازمة..."
mkdir -p logs uploads temp fonts client/static public_html

# نقل التكوين من ملف JavaScript إلى متغيرات البيئة
log "🔄 معالجة ملف التكوين..."
if command -v node &> /dev/null; then
  # استخدام Node.js لاستخراج الإعدادات من ملف التكوين
  CONFIG_VALUES=$(node -e "
    const config = require('./$HOSTINGER_CONFIG_FILE');
    console.log('DB_HOST=' + config.database.host);
    console.log('DB_PORT=' + config.database.port);
    console.log('DB_USER=' + config.database.user);
    console.log('DB_PASS=' + config.database.password);
    console.log('DB_NAME=' + config.database.database);
    console.log('SERVER_PORT=' + config.server.port);
    console.log('APP_URL=' + config.application.appUrl);
  ")
  
  # تخزين الإعدادات في متغيرات
  eval "$CONFIG_VALUES"
  
  log "✅ تم استخراج إعدادات التكوين بنجاح"
else
  log "❌ Node.js غير مثبت. لا يمكن معالجة ملف التكوين"
  exit 1
fi

# إعداد قاعدة البيانات MySQL
if [ $SKIP_DB -eq 0 ]; then
  log "🗄️ إعداد قاعدة البيانات MySQL..."
  
  if command -v mysql &> /dev/null; then
    # التحقق من وجود قاعدة البيانات
    DB_EXISTS=$(mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS -e "SHOW DATABASES LIKE '$DB_NAME';" 2>/dev/null | grep -c $DB_NAME)
    
    if [ $DB_EXISTS -eq 0 ]; then
      log "🔄 إنشاء قاعدة البيانات $DB_NAME..."
      mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
      
      if [ $? -eq 0 ]; then
        log "✅ تم إنشاء قاعدة البيانات بنجاح"
        
        # استيراد هيكل قاعدة البيانات
        if [ -f "install/mysql/schema.sql" ]; then
          log "🔄 استيراد هيكل قاعدة البيانات..."
          mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME < install/mysql/schema.sql 2>/dev/null
          
          if [ $? -eq 0 ]; then
            log "✅ تم استيراد هيكل قاعدة البيانات بنجاح"
          else
            log "❌ فشل في استيراد هيكل قاعدة البيانات"
          fi
        else
          log "⚠️ ملف هيكل قاعدة البيانات غير موجود. سيتم إنشاء الجداول تلقائيًا عند بدء التطبيق"
        fi
        
        # استيراد بيانات أولية (إذا وجدت)
        if [ -f "install/mysql/seed.sql" ]; then
          log "🔄 استيراد البيانات الأولية..."
          mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME < install/mysql/seed.sql 2>/dev/null
          
          if [ $? -eq 0 ]; then
            log "✅ تم استيراد البيانات الأولية بنجاح"
          else
            log "❌ فشل في استيراد البيانات الأولية"
          fi
        fi
      else
        log "❌ فشل في إنشاء قاعدة البيانات"
      fi
    else
      log "ℹ️ قاعدة البيانات $DB_NAME موجودة بالفعل"
    fi
  else
    log "⚠️ أداة mysql غير متوفرة. سيتم تخطي إعداد قاعدة البيانات"
    log "يمكنك إعداد قاعدة البيانات يدويًا من خلال لوحة تحكم Hostinger"
  fi
fi

# إنشاء ملف .env
log "📝 إنشاء ملف .env..."
cat > .env << EOF
# تم إنشاء هذا الملف تلقائيًا بواسطة سكريبت إعداد Hostinger
# تاريخ الإنشاء: $(date)

# إعدادات قاعدة البيانات
DATABASE_TYPE=mysql
MYSQL_HOST=$DB_HOST
MYSQL_PORT=$DB_PORT
MYSQL_USER=$DB_USER
MYSQL_PASSWORD=$DB_PASS
MYSQL_DATABASE=$DB_NAME
MYSQL_CONNECTION_LIMIT=10
MYSQL_RETRY_ATTEMPTS=5
MYSQL_RETRY_DELAY=2000
MYSQL_SSL=false
MYSQL_DEBUG=false

# إعدادات الخادم
PORT=$SERVER_PORT
HOST=0.0.0.0
NODE_ENV=production
BASE_PATH=/

# إعدادات المسارات
UPLOADS_DIR=uploads
TEMP_DIR=temp
FONTS_DIR=fonts
LOGS_DIR=logs
STATIC_DIR=client/static

# إعدادات تتبع الأخطاء
LOG_LEVEL=info
ERROR_STORAGE_TYPE=file
MAX_LOG_SIZE=10485760
INCLUDE_USER_INFO=true
TRUNCATE_STACK_TRACE=true
MAX_STACK_FRAMES=20

# إعدادات الجلسات والأمان
SESSION_SECRET=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)
SESSION_NAME=certificates.sid
SESSION_MAX_AGE=604800000
SESSION_SECURE=true
SESSION_SAME_SITE=lax
COOKIE_MAX_AGE=604800000

# إعدادات التطبيق
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=700700
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_NAME=مدير النظام

# إعدادات CORS
ENABLE_CORS=true
CORS_ORIGIN=$APP_URL
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE

# إعدادات أمان إضافية
JWT_SECRET=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)
JWT_EXPIRES_IN=7d
CSRF_ENABLED=true
CSRF_COOKIE_NAME=csrf-token
CSRF_SECRET=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)
SECURITY_HEADERS_ENABLED=true
XSS_PROTECTION=true
CONTENT_TYPE_OPTIONS=true
EOF

log "✅ تم إنشاء ملف .env بنجاح"

# تثبيت واجهة سطر الأوامر العالمية لـ PM2 إذا لم تكن متوفرة بالفعل
if ! command -v pm2 &> /dev/null; then
  log "🔄 تثبيت PM2 عالميًا..."
  npm install -g pm2
  
  if [ $? -eq 0 ]; then
    log "✅ تم تثبيت PM2 بنجاح"
  else
    log "❌ فشل في تثبيت PM2"
    log "يرجى تثبيت PM2 يدويًا باستخدام: npm install -g pm2"
  fi
else
  log "ℹ️ PM2 مثبت بالفعل"
fi

# نسخ ملف تكوين PM2
if [ -f "install/config/ecosystem.config.js" ]; then
  log "🔄 نسخ ملف تكوين PM2..."
  cp install/config/ecosystem.config.js .
  log "✅ تم نسخ ملف تكوين PM2 بنجاح"
fi

# إعداد Nginx (إذا كان متاحًا وغير مخطى)
if [ $SKIP_NGINX -eq 0 ] && command -v nginx &> /dev/null; then
  log "🔄 تكوين Nginx..."
  
  # إنشاء ملف تكوين Nginx
  NGINX_CONF_DIR="/etc/nginx/conf.d"
  if [ -d "$NGINX_CONF_DIR" ]; then
    # توليد اسم مضيف من APP_URL
    APP_HOST=$(echo $APP_URL | sed -e 's|^[^/]*//||' -e 's|/.*$||')
    
    log "🔄 إنشاء ملف تكوين Nginx للمضيف: $APP_HOST"
    
    sudo bash -c "cat > $NGINX_CONF_DIR/$APP_HOST.conf << EOF
server {
    listen 80;
    server_name $APP_HOST;
    
    # تحويل جميع الطلبات إلى HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $APP_HOST;
    
    # تكوين SSL
    ssl_certificate /etc/letsencrypt/live/$APP_HOST/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$APP_HOST/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    # إعدادات الأمان
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection \"1; mode=block\";
    add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;
    
    # مجلد الجذر للتطبيق
    root $(pwd)/public_html;
    
    # الملفات الثابتة
    location /static/ {
        alias $(pwd)/client/static/;
        expires 30d;
        add_header Cache-Control \"public, max-age=2592000\";
    }
    
    # ملفات الواجهة الأمامية
    location / {
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control \"public, max-age=3600\";
    }
    
    # تمرير طلبات API إلى خادم Node.js
    location /api/ {
        proxy_pass http://localhost:$SERVER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # سجلات الوصول والأخطاء
    access_log $(pwd)/logs/nginx-access.log;
    error_log $(pwd)/logs/nginx-error.log;
}
EOF"
    
    # إعادة تحميل تكوين Nginx
    if [ $? -eq 0 ]; then
      log "✅ تم إنشاء ملف تكوين Nginx بنجاح"
      
      sudo nginx -t
      if [ $? -eq 0 ]; then
        sudo systemctl reload nginx
        log "✅ تم إعادة تحميل تكوين Nginx بنجاح"
      else
        log "❌ تكوين Nginx غير صالح. يرجى التحقق من ملف التكوين"
      fi
    else
      log "❌ فشل في إنشاء ملف تكوين Nginx"
    fi
  else
    log "⚠️ مجلد تكوين Nginx غير موجود. يرجى تكوين Nginx يدويًا"
  fi
else
  log "⚠️ Nginx غير متوفر أو تم تخطيه. تخطي تكوين Nginx"
fi

# إعداد شهادات SSL (إذا كان متاحًا وغير مخطى)
if [ $SKIP_SSL -eq 0 ] && command -v certbot &> /dev/null; then
  log "🔄 إعداد شهادات SSL باستخدام Certbot..."
  
  # استخراج اسم المضيف من APP_URL
  APP_HOST=$(echo $APP_URL | sed -e 's|^[^/]*//||' -e 's|/.*$||')
  
  # طلب شهادة SSL جديدة
  sudo certbot --nginx -d $APP_HOST
  
  if [ $? -eq 0 ]; then
    log "✅ تم إعداد شهادات SSL بنجاح"
  else
    log "❌ فشل في إعداد شهادات SSL"
    log "يرجى تجربة إعداد شهادات SSL يدويًا باستخدام: sudo certbot --nginx -d $APP_HOST"
  fi
else
  log "⚠️ Certbot غير متوفر أو تم تخطيه. تخطي إعداد شهادات SSL"
fi

# إنشاء رابط رمزي لاستضافة الملفات الثابتة
log "🔄 إنشاء روابط رمزية للملفات الثابتة..."
ln -sf $(pwd)/client/dist/* $(pwd)/public_html/
log "✅ تم إنشاء روابط رمزية للملفات الثابتة بنجاح"

# بدء التطبيق باستخدام PM2
log "🚀 بدء تشغيل التطبيق باستخدام PM2..."
pm2 start ecosystem.config.js

if [ $? -eq 0 ]; then
  log "✅ تم بدء تشغيل التطبيق بنجاح"
  
  # حفظ تكوين PM2 لاستعادته عند إعادة التشغيل
  pm2 save
  
  # تكوين PM2 ليبدأ تلقائيًا عند إعادة تشغيل النظام (إذا كان المستخدم جذرًا)
  if [ $(id -u) -eq 0 ]; then
    pm2 startup
    log "✅ تم تكوين PM2 للبدء تلقائيًا عند إعادة تشغيل النظام"
  else
    log "⚠️ يجب أن تكون المستخدم الجذر لتكوين PM2 للبدء تلقائيًا عند إعادة تشغيل النظام"
    log "يمكنك تشغيل الأمر التالي يدويًا: sudo pm2 startup"
  fi
else
  log "❌ فشل في بدء تشغيل التطبيق"
  log "يرجى تحقق من السجلات في مجلد logs للحصول على المزيد من المعلومات"
fi

log "🎉 تم اكتمال إعداد التطبيق على استضافة Hostinger!"
log "🌐 يمكن الوصول إلى التطبيق على: $APP_URL"
log "🔐 معلومات تسجيل الدخول الافتراضية:"
log "   اسم المستخدم: admin"
log "   كلمة المرور: 700700"
log "⚠️ يرجى تغيير كلمة المرور الافتراضية بعد تسجيل الدخول لأول مرة"
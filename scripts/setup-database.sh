#!/bin/bash
# سكريبت إعداد قاعدة البيانات وإنشاء الجداول والمستخدم الأول
# استخدم هذا السكريبت عند التثبيت الأولي أو عند إعادة تهيئة قاعدة البيانات

# ألوان للطباعة
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# دالة للطباعة الملونة
print() {
  local color="$1"
  local message="$2"
  echo -e "${color}${message}${NC}"
}

# التأكد من أن السكريبت يعمل من المجلد الرئيسي للمشروع
if [ ! -f "package.json" ]; then
  print "$RED" "خطأ: يجب تشغيل السكريبت من المجلد الرئيسي للمشروع"
  exit 1
fi

# التحقق من وجود ملف .env
print "$BLUE" "التحقق من وجود ملف .env..."
if [ ! -f ".env" ]; then
  print "$YELLOW" "ملف .env غير موجود. جاري إنشاء ملف افتراضي..."
  
  # إنشاء ملف .env افتراضي
  cat > .env << EOF
# بيئة التشغيل: development أو production
NODE_ENV=development

# منفذ التشغيل
PORT=5000

# نوع قاعدة البيانات: mysql أو postgres
DB_TYPE=mysql

# إعدادات قاعدة البيانات المشتركة (للـ PostgreSQL)
# DATABASE_URL=postgresql://username:password@localhost:5432/certificates_db

# إعدادات MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=certificates_db
DB_CONNECTION_LIMIT=10

# مسارات المجلدات
UPLOADS_DIR=uploads
TEMP_DIR=temp
LOGS_DIR=logs
FONTS_DIR=fonts

# إعدادات الأمان
SESSION_SECRET=$(openssl rand -hex 32)

# المضيفين المسموح بهم للطلبات (مفصولين بفواصل)
ALLOWED_ORIGINS=*
EOF

  print "$GREEN" "تم إنشاء ملف .env افتراضي. قم بتعديله حسب إعداداتك."
else
  print "$GREEN" "ملف .env موجود بالفعل."
fi

# التحقق من وجود ملف hostinger.config.js
print "$BLUE" "التحقق من وجود ملف hostinger.config.js..."
if [ ! -f "hostinger.config.js" ]; then
  print "$YELLOW" "ملف hostinger.config.js غير موجود. جاري إنشاء ملف افتراضي..."
  
  # استخراج قيم من ملف .env
  DB_TYPE=$(grep "DB_TYPE" .env | cut -d '=' -f2)
  DB_HOST=$(grep "DB_HOST" .env | cut -d '=' -f2)
  DB_PORT=$(grep "DB_PORT" .env | cut -d '=' -f2)
  DB_USER=$(grep "DB_USER" .env | cut -d '=' -f2)
  DB_PASSWORD=$(grep "DB_PASSWORD" .env | cut -d '=' -f2)
  DB_NAME=$(grep "DB_NAME" .env | cut -d '=' -f2)
  PORT=$(grep "PORT" .env | cut -d '=' -f2)
  SESSION_SECRET=$(grep "SESSION_SECRET" .env | cut -d '=' -f2)
  
  # إنشاء ملف hostinger.config.js
  cat > hostinger.config.js << EOF
/**
 * إعدادات استضافة هوستنجر
 * تم إنشاء هذا الملف تلقائيًا بواسطة سكريبت الإعداد
 * آخر تحديث: $(date)
 */

module.exports = {
  // إعدادات قاعدة البيانات
  database: {
    type: '${DB_TYPE}',
    host: '${DB_HOST}',
    port: ${DB_PORT},
    user: '${DB_USER}',
    password: '${DB_PASSWORD}',
    name: '${DB_NAME}',
    connectionLimit: 10
  },
  
  // إعدادات الخادم
  server: {
    port: ${PORT},
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
    sessionSecret: '${SESSION_SECRET}'
  },
  
  // إعدادات API
  api: {
    allowedOrigins: ['*']
  }
};
EOF

  print "$GREEN" "تم إنشاء ملف hostinger.config.js افتراضي."
else
  print "$GREEN" "ملف hostinger.config.js موجود بالفعل."
fi

# إنشاء المجلدات اللازمة
print "$BLUE" "إنشاء المجلدات اللازمة..."
mkdir -p uploads temp logs fonts
print "$GREEN" "تم إنشاء المجلدات اللازمة."

# التحقق من نوع قاعدة البيانات
DB_TYPE=$(grep "DB_TYPE" .env | cut -d '=' -f2 | tr -d '\r')
if [ "$DB_TYPE" = "mysql" ]; then
  print "$BLUE" "نوع قاعدة البيانات: MySQL"
  
  # التحقق من وجود ملف التثبيت MySQL
  if [ ! -f "certificates_database.sql" ]; then
    print "$RED" "خطأ: ملف certificates_database.sql غير موجود!"
    exit 1
  fi
  
  # السؤال عن تثبيت قاعدة البيانات
  print "$YELLOW" "هل ترغب في تثبيت قاعدة البيانات MySQL؟ (y/n)"
  read -r install_db
  
  if [ "$install_db" = "y" ] || [ "$install_db" = "Y" ]; then
    # استخراج معلومات قاعدة البيانات
    DB_HOST=$(grep "DB_HOST" .env | cut -d '=' -f2 | tr -d '\r')
    DB_PORT=$(grep "DB_PORT" .env | cut -d '=' -f2 | tr -d '\r')
    DB_USER=$(grep "DB_USER" .env | cut -d '=' -f2 | tr -d '\r')
    DB_PASSWORD=$(grep "DB_PASSWORD" .env | cut -d '=' -f2 | tr -d '\r')
    DB_NAME=$(grep "DB_NAME" .env | cut -d '=' -f2 | tr -d '\r')
    
    # إنشاء قاعدة البيانات
    print "$BLUE" "جاري إنشاء قاعدة البيانات ${DB_NAME}..."
    
    # السؤال إذا كنت تريد استخدام كلمة مرور في الأمر
    MYSQL_PWD_ARG=""
    if [ -n "$DB_PASSWORD" ]; then
      MYSQL_PWD_ARG="-p$DB_PASSWORD"
    fi
    
    # إنشاء قاعدة البيانات إذا لم تكن موجودة
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $MYSQL_PWD_ARG -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
      print "$GREEN" "تم إنشاء قاعدة البيانات بنجاح."
      
      # استيراد هيكل قاعدة البيانات
      print "$BLUE" "جاري استيراد هيكل قاعدة البيانات من certificates_database.sql..."
      mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $MYSQL_PWD_ARG "$DB_NAME" < certificates_database.sql 2>/dev/null
      
      if [ $? -eq 0 ]; then
        print "$GREEN" "تم استيراد هيكل قاعدة البيانات بنجاح."
      else
        print "$RED" "خطأ في استيراد هيكل قاعدة البيانات."
      fi
    else
      print "$RED" "خطأ في إنشاء قاعدة البيانات."
    fi
  else
    print "$YELLOW" "تم تخطي تثبيت قاعدة البيانات."
  fi
elif [ "$DB_TYPE" = "postgres" ]; then
  print "$BLUE" "نوع قاعدة البيانات: PostgreSQL"
  
  # التحقق من وجود ملف التثبيت PostgreSQL
  if [ ! -f "certificates_database_pg.sql" ]; then
    print "$RED" "خطأ: ملف certificates_database_pg.sql غير موجود!"
    exit 1
  fi
  
  # السؤال عن تثبيت قاعدة البيانات
  print "$YELLOW" "هل ترغب في تثبيت قاعدة البيانات PostgreSQL؟ (y/n)"
  read -r install_db
  
  if [ "$install_db" = "y" ] || [ "$install_db" = "Y" ]; then
    # التحقق من وجود DATABASE_URL
    DATABASE_URL=$(grep "DATABASE_URL" .env | cut -d '=' -f2- | tr -d '\r')
    
    if [ -n "$DATABASE_URL" ]; then
      print "$BLUE" "جاري استخدام DATABASE_URL للاتصال بقاعدة البيانات..."
      
      # إنشاء قاعدة البيانات واستيراد الهيكل
      print "$BLUE" "جاري استيراد هيكل قاعدة البيانات من certificates_database_pg.sql..."
      psql "$DATABASE_URL" -f certificates_database_pg.sql 2>/dev/null
      
      if [ $? -eq 0 ]; then
        print "$GREEN" "تم استيراد هيكل قاعدة البيانات بنجاح."
      else
        print "$RED" "خطأ في استيراد هيكل قاعدة البيانات."
      fi
    else
      # استخراج معلومات قاعدة البيانات
      DB_HOST=$(grep "DB_HOST" .env | cut -d '=' -f2 | tr -d '\r')
      DB_PORT=$(grep "DB_PORT" .env | cut -d '=' -f2 | tr -d '\r')
      DB_USER=$(grep "DB_USER" .env | cut -d '=' -f2 | tr -d '\r')
      DB_PASSWORD=$(grep "DB_PASSWORD" .env | cut -d '=' -f2 | tr -d '\r')
      DB_NAME=$(grep "DB_NAME" .env | cut -d '=' -f2 | tr -d '\r')
      
      # إنشاء قاعدة البيانات
      print "$BLUE" "جاري إنشاء قاعدة البيانات ${DB_NAME}..."
      
      PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME WITH ENCODING='UTF8';" 2>/dev/null
      
      if [ $? -eq 0 ]; then
        print "$GREEN" "تم إنشاء قاعدة البيانات بنجاح."
        
        # استيراد هيكل قاعدة البيانات
        print "$BLUE" "جاري استيراد هيكل قاعدة البيانات من certificates_database_pg.sql..."
        PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f certificates_database_pg.sql 2>/dev/null
        
        if [ $? -eq 0 ]; then
          print "$GREEN" "تم استيراد هيكل قاعدة البيانات بنجاح."
        else
          print "$RED" "خطأ في استيراد هيكل قاعدة البيانات."
        fi
      else
        print "$RED" "خطأ في إنشاء قاعدة البيانات."
      fi
    fi
  else
    print "$YELLOW" "تم تخطي تثبيت قاعدة البيانات."
  fi
else
  print "$RED" "نوع قاعدة البيانات غير معروف: $DB_TYPE"
  exit 1
fi

# التحقق من الاتصال بقاعدة البيانات
print "$BLUE" "التحقق من اتصال قاعدة البيانات..."
npx tsx scripts/check-db-connection.ts

# إنشاء مستخدم admin
print "$BLUE" "إنشاء مستخدم admin..."
npx tsx scripts/update-admin-password.ts

print "$GREEN" "تم اكتمال عملية الإعداد بنجاح!"
print "$YELLOW" "يمكنك الآن تشغيل التطبيق باستخدام أحد الأوامر التالية:"
print "$YELLOW" "  npm run dev          # تشغيل المشروع التقليدي"
print "$YELLOW" "  npm run dev:unified  # تشغيل المشروع الموحد"
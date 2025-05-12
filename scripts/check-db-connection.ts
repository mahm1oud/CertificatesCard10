/**
 * سكريبت التحقق من اتصال قاعدة البيانات
 * 
 * استخدام السكريبت:
 * npx tsx scripts/check-db-connection.ts
 */

import { checkDatabaseConnection } from '../server/lib/db-adapter';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// تحميل ملف .env
dotenv.config();

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m'
};

// دالة طباعة ملونة
function print(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// وظيفة لإظهار معلومات صحة قاعدة البيانات
async function showDatabaseHealth() {
  // التحقق من إعدادات قاعدة البيانات
  print('\n=== معلومات اتصال قاعدة البيانات ===', 'blue');
  
  let dbType: string = process.env.DB_TYPE || 'mysql';
  let envFileExists = fs.existsSync(path.join(process.cwd(), '.env'));
  let hostingerConfigExists = fs.existsSync(path.join(process.cwd(), 'hostinger.config.js'));
  
  // معلومات عن ملفات التكوين
  print(`ملف .env: ${envFileExists ? '✓ موجود' : '✗ غير موجود'}`, envFileExists ? 'green' : 'red');
  print(`ملف hostinger.config.js: ${hostingerConfigExists ? '✓ موجود' : '✗ غير موجود'}`, hostingerConfigExists ? 'green' : 'yellow');
  
  let dbSettings: Record<string, string> = {
    النوع: dbType,
    المضيف: process.env.DB_HOST || 'غير محدد',
    المنفذ: process.env.DB_PORT || 'غير محدد',
    المستخدم: process.env.DB_USER || 'غير محدد',
    'قاعدة البيانات': process.env.DB_NAME || 'غير محدد'
  };
  
  // عرض إعدادات قاعدة البيانات الحالية
  print('\n--- إعدادات قاعدة البيانات الحالية ---', 'blue');
  for (const [key, value] of Object.entries(dbSettings)) {
    print(`${key}: ${value}`, value !== 'غير محدد' ? 'green' : 'yellow');
  }

  // التحقق من اتصال قاعدة البيانات
  print('\n--- اختبار الاتصال ---', 'blue');
  
  try {
    print('جاري التحقق من اتصال قاعدة البيانات...', 'yellow');
    const isConnected = await checkDatabaseConnection();
    
    if (isConnected) {
      print('✅ تم الاتصال بقاعدة البيانات بنجاح!', 'green');
    } else {
      print('❌ فشل الاتصال بقاعدة البيانات!', 'red');
    }
  } catch (error) {
    print(`❌ خطأ أثناء التحقق من اتصال قاعدة البيانات: ${error}`, 'red');
  }

  // التحقق من وجود جداول قاعدة البيانات
  if (dbType === 'mysql') {
    try {
      // محاولة تشغيل أمر mysql لعرض الجداول
      print('\n--- جداول قاعدة البيانات ---', 'blue');
      print('محاولة الاتصال بـ MySQL لعرض الجداول...', 'yellow');
      
      if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
        try {
          const command = `mysql -h ${process.env.DB_HOST} -u ${process.env.DB_USER} ${process.env.DB_PASSWORD ? `-p${process.env.DB_PASSWORD}` : ''} -e "SHOW TABLES FROM ${process.env.DB_NAME}" -s 2>/dev/null`;
          const stdout = execSync(command, { encoding: 'utf8' });
          
          if (stdout.trim()) {
            print('الجداول الموجودة في قاعدة البيانات:', 'green');
            stdout.split('\n').filter(line => line.trim()).forEach(table => {
              print(`- ${table}`, 'green');
            });
          } else {
            print('لا توجد جداول في قاعدة البيانات!', 'yellow');
          }
        } catch (error) {
          print('❌ فشل في الاتصال بـ MySQL لعرض الجداول. تأكد من تثبيت MySQL Client.', 'red');
        }
      } else {
        print('❌ معلومات اتصال MySQL غير كاملة. لا يمكن عرض الجداول.', 'red');
      }
    } catch (error) {
      // تجاهل الخطأ
    }
  } else if (dbType === 'postgres') {
    try {
      // محاولة تشغيل أمر psql لعرض الجداول
      print('\n--- جداول قاعدة البيانات ---', 'blue');
      print('محاولة الاتصال بـ PostgreSQL لعرض الجداول...', 'yellow');
      
      if (process.env.DATABASE_URL) {
        try {
          const command = `psql "${process.env.DATABASE_URL}" -c "\\dt" -t 2>/dev/null`;
          const stdout = execSync(command, { encoding: 'utf8' });
          
          if (stdout.trim()) {
            print('الجداول الموجودة في قاعدة البيانات:', 'green');
            stdout.split('\n').filter(line => line.trim()).forEach(tableLine => {
              const table = tableLine.trim().split('|')[0].trim();
              if (table) {
                print(`- ${table}`, 'green');
              }
            });
          } else {
            print('لا توجد جداول في قاعدة البيانات!', 'yellow');
          }
        } catch (error) {
          print('❌ فشل في الاتصال بـ PostgreSQL لعرض الجداول. تأكد من تثبيت psql Client.', 'red');
        }
      } else {
        print('❌ متغير DATABASE_URL غير محدد. لا يمكن عرض الجداول.', 'red');
      }
    } catch (error) {
      // تجاهل الخطأ
    }
  }

  // نصائح لإصلاح مشكلات الاتصال
  print('\n--- نصائح لإصلاح مشكلات الاتصال ---', 'blue');
  print('1. تأكد من تشغيل خدمة قاعدة البيانات', 'yellow');
  print('2. تأكد من صحة معلومات الاتصال في ملف .env وhostinger.config.js', 'yellow');
  print('3. تأكد من وجود قاعدة البيانات وإنشائها مسبقًا', 'yellow');
  print('4. تأكد من أن المستخدم لديه صلاحيات الوصول إلى قاعدة البيانات', 'yellow');
  print('5. قم بتشغيل سكريبت إنشاء قاعدة البيانات: npm run db:setup', 'yellow');
}

// الدالة الرئيسية
async function main() {
  try {
    await showDatabaseHealth();
  } catch (error) {
    console.error('❌ خطأ غير متوقع:', error);
    process.exit(1);
  }
}

// تنفيذ السكريبت
main().catch(console.error);
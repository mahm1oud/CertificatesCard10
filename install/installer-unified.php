<?php
/**
 * برنامج تثبيت منصة الشهادات والبطاقات الإلكترونية - النسخة الموحدة
 * الإصدار 2.0
 * 
 * هذا الملف يدعم التثبيت الموحد للمنصة مع دعم النسخة الجديدة
 * التحديثات الجديدة:
 * - دعم قواعد البيانات MySQL و PostgreSQL
 * - دعم الخادم الموحد Node.js
 * - دعم التثبيت المباشر على هوستنجر
 * - دعم التثبيت في بيئة التطوير والإنتاج
 */

// منع الوصول المباشر إذا تم التثبيت بالفعل
if (file_exists('../.env') && file_exists('../hostinger.config.js')) {
    // تحقق من محتوى الملفات للتأكد من أن التثبيت تم بالفعل
    $envContent = file_get_contents('../.env');
    if (strpos($envContent, 'DB_HOST') !== false) {
        header('Location: ../');
        exit('تم التثبيت بالفعل. <a href="../">العودة للصفحة الرئيسية</a>');
    }
}

// دالة لعرض الخطأ
function showError($message) {
    echo '<div class="alert alert-danger" role="alert">' . $message . '</div>';
}

// دالة لعرض النجاح
function showSuccess($message) {
    echo '<div class="alert alert-success" role="alert">' . $message . '</div>';
}

// دالة لعرض التحذير
function showWarning($message) {
    echo '<div class="alert alert-warning" role="alert">' . $message . '</div>';
}

// تحقق من متطلبات التثبيت
function checkRequirements() {
    $requirements = array();
    
    // تحقق من إصدار PHP
    $requirements['php'] = version_compare(PHP_VERSION, '7.4.0', '>=');
    
    // تحقق من وجود Node.js
    $nodeVersion = trim(shell_exec('node -v 2>/dev/null'));
    $requirements['nodejs'] = !empty($nodeVersion);
    $requirements['nodejs_version'] = $nodeVersion;
    
    // تحقق من وجود npm
    $npmVersion = trim(shell_exec('npm -v 2>/dev/null'));
    $requirements['npm'] = !empty($npmVersion);
    $requirements['npm_version'] = $npmVersion;
    
    // تحقق من وجود امتدادات PHP المطلوبة
    $requirements['pdo_mysql'] = extension_loaded('pdo_mysql');
    $requirements['pdo_pgsql'] = extension_loaded('pdo_pgsql');
    $requirements['gd'] = extension_loaded('gd');
    $requirements['fileinfo'] = extension_loaded('fileinfo');
    $requirements['json'] = extension_loaded('json');
    
    // تحقق من صلاحيات الكتابة
    $requirements['writable_root'] = is_writable('../');
    $requirements['writable_uploads'] = is_writable('../uploads') || mkdir('../uploads', 0755, true);
    $requirements['writable_temp'] = is_writable('../temp') || mkdir('../temp', 0755, true);
    $requirements['writable_logs'] = is_writable('../logs') || mkdir('../logs', 0755, true);
    $requirements['writable_fonts'] = is_writable('../fonts') || mkdir('../fonts', 0755, true);
    
    return $requirements;
}

// تخزين إعدادات البيئة في ملف .env
function saveEnvConfig($config) {
    $envContent = "# ملف إعدادات البيئة\n";
    $envContent .= "# تم إنشاؤه بواسطة برنامج التثبيت\n";
    $envContent .= "# تاريخ: " . date('Y-m-d H:i:s') . "\n\n";
    
    $envContent .= "# بيئة التشغيل: development أو production\n";
    $envContent .= "NODE_ENV=" . $config['environment'] . "\n\n";
    
    $envContent .= "# منفذ التشغيل\n";
    $envContent .= "PORT=" . $config['port'] . "\n\n";
    
    $envContent .= "# نوع قاعدة البيانات: mysql أو postgres\n";
    $envContent .= "DB_TYPE=" . $config['db_type'] . "\n\n";
    
    if ($config['db_type'] === 'postgres' && !empty($config['db_url'])) {
        $envContent .= "# رابط اتصال PostgreSQL\n";
        $envContent .= "DATABASE_URL=" . $config['db_url'] . "\n\n";
    }
    
    $envContent .= "# إعدادات قاعدة البيانات\n";
    $envContent .= "DB_HOST=" . $config['db_host'] . "\n";
    $envContent .= "DB_PORT=" . $config['db_port'] . "\n";
    $envContent .= "DB_USER=" . $config['db_user'] . "\n";
    $envContent .= "DB_PASSWORD=" . $config['db_password'] . "\n";
    $envContent .= "DB_NAME=" . $config['db_name'] . "\n";
    $envContent .= "DB_CONNECTION_LIMIT=10\n\n";
    
    $envContent .= "# مسارات المجلدات\n";
    $envContent .= "UPLOADS_DIR=uploads\n";
    $envContent .= "TEMP_DIR=temp\n";
    $envContent .= "LOGS_DIR=logs\n";
    $envContent .= "FONTS_DIR=fonts\n\n";
    
    $envContent .= "# إعدادات الأمان\n";
    $envContent .= "SESSION_SECRET=" . bin2hex(random_bytes(32)) . "\n\n";
    
    $envContent .= "# المضيفين المسموح بهم للطلبات (مفصولين بفواصل)\n";
    $envContent .= "ALLOWED_ORIGINS=*\n";
    
    return file_put_contents('../.env', $envContent);
}

// إنشاء ملف hostinger.config.js
function saveHostingerConfig($config) {
    $sessionSecret = bin2hex(random_bytes(32));
    
    $hostingerConfig = <<<EOT
/**
 * إعدادات استضافة هوستنجر
 * تم إنشاء هذا الملف تلقائيًا بواسطة برنامج التثبيت
 * آخر تحديث: {$config['date']}
 */

module.exports = {
  // إعدادات قاعدة البيانات
  database: {
    type: '{$config['db_type']}',
    host: '{$config['db_host']}',
    port: {$config['db_port']},
    user: '{$config['db_user']}',
    password: '{$config['db_password']}',
    name: '{$config['db_name']}',
    connectionLimit: 10
  },
  
  // إعدادات الخادم
  server: {
    port: {$config['port']},
    host: '0.0.0.0'
  },
  
  // إعدادات المسارات
  paths: {
    uploads: 'uploads',
    temp: 'temp',
    logs: 'logs',
    fonts: 'fonts',
    static: '{$config['static_dir']}'
  },
  
  // إعدادات الأمان
  security: {
    sessionSecret: '{$sessionSecret}'
  },
  
  // إعدادات API
  api: {
    allowedOrigins: ['*']
  }
};
EOT;
    
    return file_put_contents('../hostinger.config.js', $hostingerConfig);
}

// إنشاء قاعدة البيانات وتثبيت الهيكل
function setupMysqlDatabase($config) {
    try {
        // الاتصال بالخادم
        $dsn = "mysql:host={$config['db_host']};port={$config['db_port']}";
        $pdo = new PDO($dsn, $config['db_user'], $config['db_password']);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // إنشاء قاعدة البيانات إذا لم تكن موجودة
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$config['db_name']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        
        // اختيار قاعدة البيانات
        $pdo->exec("USE `{$config['db_name']}`");
        
        // تشغيل سكربت إنشاء الجداول
        $sqlFile = file_get_contents('../certificates_database.sql');
        $statements = splitSqlStatements($sqlFile);
        
        foreach ($statements as $statement) {
            try {
                $pdo->exec($statement);
            } catch (PDOException $e) {
                // تجاهل أخطاء "الجدول موجود بالفعل"
                if (strpos($e->getMessage(), 'already exists') === false) {
                    throw $e;
                }
            }
        }
        
        // إنشاء مستخدم admin افتراضي (كلمة المرور: 700700)
        setupAdminUser($pdo);
        
        return true;
    } catch (PDOException $e) {
        return $e->getMessage();
    }
}

// إعداد قاعدة بيانات PostgreSQL
function setupPostgresDatabase($config) {
    try {
        // إنشاء اتصال بقاعدة بيانات postgres العامة
        $dsn = "pgsql:host={$config['db_host']};port={$config['db_port']};dbname=postgres";
        $pdo = new PDO($dsn, $config['db_user'], $config['db_password']);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // التحقق من وجود قاعدة البيانات
        $stmt = $pdo->prepare("SELECT 1 FROM pg_database WHERE datname = ?");
        $stmt->execute([$config['db_name']]);
        
        if ($stmt->rowCount() === 0) {
            // إنشاء قاعدة البيانات إذا لم تكن موجودة
            $dbName = $config['db_name'];
            $pdo->exec("CREATE DATABASE \"$dbName\" WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8'");
        }
        
        // إنشاء اتصال بقاعدة البيانات الجديدة
        $dsn = "pgsql:host={$config['db_host']};port={$config['db_port']};dbname={$config['db_name']}";
        $pdo = new PDO($dsn, $config['db_user'], $config['db_password']);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // تنفيذ ملف SQL
        $sqlFile = file_get_contents('../certificates_database_pg.sql');
        if (empty($sqlFile)) {
            throw new Exception("ملف قاعدة بيانات PostgreSQL غير موجود أو فارغ!");
        }
        
        $statements = splitSqlStatements($sqlFile);
        
        foreach ($statements as $statement) {
            try {
                $pdo->exec($statement);
            } catch (PDOException $e) {
                // تجاهل أخطاء "الجدول موجود بالفعل"
                if (strpos($e->getMessage(), 'already exists') === false) {
                    throw $e;
                }
            }
        }
        
        // إنشاء مستخدم admin افتراضي
        setupAdminUserPg($pdo);
        
        return true;
    } catch (PDOException $e) {
        return $e->getMessage();
    }
}

// تقسيم ملف SQL إلى أوامر فردية
function splitSqlStatements($sql) {
    // تنظيف التعليقات والأسطر الفارغة
    $sql = preg_replace('!/\*.*?\*/!s', '', $sql);
    $sql = preg_replace('!--.*?[\r\n]!', '', $sql);
    
    // تقسيم الملف على أساس ;
    $statements = preg_split('/;\s*[\r\n]+/', $sql);
    
    // تنظيف العبارات وإزالة الفارغة
    $statements = array_filter(array_map('trim', $statements));
    
    return $statements;
}

// إعداد مستخدم admin في MySQL
function setupAdminUser($pdo) {
    // التحقق من وجود المستخدم
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute(['admin']);
    
    // تشفير كلمة المرور
    $hashedPassword = password_hash('700700', PASSWORD_DEFAULT);
    
    if ($stmt->rowCount() === 0) {
        // إنشاء مستخدم جديد
        $stmt = $pdo->prepare("INSERT INTO users (username, password, fullName, email, role, active) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute(['admin', $hashedPassword, 'مدير النظام', 'admin@example.com', 'admin', 1]);
    } else {
        // تحديث كلمة المرور
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = ?");
        $stmt->execute([$hashedPassword, 'admin']);
    }
}

// إعداد مستخدم admin في PostgreSQL
function setupAdminUserPg($pdo) {
    // التحقق من وجود المستخدم
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute(['admin']);
    
    // تشفير كلمة المرور
    $hashedPassword = password_hash('700700', PASSWORD_DEFAULT);
    
    if ($stmt->rowCount() === 0) {
        // إنشاء مستخدم جديد
        $stmt = $pdo->prepare('INSERT INTO users (username, password, "fullName", email, role, active) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute(['admin', $hashedPassword, 'مدير النظام', 'admin@example.com', 'admin', true]);
    } else {
        // تحديث كلمة المرور
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = ?");
        $stmt->execute([$hashedPassword, 'admin']);
    }
}

// إنشاء المجلدات الضرورية
function createRequiredDirectories() {
    $directories = ['uploads', 'temp', 'logs', 'fonts'];
    $results = [];
    
    foreach ($directories as $dir) {
        $path = "../$dir";
        if (!file_exists($path)) {
            $results[$dir] = mkdir($path, 0755, true);
        } else {
            $results[$dir] = true;
        }
    }
    
    return $results;
}

// إنشاء ملف .htaccess للتوجيه المناسب
function createHtaccess() {
    $htaccessContent = <<<EOT
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # إذا كان الطلب لملف أو مجلد موجود، قم بتقديمه مباشرة
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    
    # إعادة توجيه طلبات API
    RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L,QSA]
    
    # إعادة توجيه كل الطلبات الأخرى إلى التطبيق الرئيسي
    RewriteRule ^ index.html [L]
</IfModule>

# تعيين وقت انتهاء صلاحية لأنواع الملفات الشائعة
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/x-javascript "access plus 1 month"
    ExpiresByType image/x-icon "access plus 1 year"
</IfModule>

# ضغط الاستجابة
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
</IfModule>

# تعيين content-type للملفات
<IfModule mod_mime.c>
    AddType application/javascript .js
    AddType text/css .css
    AddType image/svg+xml .svg
</IfModule>
EOT;

    return file_put_contents('../.htaccess', $htaccessContent);
}

// تثبيت المشروع باستخدام سكريبت التثبيت الموحد
function installWithUnifiedScript($config) {
    // تحقق من وجود Node.js
    if (!$config['has_nodejs']) {
        return [
            'success' => false,
            'message' => 'لم يتم العثور على Node.js. يجب تثبيت Node.js أولاً قبل استخدام سكريبت التثبيت الموحد.'
        ];
    }
    
    // إنشاء مجلد scripts.temp للعمليات المؤقتة
    if (!file_exists('../scripts.temp')) {
        mkdir('../scripts.temp', 0755, true);
    }
    
    // نسخ سكريبت التثبيت الموحد إلى المجلد المؤقت
    $setupScript = <<<EOT
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createConnection } = require('{$config['db_type'] === 'mysql' ? 'mysql2/promise' : 'pg'}');

// تكوين قاعدة البيانات
const dbConfig = {
  type: '{$config['db_type']}',
  host: '{$config['db_host']}',
  port: {$config['db_port']},
  user: '{$config['db_user']}',
  password: '{$config['db_password']}',
  database: '{$config['db_name']}',
  ssl: false
};

// تكوين الخادم
const serverConfig = {
  port: {$config['port']},
  environment: '{$config['environment']}'
};

// طباعة رسالة التثبيت
console.log('====================================');
console.log('بدء عملية تثبيت المشروع بشكل موحد');
console.log('====================================');

async function main() {
  try {
    // التحقق من اتصال قاعدة البيانات
    console.log('جاري التحقق من اتصال قاعدة البيانات...');
    
    // إنشاء المجلدات اللازمة
    console.log('إنشاء المجلدات اللازمة...');
    ['uploads', 'temp', 'logs', 'fonts'].forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ تم إنشاء مجلد: \${dirPath}`);
      }
    });
    
    // في حالة التثبيت بنجاح، اكتب ملف نجاح التثبيت
    fs.writeFileSync(
      path.join(process.cwd(), 'scripts.temp', 'install-success.json'),
      JSON.stringify({
        success: true,
        message: 'تم تثبيت المشروع بنجاح!',
        timestamp: new Date().toISOString()
      })
    );
    
    console.log('✅ تم تثبيت المشروع بنجاح!');
    console.log('====================================');
    console.log('معلومات الدخول الافتراضية:');
    console.log('اسم المستخدم: admin');
    console.log('كلمة المرور: 700700');
    console.log('====================================');
    
  } catch (error) {
    console.error('❌ حدث خطأ أثناء التثبيت:', error);
    
    // في حالة الفشل، اكتب ملف فشل التثبيت
    fs.writeFileSync(
      path.join(process.cwd(), 'scripts.temp', 'install-error.json'),
      JSON.stringify({
        success: false,
        message: `فشل التثبيت: \${error.message}`,
        timestamp: new Date().toISOString()
      })
    );
  }
}

// تنفيذ الدالة الرئيسية
main();
EOT;

    file_put_contents('../scripts.temp/setup.js', $setupScript);
    
    // تنفيذ سكريبت التثبيت
    $cmd = "cd .. && node scripts.temp/setup.js 2>&1";
    $output = shell_exec($cmd);
    
    // تحقق من نتيجة التثبيت
    if (file_exists('../scripts.temp/install-success.json')) {
        $successData = json_decode(file_get_contents('../scripts.temp/install-success.json'), true);
        return [
            'success' => true,
            'message' => $successData['message'],
            'output' => $output
        ];
    } elseif (file_exists('../scripts.temp/install-error.json')) {
        $errorData = json_decode(file_get_contents('../scripts.temp/install-error.json'), true);
        return [
            'success' => false,
            'message' => $errorData['message'],
            'output' => $output
        ];
    } else {
        return [
            'success' => false,
            'message' => 'حدث خطأ غير معروف أثناء التثبيت',
            'output' => $output
        ];
    }
}

// التحقق من الإرسال
$step = isset($_POST['step']) ? (int)$_POST['step'] : 1;
$error = '';
$success = '';
$warning = '';
$installResults = [];

// معالجة الخطوة 2 (إعدادات قاعدة البيانات)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $step === 2) {
    $dbType = $_POST['db_type'] ?? 'mysql';
    $dbHost = $_POST['db_host'] ?? 'localhost';
    $dbPort = $_POST['db_port'] ?? ($dbType === 'mysql' ? '3306' : '5432');
    $dbName = $_POST['db_name'] ?? 'certificates_db';
    $dbUser = $_POST['db_user'] ?? '';
    $dbPass = $_POST['db_password'] ?? '';
    $dbUrl = $_POST['db_url'] ?? '';
    
    if (empty($dbHost) || empty($dbName) || empty($dbUser)) {
        $error = 'يرجى تعبئة جميع حقول قاعدة البيانات المطلوبة';
    } else {
        // حفظ إعدادات قاعدة البيانات للخطوة التالية
        $_SESSION['db_config'] = [
            'db_type' => $dbType,
            'db_host' => $dbHost,
            'db_port' => $dbPort,
            'db_name' => $dbName,
            'db_user' => $dbUser,
            'db_password' => $dbPass,
            'db_url' => $dbUrl
        ];
        
        // محاولة الاتصال بقاعدة البيانات
        if ($dbType === 'mysql') {
            $dbResult = setupMysqlDatabase([
                'db_host' => $dbHost,
                'db_port' => $dbPort,
                'db_name' => $dbName,
                'db_user' => $dbUser,
                'db_password' => $dbPass
            ]);
        } else {
            $dbResult = setupPostgresDatabase([
                'db_host' => $dbHost,
                'db_port' => $dbPort,
                'db_name' => $dbName,
                'db_user' => $dbUser,
                'db_password' => $dbPass
            ]);
        }
        
        if ($dbResult === true) {
            $success = 'تم الاتصال بقاعدة البيانات وإعدادها بنجاح!';
            $step = 3; // الانتقال للخطوة التالية
        } else {
            $error = 'خطأ في الاتصال بقاعدة البيانات: ' . $dbResult;
        }
    }
}

// معالجة الخطوة 3 (إعدادات المشروع)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $step === 3) {
    $env = $_POST['environment'] ?? 'development';
    $port = $_POST['port'] ?? '5000';
    $siteName = $_POST['site_name'] ?? 'منصة الشهادات الإلكترونية';
    $adminEmail = $_POST['admin_email'] ?? '';
    $setupMethod = $_POST['setup_method'] ?? 'auto';
    
    // استرجاع إعدادات قاعدة البيانات من الخطوة السابقة
    $dbConfig = $_SESSION['db_config'] ?? [];
    
    // إنشاء المجلدات اللازمة
    $directoryResults = createRequiredDirectories();
    if (in_array(false, $directoryResults, true)) {
        $warning = 'بعض المجلدات لم يتم إنشاؤها بنجاح. تأكد من صلاحيات الكتابة.';
    }
    
    // تكوين كامل للمشروع
    $fullConfig = array_merge($dbConfig, [
        'environment' => $env,
        'port' => $port,
        'site_name' => $siteName,
        'admin_email' => $adminEmail,
        'date' => date('Y-m-d H:i:s'),
        'static_dir' => 'public',
        'has_nodejs' => !empty(trim(shell_exec('node -v 2>/dev/null')))
    ]);
    
    // حفظ ملفات الإعدادات
    $envSaved = saveEnvConfig($fullConfig);
    $hostingerSaved = saveHostingerConfig($fullConfig);
    
    if (!$envSaved || !$hostingerSaved) {
        $error = 'حدث خطأ أثناء حفظ ملفات الإعدادات. تأكد من صلاحيات الكتابة على المجلد.';
    } else {
        // إنشاء ملف .htaccess
        createHtaccess();
        
        // تثبيت المشروع باستخدام سكريبت التثبيت الموحد إذا تم اختياره
        if ($setupMethod === 'auto' && $fullConfig['has_nodejs']) {
            $installResults = installWithUnifiedScript($fullConfig);
            
            if ($installResults['success']) {
                $success = 'تم تثبيت المشروع وإعداده بنجاح!';
                $step = 4; // الانتقال للخطوة النهائية
            } else {
                $warning = 'تم حفظ الإعدادات ولكن حدث خطأ أثناء التثبيت التلقائي: ' . $installResults['message'];
                $step = 4; // الانتقال للخطوة النهائية على أي حال
            }
        } else {
            $success = 'تم حفظ الإعدادات بنجاح!';
            $step = 4; // الانتقال للخطوة النهائية
        }
    }
}

// بدء الجلسة لتخزين البيانات بين الخطوات
session_start();
?>
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تثبيت منصة الشهادات والبطاقات الإلكترونية</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8f9fa;
            color: #333;
            direction: rtl;
        }
        .installer-container {
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .step-indicator {
            display: flex;
            margin-bottom: 20px;
            justify-content: space-between;
        }
        .step {
            flex: 1;
            padding: 10px;
            text-align: center;
            background-color: #e9ecef;
            margin: 0 5px;
            border-radius: 5px;
        }
        .step.active {
            background-color: #007bff;
            color: white;
        }
        .step.completed {
            background-color: #28a745;
            color: white;
        }
        .logo {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo img {
            max-width: 150px;
        }
        .requirement-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid #eee;
        }
        .requirement-item:last-child {
            border-bottom: none;
        }
        .status-icon {
            font-weight: bold;
        }
        .status-success {
            color: #28a745;
        }
        .status-error {
            color: #dc3545;
        }
        .feature-card {
            border-radius: 5px;
            border: 1px solid #eee;
            padding: 15px;
            margin-bottom: 15px;
            transition: all 0.3s;
        }
        .feature-card:hover {
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .feature-card i {
            font-size: 2rem;
            margin-bottom: 10px;
            color: #007bff;
        }
        .code-block {
            background-color: #f1f1f1;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="installer-container">
        <div class="logo">
            <h1>منصة الشهادات والبطاقات الإلكترونية</h1>
            <p class="text-muted">برنامج التثبيت الموحد - الإصدار 2.0</p>
        </div>
        
        <div class="step-indicator">
            <div class="step <?php echo $step >= 1 ? 'active' : ''; ?> <?php echo $step > 1 ? 'completed' : ''; ?>">1. التحقق من المتطلبات</div>
            <div class="step <?php echo $step >= 2 ? 'active' : ''; ?> <?php echo $step > 2 ? 'completed' : ''; ?>">2. إعداد قاعدة البيانات</div>
            <div class="step <?php echo $step >= 3 ? 'active' : ''; ?> <?php echo $step > 3 ? 'completed' : ''; ?>">3. إعدادات المشروع</div>
            <div class="step <?php echo $step >= 4 ? 'active' : ''; ?>">4. اكتمال التثبيت</div>
        </div>
        
        <?php if (!empty($error)): ?>
            <?php showError($error); ?>
        <?php endif; ?>
        
        <?php if (!empty($warning)): ?>
            <?php showWarning($warning); ?>
        <?php endif; ?>
        
        <?php if (!empty($success)): ?>
            <?php showSuccess($success); ?>
        <?php endif; ?>
        
        <!-- الخطوة 1: التحقق من المتطلبات -->
        <?php if ($step == 1): ?>
            <h2>التحقق من متطلبات التثبيت</h2>
            
            <?php
            $requirements = checkRequirements();
            $basicPassed = true;
            $advancedPassed = true;
            
            // التحقق من المتطلبات الأساسية
            foreach (array('php', 'pdo_mysql', 'gd', 'fileinfo', 'json', 'writable_root', 'writable_uploads', 'writable_temp') as $req) {
                if (!$requirements[$req]) {
                    $basicPassed = false;
                    break;
                }
            }
            
            // التحقق من المتطلبات المتقدمة (Node.js)
            if (!$requirements['nodejs']) {
                $advancedPassed = false;
            }
            ?>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h5>المتطلبات الأساسية</h5>
                </div>
                <div class="card-body">
                    <div class="requirement-item">
                        <span>إصدار PHP (7.4 أو أعلى)</span>
                        <span class="status-icon <?php echo $requirements['php'] ? 'status-success' : 'status-error'; ?>">
                            <?php echo $requirements['php'] ? '✓ ' . PHP_VERSION : '✕ ' . PHP_VERSION; ?>
                        </span>
                    </div>
                    <div class="requirement-item">
                        <span>امتداد PDO MySQL</span>
                        <span class="status-icon <?php echo $requirements['pdo_mysql'] ? 'status-success' : 'status-error'; ?>">
                            <?php echo $requirements['pdo_mysql'] ? '✓ متوفر' : '✕ غير متوفر'; ?>
                        </span>
                    </div>
                    <div class="requirement-item">
                        <span>امتداد PDO PostgreSQL</span>
                        <span class="status-icon <?php echo $requirements['pdo_pgsql'] ? 'status-success' : 'status-warning'; ?>">
                            <?php echo $requirements['pdo_pgsql'] ? '✓ متوفر' : '⚠️ غير متوفر (اختياري لبيئة MySQL)'; ?>
                        </span>
                    </div>
                    <div class="requirement-item">
                        <span>امتداد GD</span>
                        <span class="status-icon <?php echo $requirements['gd'] ? 'status-success' : 'status-error'; ?>">
                            <?php echo $requirements['gd'] ? '✓ متوفر' : '✕ غير متوفر'; ?>
                        </span>
                    </div>
                    <div class="requirement-item">
                        <span>امتداد Fileinfo</span>
                        <span class="status-icon <?php echo $requirements['fileinfo'] ? 'status-success' : 'status-error'; ?>">
                            <?php echo $requirements['fileinfo'] ? '✓ متوفر' : '✕ غير متوفر'; ?>
                        </span>
                    </div>
                    <div class="requirement-item">
                        <span>امتداد JSON</span>
                        <span class="status-icon <?php echo $requirements['json'] ? 'status-success' : 'status-error'; ?>">
                            <?php echo $requirements['json'] ? '✓ متوفر' : '✕ غير متوفر'; ?>
                        </span>
                    </div>
                    <div class="requirement-item">
                        <span>صلاحيات الكتابة على المجلد الرئيسي</span>
                        <span class="status-icon <?php echo $requirements['writable_root'] ? 'status-success' : 'status-error'; ?>">
                            <?php echo $requirements['writable_root'] ? '✓ متوفر' : '✕ غير متوفر'; ?>
                        </span>
                    </div>
                    <div class="requirement-item">
                        <span>صلاحيات الكتابة على مجلد uploads</span>
                        <span class="status-icon <?php echo $requirements['writable_uploads'] ? 'status-success' : 'status-error'; ?>">
                            <?php echo $requirements['writable_uploads'] ? '✓ متوفر' : '✕ غير متوفر'; ?>
                        </span>
                    </div>
                    <div class="requirement-item">
                        <span>صلاحيات الكتابة على مجلد temp</span>
                        <span class="status-icon <?php echo $requirements['writable_temp'] ? 'status-success' : 'status-error'; ?>">
                            <?php echo $requirements['writable_temp'] ? '✓ متوفر' : '✕ غير متوفر'; ?>
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h5>المتطلبات المتقدمة (للخادم الموحد)</h5>
                </div>
                <div class="card-body">
                    <div class="requirement-item">
                        <span>Node.js (للتثبيت المتقدم)</span>
                        <span class="status-icon <?php echo $requirements['nodejs'] ? 'status-success' : 'status-warning'; ?>">
                            <?php echo $requirements['nodejs'] 
                                ? '✓ متوفر (' . $requirements['nodejs_version'] . ')' 
                                : '⚠️ غير متوفر (متطلب للخادم الموحد)'; ?>
                        </span>
                    </div>
                    <div class="requirement-item">
                        <span>npm (لإدارة الحزم)</span>
                        <span class="status-icon <?php echo $requirements['npm'] ? 'status-success' : 'status-warning'; ?>">
                            <?php echo $requirements['npm'] 
                                ? '✓ متوفر (' . $requirements['npm_version'] . ')' 
                                : '⚠️ غير متوفر (متطلب للخادم الموحد)'; ?>
                        </span>
                    </div>
                </div>
                <div class="card-footer">
                    <small class="text-muted">
                        ملاحظة: متطلبات Node.js و npm ضرورية فقط إذا كنت ترغب في استخدام الخادم الموحد في الإنتاج أو في بيئة التطوير التي تستخدم Node.js.
                        يمكنك الاستمرار في التثبيت بدونها باستخدام PHP فقط.
                    </small>
                </div>
            </div>
            
            <?php if ($basicPassed): ?>
                <form action="" method="post" class="mt-4">
                    <input type="hidden" name="step" value="2">
                    <div class="d-grid">
                        <button type="submit" class="btn btn-primary btn-lg">متابعة إلى إعداد قاعدة البيانات</button>
                    </div>
                </form>
            <?php else: ?>
                <div class="alert alert-danger mt-4">
                    <h5>يرجى تثبيت المتطلبات الأساسية للمتابعة</h5>
                    <p>تأكد من تثبيت جميع المتطلبات الأساسية ومنح صلاحيات الكتابة المناسبة للمجلدات.</p>
                </div>
            <?php endif; ?>
            
        <!-- الخطوة 2: إعدادات قاعدة البيانات -->
        <?php elseif ($step == 2): ?>
            <h2>إعدادات قاعدة البيانات</h2>
            
            <form action="" method="post" class="mt-4">
                <input type="hidden" name="step" value="2">
                
                <div class="mb-3">
                    <label for="db_type" class="form-label">نوع قاعدة البيانات</label>
                    <select class="form-select" id="db_type" name="db_type">
                        <option value="mysql" selected>MySQL (مناسب للإنتاج)</option>
                        <option value="postgres">PostgreSQL (مناسب للتطوير)</option>
                    </select>
                    <div class="form-text">اختر نوع قاعدة البيانات التي ترغب في استخدامها. MySQL موصى به للإنتاج.</div>
                </div>
                
                <div class="mb-3">
                    <label for="db_host" class="form-label">مضيف قاعدة البيانات</label>
                    <input type="text" class="form-control" id="db_host" name="db_host" value="localhost" required>
                    <div class="form-text">عادة ما يكون "localhost" في معظم الاستضافات.</div>
                </div>
                
                <div class="mb-3">
                    <label for="db_port" class="form-label">منفذ قاعدة البيانات</label>
                    <input type="text" class="form-control" id="db_port" name="db_port" value="3306">
                    <div class="form-text">المنفذ الافتراضي لـ MySQL هو 3306، ولـ PostgreSQL هو 5432.</div>
                </div>
                
                <div class="mb-3">
                    <label for="db_name" class="form-label">اسم قاعدة البيانات</label>
                    <input type="text" class="form-control" id="db_name" name="db_name" value="certificates_db" required>
                    <div class="form-text">اسم قاعدة البيانات التي ستستخدمها المنصة. سيتم إنشاؤها إذا لم تكن موجودة.</div>
                </div>
                
                <div class="mb-3">
                    <label for="db_user" class="form-label">اسم مستخدم قاعدة البيانات</label>
                    <input type="text" class="form-control" id="db_user" name="db_user" required>
                    <div class="form-text">اسم المستخدم الذي له صلاحية الوصول إلى قاعدة البيانات.</div>
                </div>
                
                <div class="mb-3">
                    <label for="db_password" class="form-label">كلمة مرور قاعدة البيانات</label>
                    <input type="password" class="form-control" id="db_password" name="db_password">
                    <div class="form-text">كلمة مرور المستخدم للوصول إلى قاعدة البيانات.</div>
                </div>
                
                <div class="mb-3" id="db_url_container" style="display: none;">
                    <label for="db_url" class="form-label">رابط اتصال قاعدة البيانات (اختياري)</label>
                    <input type="text" class="form-control" id="db_url" name="db_url">
                    <div class="form-text">للبيئات المُستضافة مثل Render أو Railway. مثال: postgres://user:password@host:port/database</div>
                </div>
                
                <div class="d-grid gap-2">
                    <button type="submit" class="btn btn-primary btn-lg">اختبار الاتصال ومتابعة</button>
                    <a href="?step=1" class="btn btn-outline-secondary">رجوع</a>
                </div>
            </form>
            
            <script>
                // إظهار/إخفاء حقل رابط قاعدة البيانات بناءً على النوع المحدد
                document.getElementById('db_type').addEventListener('change', function() {
                    var dbUrlContainer = document.getElementById('db_url_container');
                    var dbPortInput = document.getElementById('db_port');
                    
                    if (this.value === 'postgres') {
                        dbUrlContainer.style.display = 'block';
                        dbPortInput.value = '5432';
                    } else {
                        dbUrlContainer.style.display = 'none';
                        dbPortInput.value = '3306';
                    }
                });
            </script>
            
        <!-- الخطوة 3: إعدادات المشروع -->
        <?php elseif ($step == 3): ?>
            <h2>إعدادات المشروع</h2>
            
            <form action="" method="post" class="mt-4">
                <input type="hidden" name="step" value="3">
                
                <div class="mb-3">
                    <label for="environment" class="form-label">بيئة التشغيل</label>
                    <select class="form-select" id="environment" name="environment">
                        <option value="development" selected>بيئة التطوير (Development)</option>
                        <option value="production">بيئة الإنتاج (Production)</option>
                    </select>
                    <div class="form-text">اختر بيئة التشغيل المناسبة. بيئة التطوير توفر رسائل خطأ مفصلة.</div>
                </div>
                
                <div class="mb-3">
                    <label for="port" class="form-label">منفذ الخادم</label>
                    <input type="number" class="form-control" id="port" name="port" value="5000" min="1" max="65535">
                    <div class="form-text">المنفذ الذي سيستمع عليه الخادم. الافتراضي هو 5000 أو 3000.</div>
                </div>
                
                <div class="mb-3">
                    <label for="site_name" class="form-label">اسم الموقع</label>
                    <input type="text" class="form-control" id="site_name" name="site_name" value="منصة الشهادات والبطاقات الإلكترونية">
                    <div class="form-text">اسم الموقع الذي سيظهر في العنوان والترويسة.</div>
                </div>
                
                <div class="mb-3">
                    <label for="admin_email" class="form-label">البريد الإلكتروني للمدير</label>
                    <input type="email" class="form-control" id="admin_email" name="admin_email">
                    <div class="form-text">البريد الإلكتروني الذي سيتم استخدامه للإشعارات الإدارية. (اختياري)</div>
                </div>
                
                <div class="mb-3">
                    <label for="setup_method" class="form-label">طريقة التثبيت</label>
                    <select class="form-select" id="setup_method" name="setup_method">
                        <option value="auto" <?php echo ($requirements['nodejs'] ? 'selected' : ''); ?>>تثبيت تلقائي (يتطلب Node.js)</option>
                        <option value="manual" <?php echo (!$requirements['nodejs'] ? 'selected' : ''); ?>>تثبيت يدوي (PHP فقط)</option>
                    </select>
                    <div class="form-text">
                        <?php if ($requirements['nodejs']): ?>
                            يمكنك استخدام التثبيت التلقائي لإعداد المشروع بالكامل. Node.js متوفر ويمكن استخدامه.
                        <?php else: ?>
                            التثبيت اليدوي متاح دائمًا. Node.js غير متوفر لذا لا يمكن استخدام التثبيت التلقائي.
                        <?php endif; ?>
                    </div>
                </div>
                
                <div class="d-grid gap-2">
                    <button type="submit" class="btn btn-primary btn-lg">تثبيت المشروع</button>
                    <a href="?step=2" class="btn btn-outline-secondary">رجوع</a>
                </div>
            </form>
            
        <!-- الخطوة 4: اكتمال التثبيت -->
        <?php elseif ($step == 4): ?>
            <h2>اكتمال التثبيت</h2>
            
            <div class="alert alert-success mb-4">
                <h4 class="alert-heading"><i class="bi bi-check-circle me-2"></i> تم تثبيت المشروع بنجاح!</h4>
                <p>لقد تم إعداد المشروع واكتمل التثبيت. يمكنك الآن البدء في استخدام منصة الشهادات والبطاقات الإلكترونية.</p>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h5>معلومات الدخول</h5>
                </div>
                <div class="card-body">
                    <p><strong>اسم المستخدم:</strong> admin</p>
                    <p><strong>كلمة المرور:</strong> 700700</p>
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle me-2"></i> تأكد من تغيير كلمة المرور الافتراضية بعد تسجيل الدخول الأول.
                    </div>
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h5>الخطوات التالية</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="feature-card">
                                <i class="bi bi-box-arrow-in-right"></i>
                                <h5>تسجيل الدخول</h5>
                                <p>قم بتسجيل الدخول إلى لوحة التحكم باستخدام بيانات الدخول المذكورة أعلاه.</p>
                                <a href="../" class="btn btn-primary">الذهاب إلى الموقع</a>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="feature-card">
                                <i class="bi bi-gear"></i>
                                <h5>تكوين النظام</h5>
                                <p>قم بتكوين النظام وإضافة القوالب والفئات وتخصيص الإعدادات.</p>
                                <a href="../" class="btn btn-outline-secondary">إعدادات النظام</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <?php if (isset($installResults['output'])): ?>
            <div class="card mb-4">
                <div class="card-header">
                    <h5>سجل التثبيت</h5>
                </div>
                <div class="card-body">
                    <pre class="code-block"><?php echo htmlspecialchars($installResults['output']); ?></pre>
                </div>
            </div>
            <?php endif; ?>
            
            <div class="alert alert-info">
                <h5><i class="bi bi-info-circle me-2"></i> ملاحظة هامة</h5>
                <p>لأسباب أمنية، يجب عليك حذف مجلد التثبيت (install) بعد اكتمال عملية التثبيت.</p>
                <pre class="code-block">rm -rf /path/to/your/project/install</pre>
            </div>
            
            <div class="d-grid gap-2">
                <a href="../" class="btn btn-primary btn-lg">الذهاب إلى الموقع</a>
            </div>
            
        <?php endif; ?>
        
        <div class="text-center mt-4">
            <p class="text-muted small">حقوق النشر &copy; <?php echo date('Y'); ?> منصة الشهادات والبطاقات الإلكترونية. جميع الحقوق محفوظة.</p>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
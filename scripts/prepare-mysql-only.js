/**
 * سكريبت إعداد نسخة MySQL فقط
 * يقوم هذا السكريبت بإنشاء نسخة من المشروع تعتمد على MySQL فقط
 * وإزالة كل ما يتعلق بـ PostgreSQL والمحاكاة والتخزين في الذاكرة
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m'
};

// دالة طباعة ملونة
function print(message, color = 'reset') {
  console.log(colors[color] || colors.reset, message, colors.reset);
}

// إنشاء المجلدات
function createDirectoryIfNotExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    print(`✅ تم إنشاء المجلد: ${dirPath}`, 'green');
  }
}

// نسخ الملفات مع الاستبدال
function copyFileWithReplacements(source, destination, replacements = []) {
  if (!fs.existsSync(source)) {
    print(`❌ الملف المصدر غير موجود: ${source}`, 'red');
    return false;
  }

  createDirectoryIfNotExists(path.dirname(destination));

  let content = fs.readFileSync(source, 'utf8');

  for (const { pattern, replacement } of replacements) {
    content = content.replace(pattern, replacement);
  }

  fs.writeFileSync(destination, content);
  print(`✅ تم نسخ وتعديل الملف: ${destination}`, 'green');
  return true;
}

// تعديل ملف db.ts ليستخدم MySQL فقط
function createMySQLOnlyDB() {
  print('🔄 إنشاء ملف قاعدة البيانات MySQL فقط...', 'blue');

  const dbFilePath = path.join(process.cwd(), 'server', 'db.mysql.ts');
  const newDbFilePath = path.join(process.cwd(), 'mysql-only', 'server', 'db.ts');

  return copyFileWithReplacements(dbFilePath, newDbFilePath, [
    {
      pattern: /export let isMySQLAvailable.*?= false;/gs,
      replacement: 'export let isMySQLAvailable = true;'
    },
    {
      pattern: /export let useMySQL.*?= false;/gs,
      replacement: 'export let useMySQL = true;'
    },
    {
      pattern: /\/\/ PostgreSQL تحقق من اتصال[\s\S]*?isPostgreSQLAvailable = true;/gs,
      replacement: '// تم إزالة التحقق من PostgreSQL في هذه النسخة'
    },
    {
      pattern: /\/\/ إذا كان MySQL متاحًا وتم تكوينه، استخدمه بدلاً من PostgreSQL[\s\S]*?}$/gms,
      replacement: '// استخدام MySQL دائمًا\nuseMySQL = true;'
    },
    {
      pattern: /\/\/ Initialize in-memory store[\s\S]*?inMemoryStore = initializeInMemoryStore\(\);/gs,
      replacement: '// تم إزالة التخزين في الذاكرة في هذه النسخة'
    },
    {
      pattern: /\/\/ Fallback to in-memory database if all connections fail[\s\S]*?db = inMemoryStore;/gs,
      replacement: '// لا يتم استخدام التخزين في الذاكرة كحل بديل في حالة فشل الاتصال\nif (!db) {\n  throw new Error("فشل الاتصال بقاعدة البيانات");\n}'
    }
  ]);
}

// تعديل ملف config.ts ليستخدم MySQL فقط
function createConfigFile() {
  print('🔄 إنشاء ملف الإعدادات...', 'blue');

  const configFilePath = path.join(process.cwd(), 'server', 'config.ts');
  const newConfigFilePath = path.join(process.cwd(), 'mysql-only', 'server', 'config.ts');

  return copyFileWithReplacements(configFilePath, newConfigFilePath, [
    {
      pattern: /databaseConfig = {[\s\S]*?};/gs,
      replacement: `databaseConfig = {
  type: 'mysql',
  host: process.env.DB_HOST || hostingerConfig?.database?.host || 'localhost',
  port: parseInt(process.env.DB_PORT || hostingerConfig?.database?.port || '3306'),
  user: process.env.DB_USER || hostingerConfig?.database?.user || 'root',
  password: process.env.DB_PASSWORD || hostingerConfig?.database?.password || '',
  database: process.env.DB_NAME || hostingerConfig?.database?.database || 'certificates_db',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || hostingerConfig?.database?.connectionLimit || '10'),
  // إزالة وضع الذاكرة والخيارات الأخرى
  memoryMode: false,
  enableLogging: isProduction ? false : true
};`
    }
  ]);
}

// تعديل ملف index.ts ليستخدم MySQL فقط
function createIndexFile() {
  print('🔄 إنشاء ملف index.ts...', 'blue');

  const indexFilePath = path.join(process.cwd(), 'server', 'index.ts');
  const newIndexFilePath = path.join(process.cwd(), 'mysql-only', 'server', 'index.ts');

  return copyFileWithReplacements(indexFilePath, newIndexFilePath, [
    {
      pattern: /\/\/ تحقق من البيئة وإعدادات قاعدة البيانات[\s\S]*?console\.log\('🔄 جاري تهيئة قاعدة بيانات MySQL\.\.\.'[\s\S]*?console\.log\(.*?في هوستنجر.*?\)/gs,
      replacement: `// تهيئة قاعدة بيانات MySQL
console.log('==== معلومات قاعدة البيانات ====');
console.log(\`🌐 البيئة: \${isProduction ? 'إنتاج' : 'تطوير'}\`);
console.log('🔄 نوع قاعدة البيانات: mysql');
console.log('🔄 جاري تهيئة قاعدة بيانات MySQL...');`
    }
  ]);
}

// تعديل ملف storage.ts
function createStorageFile() {
  print('🔄 إنشاء ملف storage.ts مُحسن...', 'blue');

  const storageFilePath = path.join(process.cwd(), 'server', 'storage.ts');
  const newStorageFilePath = path.join(process.cwd(), 'mysql-only', 'server', 'storage.ts');

  return copyFileWithReplacements(storageFilePath, newStorageFilePath, [
    {
      pattern: /const \[\{ count \}\] = await db[\s\S]*?return \{ templates: templatesData, total: Number\(count\) \};/gs,
      replacement: `const countResult = await db
      .select({ count: sql<number>\`count(*)\` })
      .from(templates)
      .where(conditions.length ? and(...conditions) : sql\`1=1\`);
    
    const total = countResult.length > 0 ? Number(countResult[0].count) : 0;
    return { templates: templatesData, total };`
    }
  ]);
}

// إنشاء ملف .env محسن
function createEnvFile() {
  print('🔄 إنشاء ملف .env محسن...', 'blue');

  const envContent = `# بيئة التشغيل
NODE_ENV=production

# منفذ التشغيل
PORT=5000

# نوع قاعدة البيانات
DB_TYPE=mysql

# إعدادات MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=certificates_db
DB_CONNECTION_LIMIT=10

# المسار الافتراضي للملفات الثابتة
STATIC_PATH=./client/static

# المسار الافتراضي للتحميلات
UPLOADS_PATH=./uploads

# مفتاح الجلسة (يجب تغييره في الإنتاج)
SESSION_SECRET=your-secret-key-here

# تكوين مصادقة Google (اختياري)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

# تكوين مصادقة Facebook (اختياري)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_CALLBACK_URL=

# تكوين مصادقة Twitter (اختياري)
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
TWITTER_CALLBACK_URL=

# تكوين مصادقة LinkedIn (اختياري)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_CALLBACK_URL=
`;

  const envFilePath = path.join(process.cwd(), 'mysql-only', '.env.example');
  createDirectoryIfNotExists(path.dirname(envFilePath));
  fs.writeFileSync(envFilePath, envContent);
  print(`✅ تم إنشاء ملف .env.example: ${envFilePath}`, 'green');
}

// نسخ ملف schema.ts
function copySchemaFile() {
  print('🔄 نسخ ملف schema.ts...', 'blue');

  const schemaFilePath = path.join(process.cwd(), 'shared', 'schema.ts');
  const newSchemaFilePath = path.join(process.cwd(), 'mysql-only', 'shared', 'schema.ts');

  createDirectoryIfNotExists(path.dirname(newSchemaFilePath));
  fs.copyFileSync(schemaFilePath, newSchemaFilePath);
  print(`✅ تم نسخ ملف schema.ts إلى: ${newSchemaFilePath}`, 'green');
}

// نسخ ملف init-db.ts المصحح
function copyInitDbFile() {
  print('🔄 نسخ ملف init-db.ts المصحح...', 'blue');

  // استخدام init-db.fixed.ts إذا كان موجوداً، وإلا استخدام init-db.ts
  let initDbSource = path.join(process.cwd(), 'server', 'init-db.fixed.ts');
  if (!fs.existsSync(initDbSource)) {
    initDbSource = path.join(process.cwd(), 'server', 'init-db.ts');
  }

  const newInitDbFilePath = path.join(process.cwd(), 'mysql-only', 'server', 'init-db.ts');

  return copyFileWithReplacements(initDbSource, newInitDbFilePath, [
    {
      pattern: /\/\/ محاولة حفظ الخطأ في قاعدة البيانات\s+try[\s\S]*?console\.error.*فشل تسجيل الخطأ.*[\s\S]*?}/gs,
      replacement: `// تم تبسيط تسجيل الأخطاء في هذه النسخة
    console.error('❌ خطأ في التحقق من وجود مستخدم admin:', error);`
    }
  ]);
}

// تجميع كل الملفات الأخرى اللازمة
function copyOtherFiles() {
  print('🔄 نسخ الملفات الأخرى...', 'blue');

  const filesToCopy = [
    { src: 'server/auth.ts', dest: 'mysql-only/server/auth.ts' },
    { src: 'server/routes.ts', dest: 'mysql-only/server/routes.ts' },
    { src: 'server/vite.ts', dest: 'mysql-only/server/vite.ts' },
    { src: 'server/certificate-generator.ts', dest: 'mysql-only/server/certificate-generator.ts' },
    { src: 'server/image-generator.ts', dest: 'mysql-only/server/image-generator.ts' },
    { src: 'server/batch-processor.ts', dest: 'mysql-only/server/batch-processor.ts' },
    { src: 'server/optimized-image-generator.ts', dest: 'mysql-only/server/optimized-image-generator.ts' },
    { src: 'server/unified.ts', dest: 'mysql-only/server/unified.ts' },
    { src: 'server/tsconfig.json', dest: 'mysql-only/server/tsconfig.json' },
    { src: 'scripts/fix-templates-query.js', dest: 'mysql-only/scripts/fix-templates-query.js' },
    { src: 'scripts/create-admin-user.js', dest: 'mysql-only/scripts/create-admin-user.js' },
    { src: 'scripts/patch-storage-count.js', dest: 'mysql-only/scripts/patch-storage-count.js' },
    { src: 'scripts/unified-setup.js', dest: 'mysql-only/scripts/unified-setup.js' },
    { src: 'scripts/ensure-directories.js', dest: 'mysql-only/scripts/ensure-directories.js' },
    { src: 'package.json', dest: 'mysql-only/package.json' },
    { src: 'tsconfig.json', dest: 'mysql-only/tsconfig.json' },
    { src: 'hostinger.config.example.js', dest: 'mysql-only/hostinger.config.example.js' },
    { src: 'certificates_database.sql', dest: 'mysql-only/certificates_database.sql' },
    { src: 'شرح-إصلاح-المشاكل.md', dest: 'mysql-only/شرح-إصلاح-المشاكل.md' },
    { src: 'DEPLOY.md', dest: 'mysql-only/DEPLOY.md' },
    { src: 'HOSTINGER-DEPLOYMENT-GUIDE.md', dest: 'mysql-only/HOSTINGER-DEPLOYMENT-GUIDE.md' },
    { src: 'HOSTINGER-MYSQL-SETUP.md', dest: 'mysql-only/HOSTINGER-MYSQL-SETUP.md' },
    { src: 'دليل-نشر-هوستنجر.md', dest: 'mysql-only/دليل-نشر-هوستنجر.md' }
  ];

  for (const file of filesToCopy) {
    try {
      const srcPath = path.join(process.cwd(), file.src);
      const destPath = path.join(process.cwd(), file.dest);

      if (fs.existsSync(srcPath)) {
        createDirectoryIfNotExists(path.dirname(destPath));
        fs.copyFileSync(srcPath, destPath);
        print(`✅ تم نسخ ${file.src} إلى ${file.dest}`, 'green');
      } else {
        print(`⚠️ الملف غير موجود: ${file.src}`, 'yellow');
      }
    } catch (error) {
      print(`❌ خطأ في نسخ الملف ${file.src}: ${error.message}`, 'red');
    }
  }
}

// نسخ مجلد client
function copyClientDirectory() {
  print('🔄 نسخ مجلد client...', 'blue');

  try {
    const clientSrcDir = path.join(process.cwd(), 'client');
    const clientDestDir = path.join(process.cwd(), 'mysql-only', 'client');

    if (!fs.existsSync(clientSrcDir)) {
      print(`❌ مجلد client غير موجود: ${clientSrcDir}`, 'red');
      return false;
    }

    // استخدام أمر shell لنسخ المجلد بالكامل
    if (process.platform === 'win32') {
      execSync(`xcopy "${clientSrcDir}" "${clientDestDir}" /E /I /H`);
    } else {
      execSync(`cp -r "${clientSrcDir}" "${clientDestDir}"`);
    }

    print(`✅ تم نسخ مجلد client إلى: ${clientDestDir}`, 'green');
    return true;
  } catch (error) {
    print(`❌ خطأ في نسخ مجلد client: ${error.message}`, 'red');
    return false;
  }
}

// إنشاء dBuild.js
function createBuildScript() {
  print('🔄 إنشاء سكريبت البناء...', 'blue');

  const buildScriptContent = `/**
 * سكريبت بناء المشروع لرفعه على هوستنجر
 * يقوم هذا السكريبت ببناء الواجهة الأمامية والخادم بخطوة واحدة
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m'
};

// دالة طباعة ملونة
function log(message, color = 'reset') {
  console.log(\`\${colors[color] || colors.reset}\${message}\${colors.reset}\`);
}

// تنفيذ أمر مع معالجة الأخطاء
function exec(command, errorMessage) {
  try {
    log(\`> \${command}\`, 'blue');
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    log(errorMessage || \`خطأ في تنفيذ الأمر: \${command}\`, 'red');
    log(error.message, 'red');
    throw error;
  }
}

// دالة البناء الرئيسية
async function build() {
  try {
    // تأكد من وجود المجلدات اللازمة
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist', { recursive: true });
    }
    
    log('🚀 بدء عملية بناء المشروع للنشر على هوستنجر...', 'green');
    
    // بناء الواجهة الأمامية
    log('\\n📦 بناء الواجهة الأمامية...', 'blue');
    exec('cd client && npm run build', 'خطأ في بناء الواجهة الأمامية');
    
    // بناء الخادم
    log('\\n📦 بناء الخادم...', 'blue');
    exec('npm run build:server', 'خطأ في بناء الخادم');
    
    // إنشاء مجلد للتحميلات إذا لم يكن موجودًا
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads', { recursive: true });
      log('✅ تم إنشاء مجلد uploads', 'green');
    }

    // التأكد من وجود ملف .htaccess
    if (!fs.existsSync('.htaccess')) {
      log('⚠️ ملف .htaccess غير موجود، جاري إنشاء ملف افتراضي...', 'yellow');
      
      const htaccessContent = \`# Enable mod_rewrite
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # If the request is for an existing file, directory, or link, serve it
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d [OR]
    RewriteCond %{REQUEST_FILENAME} -l
    RewriteRule ^ - [L]

    # If the requested resource doesn't match the above, 
    # route to index.php (or node.js server) for processing
    RewriteRule ^ index.php [L]
</IfModule>

# Enable Gzip compression
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

# Set browser caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType text/javascript "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/x-icon "access plus 1 year"
    ExpiresByType application/font-woff "access plus 1 year"
    ExpiresByType application/x-font-ttf "access plus 1 year"
    ExpiresByType font/opentype "access plus 1 year"
</IfModule>

# PHP configuration
<IfModule mod_php8.c>
    php_value upload_max_filesize 10M
    php_value post_max_size 10M
    php_value memory_limit 256M
    php_value max_execution_time 300
    php_flag display_errors Off
    php_flag log_errors On
</IfModule>
\`;
      
      fs.writeFileSync('.htaccess', htaccessContent);
      log('✅ تم إنشاء ملف .htaccess', 'green');
    }

    // التأكد من وجود ملف index.php
    if (!fs.existsSync('index.php')) {
      log('⚠️ ملف index.php غير موجود، جاري إنشاء ملف افتراضي...', 'yellow');
      
      const indexPhpContent = \`<?php
/**
 * ملف الدخول الرئيسي للتطبيق على استضافة هوستنجر
 * يقوم بإعداد وتشغيل الخادم Node.js
 */

// تحميل ملف الإعدادات إذا كان موجوداً
$config = [];
if (file_exists('hostinger.config.js')) {
    $configContent = file_get_contents('hostinger.config.js');
    // استخراج الإعدادات من ملف JavaScript
    preg_match('/module\\.exports\\s*=\\s*({.*?})\\s*;?\\s*$/s', $configContent, $matches);
    if (!empty($matches[1])) {
        // تحويل النص إلى JSON صالح (مع إزالة التعليقات)
        $jsonConfig = preg_replace('/\\/\\/.*?\\n|\\/\\*.*?\\*\\//s', '', $matches[1]);
        $jsonConfig = preg_replace('/([a-zA-Z0-9_]+)\\s*:/m', '"$1":', $jsonConfig); // تحويل المفاتيح إلى سلاسل
        $jsonConfig = preg_replace('/,\\s*}/m', '}', $jsonConfig); // إزالة الفواصل الزائدة
        $jsonConfig = preg_replace('/,\\s*]/m', ']', $jsonConfig); // إزالة الفواصل الزائدة
        
        try {
            $config = json_decode($jsonConfig, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log('خطأ في تحليل ملف الإعدادات: ' . json_last_error_msg());
            }
        } catch (Exception $e) {
            error_log('خطأ في تحليل ملف الإعدادات: ' . $e->getMessage());
        }
    }
}

// تحديد اسم الملف التنفيذي للخادم
$serverFile = 'dist/server.js';
$unifiedServerFile = 'dist/unified.js';

// فحص ما إذا كان ملف الخادم الموحد موجوداً
if (file_exists($unifiedServerFile)) {
    $serverFile = $unifiedServerFile;
}

// التحقق من وجود ملف الخادم
if (!file_exists($serverFile)) {
    header('HTTP/1.1 500 Internal Server Error');
    echo '<h1>خطأ في تحميل الخادم</h1>';
    echo '<p>ملف الخادم غير موجود. يرجى التحقق من عملية البناء والرفع.</p>';
    exit;
}

// تحديد منفذ التشغيل
$port = isset($config['server']['port']) ? $config['server']['port'] : 5000;

// إعداد المتغيرات البيئية
putenv("NODE_ENV=production");
putenv("PORT=" . $port);

// تشغيل الخادم كعملية خلفية
$command = "node " . $serverFile . " > logs/server.log 2>&1 & echo $!";
$pid = shell_exec($command);

// الانتظار قليلاً للتأكد من تشغيل الخادم
sleep(2);

// التحقق من حالة الخادم
$isRunning = false;
if ($pid) {
    $status = shell_exec("ps -p " . trim($pid));
    $isRunning = strpos($status, trim($pid)) !== false;
}

if ($isRunning) {
    // إعادة توجيه الطلبات إلى الخادم
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $uri = $_SERVER['REQUEST_URI'];
    
    // إعادة توجيه الطلب إلى الخادم Node.js
    $nodeUrl = "http://localhost:" . $port . $uri;
    
    // إعداد cURL لتحويل الطلب
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $nodeUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    
    // نقل نفس طريقة الطلب والرؤوس
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    
    // نقل رؤوس الطلب
    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $header = str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower(substr($key, 5)))));
            if ($header != 'Host') { // تجنب إرسال رأس Host
                $headers[] = "$header: $value";
            }
        }
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    // نقل بيانات الطلب للطلبات POST و PUT
    if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
    }
    
    // تنفيذ الطلب
    $response = curl_exec($ch);
    
    if ($response === false) {
        header('HTTP/1.1 500 Internal Server Error');
        echo '<h1>خطأ في الاتصال بالخادم</h1>';
        echo '<p>فشل في الاتصال بالخادم: ' . curl_error($ch) . '</p>';
    } else {
        // استخراج رؤوس ومحتوى الاستجابة
        $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $header = substr($response, 0, $header_size);
        $body = substr($response, $header_size);
        
        // إرسال رؤوس الاستجابة
        $headerLines = explode("\\r\\n", $header);
        foreach ($headerLines as $headerLine) {
            if (strpos($headerLine, ':') !== false) {
                header($headerLine);
            }
        }
        
        // إرسال محتوى الاستجابة
        echo $body;
    }
    
    curl_close($ch);
} else {
    // في حالة فشل تشغيل الخادم
    header('HTTP/1.1 500 Internal Server Error');
    echo '<h1>خطأ في تشغيل الخادم</h1>';
    echo '<p>فشل في تشغيل الخادم Node.js. يرجى التحقق من السجلات للمزيد من المعلومات.</p>';
}
\`;
      
      fs.writeFileSync('index.php', indexPhpContent);
      log('✅ تم إنشاء ملف index.php', 'green');
    }
    
    log('\\n✅ تم بناء المشروع بنجاح!', 'green');
    log('الخطوات التالية:', 'yellow');
    log('1. قم برفع المشروع على استضافة هوستنجر', 'yellow');
    log('2. قم بإنشاء قاعدة بيانات MySQL على هوستنجر', 'yellow');
    log('3. قم بتحديث ملف hostinger.config.js ببيانات الاتصال الصحيحة', 'yellow');
    log('4. قم بتشغيل سكريبت التثبيت عن طريق الوصول إلى: https://your-domain.com/install/', 'yellow');
    
  } catch (error) {
    log('\\n❌ فشل في بناء المشروع', 'red');
    process.exit(1);
  }
}

// تنفيذ السكريبت
build().catch(error => {
  log(\`خطأ غير متوقع: \${error.message}\`, 'red');
  process.exit(1);
});
\`;
  
  const buildScriptPath = path.join(process.cwd(), 'mysql-only', 'build.js');
  fs.writeFileSync(buildScriptPath, buildScriptContent);
  print(`✅ تم إنشاء سكريبت البناء: ${buildScriptPath}`, 'green');
  
  return true;
}

// إنشاء ملف README.md
function createReadme() {
  print('🔄 إنشاء ملف README.md...', 'blue');
  
  const readmeContent = `# نظام الشهادات والبطاقات الإلكترونية (نسخة MySQL فقط)

هذه نسخة خاصة من النظام تعتمد فقط على MySQL وتم إزالة كل ما يتعلق بـ PostgreSQL والتخزين في الذاكرة، وهي مخصصة للنشر على استضافة هوستنجر.

## متطلبات التشغيل

- Node.js v16 أو أعلى
- MySQL 5.7 أو أعلى
- PHP 7.4 أو أعلى (على استضافة الويب)

## تثبيت وتشغيل المشروع محلياً

1. تثبيت اعتماديات المشروع:
   \`\`\`
   npm install
   \`\`\`

2. إنشاء ملف \`.env\` بناءً على \`.env.example\`:
   \`\`\`
   cp .env.example .env
   \`\`\`

3. تعديل ملف \`.env\` ببيانات الاتصال الصحيحة لقاعدة البيانات.

4. إنشاء قاعدة البيانات وتهيئتها:
   \`\`\`
   node scripts/fix-templates-query.js
   \`\`\`

5. إنشاء مستخدم المسؤول:
   \`\`\`
   node scripts/create-admin-user.js
   \`\`\`

6. تشغيل المشروع:
   \`\`\`
   npm run dev
   \`\`\`

## بناء المشروع للنشر

1. تشغيل سكريبت البناء:
   \`\`\`
   node build.js
   \`\`\`

2. ستجد المشروع المبني جاهزًا للرفع في المجلدات التالية:
   - \`dist\`: ملفات الخادم المُصرّفة
   - \`client/dist\`: ملفات الواجهة الأمامية المُصرّفة

## النشر على هوستنجر

1. قم برفع جميع ملفات المشروع إلى مجلد الويب على استضافة هوستنجر.

2. قم بإنشاء قاعدة بيانات MySQL على لوحة تحكم هوستنجر.

3. قم بإنشاء ملف \`hostinger.config.js\` بناءً على \`hostinger.config.example.js\`:
   \`\`\`
   cp hostinger.config.example.js hostinger.config.js
   \`\`\`

4. قم بتعديل ملف \`hostinger.config.js\` ببيانات الاتصال الصحيحة لقاعدة البيانات.

5. قم بالوصول إلى موقعك الإلكتروني عبر المتصفح، وسيتم تشغيل التطبيق تلقائيًا.

## إصلاح المشاكل الشائعة

راجع ملف \`شرح-إصلاح-المشاكل.md\` للحصول على معلومات حول إصلاح المشاكل الشائعة.

## معلومات تسجيل الدخول الافتراضية

- اسم المستخدم: \`admin\`
- كلمة المرور: \`700700\`

## توثيق إضافي

- \`دليل-نشر-هوستنجر.md\`: دليل تفصيلي للنشر على استضافة هوستنجر
- \`HOSTINGER-MYSQL-SETUP.md\`: دليل إعداد قاعدة بيانات MySQL على هوستنجر
`;

  const readmePath = path.join(process.cwd(), 'mysql-only', 'README.md');
  fs.writeFileSync(readmePath, readmeContent);
  print(`✅ تم إنشاء ملف README.md: ${readmePath}`, 'green');
  
  return true;
}

// تعديل package.json
function updatePackageJson() {
  print('🔄 تحديث ملف package.json...', 'blue');

  const packageJsonPath = path.join(process.cwd(), 'mysql-only', 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    print(`❌ ملف package.json غير موجود: ${packageJsonPath}`, 'red');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // تحديث الاسم والوصف
    packageJson.name = 'certificates-platform-mysql';
    packageJson.description = 'منصة الشهادات والبطاقات الإلكترونية (نسخة MySQL فقط)';
    
    // إزالة اعتماديات PostgreSQL
    const depsToRemove = [
      '@neondatabase/serverless',
      'postgres',
      'pg',
      '@types/pg',
      'connect-pg-simple'
    ];
    
    for (const dep of depsToRemove) {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        delete packageJson.dependencies[dep];
      }
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        delete packageJson.devDependencies[dep];
      }
    }
    
    // إضافة سكريبت بناء الخادم
    packageJson.scripts['build:server'] = 'tsc -p server/tsconfig.json';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    print(`✅ تم تحديث ملف package.json`, 'green');
    return true;
  } catch (error) {
    print(`❌ خطأ في تحديث ملف package.json: ${error.message}`, 'red');
    return false;
  }
}

// اختبار السكريبت
function runTests() {
  print('🔄 اختبار النسخة المعدلة...', 'blue');
  
  try {
    const mysqlOnlyDir = path.join(process.cwd(), 'mysql-only');
    const testsResult = [];
    
    // التحقق من وجود الملفات الرئيسية
    const requiredFiles = [
      'server/db.ts',
      'server/config.ts',
      'server/index.ts',
      'server/storage.ts',
      'server/init-db.ts',
      'server/auth.ts',
      'server/routes.ts',
      'shared/schema.ts',
      '.env.example',
      'README.md',
      'build.js'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(mysqlOnlyDir, file);
      if (fs.existsSync(filePath)) {
        testsResult.push(`✅ الملف موجود: ${file}`);
      } else {
        testsResult.push(`❌ الملف غير موجود: ${file}`);
      }
    }
    
    // اختبار محتوى الملفات
    const dbContent = fs.readFileSync(path.join(mysqlOnlyDir, 'server', 'db.ts'), 'utf8');
    if (dbContent.includes('useMySQL = true') && !dbContent.includes('inMemoryStore')) {
      testsResult.push('✅ ملف db.ts يستخدم MySQL فقط ولا يحتوي على تخزين في الذاكرة');
    } else {
      testsResult.push('❌ ملف db.ts لا يزال يحتوي على استدعاءات PostgreSQL أو تخزين في الذاكرة');
    }
    
    const configContent = fs.readFileSync(path.join(mysqlOnlyDir, 'server', 'config.ts'), 'utf8');
    if (configContent.includes(`type: 'mysql'`) && !configContent.includes('memoryMode: true')) {
      testsResult.push('✅ ملف config.ts يستخدم MySQL فقط ولا يحتوي على وضع الذاكرة');
    } else {
      testsResult.push('❌ ملف config.ts لا يزال يحتوي على إعدادات PostgreSQL أو وضع الذاكرة');
    }
    
    // عرض نتائج الاختبار
    print('\n=== نتائج اختبار النسخة المعدلة ===', 'blue');
    for (const result of testsResult) {
      if (result.startsWith('✅')) {
        print(result, 'green');
      } else {
        print(result, 'red');
      }
    }
    
    return testsResult.every(r => r.startsWith('✅'));
  } catch (error) {
    print(`❌ خطأ في اختبار النسخة المعدلة: ${error.message}`, 'red');
    return false;
  }
}

// إنشاء ملف zip
function createZipFile() {
  print('🔄 إنشاء ملف zip...', 'blue');
  
  try {
    const mysqlOnlyDir = path.join(process.cwd(), 'mysql-only');
    const zipFilePath = path.join(process.cwd(), 'certificates-platform-mysql-only.zip');
    
    // استخدام أمر shell لإنشاء ملف zip
    if (process.platform === 'win32') {
      execSync(`powershell Compress-Archive -Path "${mysqlOnlyDir}\\*" -DestinationPath "${zipFilePath}" -Force`);
    } else {
      execSync(`cd "${mysqlOnlyDir}" && zip -r "${zipFilePath}" ./*`);
    }
    
    print(`✅ تم إنشاء ملف zip: ${zipFilePath}`, 'green');
    return true;
  } catch (error) {
    print(`❌ خطأ في إنشاء ملف zip: ${error.message}`, 'red');
    return false;
  }
}

// السكريبت الرئيسي
async function main() {
  print('=== إنشاء نسخة MySQL فقط ===', 'blue');
  
  try {
    // إنشاء المجلد الرئيسي
    const mysqlOnlyDir = path.join(process.cwd(), 'mysql-only');
    createDirectoryIfNotExists(mysqlOnlyDir);
    
    // إنشاء الملفات المعدلة
    createMySQLOnlyDB();
    createConfigFile();
    createIndexFile();
    createStorageFile();
    createEnvFile();
    copySchemaFile();
    copyInitDbFile();
    copyOtherFiles();
    copyClientDirectory();
    createBuildScript();
    createReadme();
    updatePackageJson();
    
    // اختبار النسخة المعدلة
    const testPassed = runTests();
    
    if (testPassed) {
      // إنشاء ملف zip
      createZipFile();
      
      print(`
✅ تم إنشاء نسخة MySQL فقط بنجاح!

ملف ZIP الذي تم إنشاؤه: ${path.join(process.cwd(), 'certificates-platform-mysql-only.zip')}

يمكنك استخراج الملف وتشغيله على خادمك أو رفعه على استضافة هوستنجر.
للمزيد من المعلومات، اطلع على ملف README.md داخل النسخة المعدلة.
`, 'green');
    } else {
      print(`
⚠️ تم إنشاء النسخة، ولكن بعض الاختبارات فشلت.
يرجى مراجعة نتائج الاختبار أعلاه ومعالجة المشاكل قبل استخدام النسخة.
`, 'yellow');
    }
  } catch (error) {
    print(`❌ خطأ غير متوقع: ${error.message}`, 'red');
    console.error(error);
  }
}

// تنفيذ السكريبت
main().catch(error => {
  print(`❌ خطأ غير متوقع: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
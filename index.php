<?php
/**
 * نقطة دخول التطبيق على استضافة PHP (هوستنجر)
 * يستخدم لتشغيل تطبيق Node.js عبر PHP-FPM أو FastCGI
 * 
 * النسخة: 1.0.0
 * تاريخ: مايو 2025
 */

// تكوين المسارات
$appDirectory = __DIR__;
$distDirectory = __DIR__ . '/dist';
$uploadsDirectory = __DIR__ . '/uploads';
$fontsDirectory = __DIR__ . '/fonts';

// التحقق من وجود ملف .env
if (!file_exists($appDirectory . '/.env')) {
    die('<div style="text-align: center; font-family: Arial, sans-serif; margin: 50px auto; max-width: 600px;">
    <h1 style="color: #e74c3c;">خطأ في التكوين</h1>
    <p>ملف <code>.env</code> غير موجود. يرجى إنشاء هذا الملف وتكوينه بشكل صحيح.</p>
    <p>للمزيد من المعلومات، راجع <a href="docs/HOSTINGER-DEPLOYMENT-GUIDE.md">دليل النشر</a>.</p>
    </div>');
}

// التحقق مما إذا كانت هذه طلبات واجهة API
if (strpos($_SERVER['REQUEST_URI'], '/api/') === 0) {
    // التعامل مع طلبات API من خلال وحدة Node.js
    header('Content-Type: application/json');
    
    // تسجيل معلومات الطلب في ملف السجل
    $logMessage = date('Y-m-d H:i:s') . ' - API Request: ' . $_SERVER['REQUEST_URI'] . "\n";
    file_put_contents($appDirectory . '/logs/api_requests.log', $logMessage, FILE_APPEND);
    
    // تحميل المتغيرات البيئية (اختياري)
    $envVars = parse_ini_file($appDirectory . '/.env');
    foreach ($envVars as $key => $value) {
        putenv("$key=$value");
    }
    
    // يمكن تنفيذ أمر Node.js لمعالجة الطلب مباشرة
    // هذا مثال، قد تحتاج إلى تعديله بناءً على بنية التطبيق الخاص بك
    /*
    $nodeScript = $appDirectory . '/dist/server.js';
    $command = "node $nodeScript " . escapeshellarg($_SERVER['REQUEST_URI']);
    $output = shell_exec($command);
    echo $output;
    */
    
    // بدلاً من ذلك، يمكننا تقديم استجابة JSON بسيطة للاختبار
    echo json_encode([
        'error' => true,
        'message' => 'وضع API مباشرة من PHP غير مدعوم حاليًا. يرجى استخدام خادم Node.js المستقل.',
        'request_uri' => $_SERVER['REQUEST_URI']
    ]);
    exit;
}

// للمسارات غير الـ API، نحن نقدم ملفات الواجهة الثابتة
$requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// التعامل مع طلب للملفات الثابتة في مجلد dist
$distFilePath = $distDirectory . $requestPath;
if (file_exists($distFilePath) && !is_dir($distFilePath)) {
    // تحديد نوع MIME
    $extension = pathinfo($distFilePath, PATHINFO_EXTENSION);
    $contentType = 'text/html';
    
    switch ($extension) {
        case 'css':
            $contentType = 'text/css';
            break;
        case 'js':
            $contentType = 'application/javascript';
            break;
        case 'json':
            $contentType = 'application/json';
            break;
        case 'png':
            $contentType = 'image/png';
            break;
        case 'jpg':
        case 'jpeg':
            $contentType = 'image/jpeg';
            break;
        case 'svg':
            $contentType = 'image/svg+xml';
            break;
        case 'ico':
            $contentType = 'image/x-icon';
            break;
    }
    
    header("Content-Type: $contentType");
    readfile($distFilePath);
    exit;
}

// الملفات المرفوعة
if (strpos($requestPath, '/uploads/') === 0) {
    $uploadFilePath = $uploadsDirectory . str_replace('/uploads', '', $requestPath);
    if (file_exists($uploadFilePath) && !is_dir($uploadFilePath)) {
        $extension = strtolower(pathinfo($uploadFilePath, PATHINFO_EXTENSION));
        
        // تحديد نوع MIME للملفات المرفوعة
        $contentType = 'application/octet-stream';
        if ($extension === 'jpg' || $extension === 'jpeg') {
            $contentType = 'image/jpeg';
        } elseif ($extension === 'png') {
            $contentType = 'image/png';
        } elseif ($extension === 'pdf') {
            $contentType = 'application/pdf';
        }
        
        header("Content-Type: $contentType");
        readfile($uploadFilePath);
        exit;
    }
}

// الخطوط
if (strpos($requestPath, '/fonts/') === 0) {
    $fontFilePath = $fontsDirectory . str_replace('/fonts', '', $requestPath);
    if (file_exists($fontFilePath) && !is_dir($fontFilePath)) {
        $extension = strtolower(pathinfo($fontFilePath, PATHINFO_EXTENSION));
        
        // تحديد نوع MIME للخطوط
        $contentType = 'application/octet-stream';
        if ($extension === 'ttf') {
            $contentType = 'font/ttf';
        } elseif ($extension === 'woff') {
            $contentType = 'font/woff';
        } elseif ($extension === 'woff2') {
            $contentType = 'font/woff2';
        }
        
        header("Content-Type: $contentType");
        readfile($fontFilePath);
        exit;
    }
}

// إذا لم يتم العثور على أي ملف محدد، قم بعرض الصفحة الرئيسية (index.html)
$indexPath = $distDirectory . '/index.html';
if (file_exists($indexPath)) {
    readfile($indexPath);
} else {
    // إذا لم يتم العثور على صفحة index.html، اعرض رسالة خطأ
    echo '<div style="text-align: center; font-family: Arial, sans-serif; margin: 50px auto; max-width: 600px;">
    <h1 style="color: #e74c3c;">خطأ في التكوين</h1>
    <p>ملف <code>index.html</code> غير موجود في مجلد dist. يرجى التأكد من بناء التطبيق بشكل صحيح.</p>
    <p>للمزيد من المعلومات، راجع <a href="docs/HOSTINGER-DEPLOYMENT-GUIDE.md">دليل النشر</a>.</p>
    </div>';
}
?>
/**
 * سكريبت لإصلاح مشكلة استعلام count في ملف storage.ts
 * يقوم بتعديل الملف تلقائيًا لتصحيح خطأ "Cannot read properties of undefined (reading 'count')"
 */

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
function print(message, color = 'reset') {
  console.log(`${colors[color] || colors.reset}${message}${colors.reset}`);
}

/**
 * تصحيح مشكلة استعلام count في storage.ts
 */
function fixStorageCountQuery() {
  print('== سكريبت إصلاح مشكلة استعلام count ==', 'blue');
  
  // مسار ملف storage.ts
  const storagePath = path.join(process.cwd(), 'server', 'storage.ts');
  
  // التحقق من وجود الملف
  if (!fs.existsSync(storagePath)) {
    print(`❌ ملف storage.ts غير موجود في المسار: ${storagePath}`, 'red');
    return false;
  }
  
  print(`قراءة ملف: ${storagePath}`, 'blue');
  let content = fs.readFileSync(storagePath, 'utf8');
  
  // البحث عن المقطع المطلوب تعديله
  const problemPattern = /const \[\{ count \}\] = await db\s+\.select\(\{ count: sql<number>`count\(\*\)`[\s\S]*?return \{ templates: templatesData, total: Number\(count\) \};/;
  
  if (!problemPattern.test(content)) {
    print('⚠️ لم يتم العثور على المقطع المطلوب تعديله. تحقق من الملف يدويًا.', 'yellow');
    return false;
  }
  
  // إنشاء نسخة احتياطية من الملف
  const backupPath = `${storagePath}.backup-${Date.now()}`;
  fs.writeFileSync(backupPath, content);
  print(`✅ تم إنشاء نسخة احتياطية في: ${backupPath}`, 'green');
  
  // استبدال المقطع المطلوب
  const fixedContent = content.replace(
    problemPattern,
    `const countResult = await db
      .select({ count: sql<number>\`count(*)\` })
      .from(templates)
      .where(conditions.length ? and(...conditions) : sql\`1=1\`);

    const total = countResult.length > 0 ? Number(countResult[0].count) : 0;
    return { templates: templatesData, total };`
  );
  
  // حفظ الملف المعدل
  fs.writeFileSync(storagePath, fixedContent);
  print(`✅ تم تعديل الملف بنجاح`, 'green');
  
  return true;
}

// تنفيذ السكريبت
try {
  const success = fixStorageCountQuery();
  
  if (success) {
    print(`
✅ تم إصلاح مشكلة استعلام count بنجاح!

يجب إعادة تشغيل التطبيق لتطبيق التغييرات:
npm run dev

أو في حالة استخدام الخادم الموحد:
npm run dev:unified
    `, 'green');
  } else {
    print(`
❌ لم يتم إصلاح المشكلة بشكل تلقائي.

يمكنك إصلاح المشكلة يدويًا بتعديل ملف storage.ts حول السطر 773:

تغيير:
const [{ count }] = await db
  .select({ count: sql<number>\`count(*)\` })
  .from(templates)
  .where(conditions.length ? and(...conditions) : sql\`1=1\`);

return { templates: templatesData, total: Number(count) };

إلى:
const countResult = await db
  .select({ count: sql<number>\`count(*)\` })
  .from(templates)
  .where(conditions.length ? and(...conditions) : sql\`1=1\`);

const total = countResult.length > 0 ? Number(countResult[0].count) : 0;
return { templates: templatesData, total };
    `, 'yellow');
  }
} catch (error) {
  print(`❌ خطأ غير متوقع: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
}
/**
 * سكريبت لاختبار نظام تتبع الأخطاء
 */

import { logger } from '../server/lib/error-tracker';

async function testErrorLogger() {
  console.log('بدء اختبار نظام تتبع الأخطاء...');
  
  try {
    // اختبار تسجيل معلومات
    await logger.info('هذه رسالة معلومات للاختبار', { source: 'test-script' });
    console.log('✅ تم تسجيل معلومات');
    
    // اختبار تسجيل تحذير
    await logger.warn('هذا تحذير للاختبار', { source: 'test-script' });
    console.log('✅ تم تسجيل تحذير');
    
    // اختبار تسجيل خطأ
    await logger.error('هذا خطأ للاختبار', { source: 'test-script' });
    console.log('✅ تم تسجيل خطأ');
    
    // اختبار تسجيل خطأ حقيقي
    try {
      throw new Error('خطأ تجريبي مقصود للاختبار');
    } catch (error) {
      await logger.error(error as Error, { source: 'test-script', details: 'هذا خطأ تم إنشاؤه عمداً للاختبار' });
      console.log('✅ تم تسجيل كائن خطأ');
    }
    
    // اختبار تسجيل خطأ حرج
    await logger.critical('هذا خطأ حرج للاختبار', { source: 'test-script', importance: 'high' });
    console.log('✅ تم تسجيل خطأ حرج');
    
    // اختبار تسجيل خطأ من العميل
    await logger.clientError('خطأ من واجهة المستخدم للاختبار', { 
      browser: 'Chrome', 
      source: 'test-script',
      url: '/dashboard',
      component: 'UserProfile'
    });
    console.log('✅ تم تسجيل خطأ من العميل');
    
    console.log('✅ تم إكمال جميع اختبارات تسجيل الأخطاء بنجاح');
  } catch (error) {
    console.error('❌ فشل اختبار نظام تتبع الأخطاء:', error);
  }
}

// تنفيذ الاختبار
testErrorLogger()
  .then(() => {
    console.log('اكتمل الاختبار');
    process.exit(0);
  })
  .catch((err) => {
    console.error('حدث خطأ غير متوقع:', err);
    process.exit(1);
  });
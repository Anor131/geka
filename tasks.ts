
export interface Task {
  id: string;
  label: string;
  executor: 'cmd' | 'python' | 'ai' | 'ffmpeg' | 'whisper' | 'plugin' | 'web_agent' | 'coder' | 'cleaner';
  description: string;
  isSensitive?: boolean;
  scriptPath?: string;
  version?: string;
  acceptedMimeTypes?: string[];
}

export const TASK_REGISTRY: Record<string, Task[]> = {
  web: [
    { id: 'open_chrome', label: 'فتح جوجل كروم', executor: 'cmd', description: 'تشغيل متصفح جوجل كروم فوراً', isSensitive: false },
    { id: 'google_search_cmd', label: 'بحث سريع في جوجل', executor: 'cmd', description: 'فتح كروم والبحث عن موضوع محدد', isSensitive: false },
    { id: 'web_browse', label: 'تصفح موقع محدد', executor: 'cmd', description: 'فتح رابط مباشر في المتصفح الافتراضي' },
    { id: 'email_login', label: 'دخول الإيميل', executor: 'web_agent', description: 'دخول البريد وقراءة الرسائل الجديدة', isSensitive: true },
    { id: 'site_register', label: 'تسجيل بموقع', executor: 'web_agent', description: 'إنشاء حساب جديد بناءً على بياناتك', isSensitive: true }
  ],
  clean: [
    { id: 'cache_purge', label: 'تنظيف الكاش العميق', executor: 'cleaner', description: 'مسح الملفات المؤقتة وسجلات النظام لتسريع الأداء', isSensitive: true },
    { id: 'memory_boost', label: 'تحسين الذاكرة (RAM)', executor: 'cleaner', description: 'إغلاق العمليات غير الضرورية وتحرير مساحة الذاكرة' },
    { id: 'registry_fix', label: 'إصلاح السجلات', executor: 'cleaner', description: 'فحص وإصلاح أخطاء سجلات النظام (Registry)', isSensitive: true },
    { id: 'disk_analyzer', label: 'تحليل المساحة', executor: 'ai', description: 'تحليل ذكي للملفات الكبيرة واقتراح ما يمكن حذفه' }
  ],
  dev: [
    { id: 'full_app_gen', label: 'توليد مشروع كامل', executor: 'coder', description: 'إنشاء هيكلية تطبيق كاملة مع الملفات الأساسية' },
    { id: 'android_custom', label: 'Android App مخصص', executor: 'coder', description: 'تصميم وبرمجة واجهات أندرويد بلغة Kotlin/Compose' },
    { id: 'ui_modernizer', label: 'تصميم واجهة', executor: 'ai', description: 'توليد واجهات عصرية باستخدام Tailwind CSS/Next.js' }
  ],
  smart: [
    { id: 'tool_advisor', label: 'شنو أحسن أداة؟', executor: 'ai', description: 'مقارنة فنية بين الأدوات واختيار الأنسب لمشروعك' },
    { id: 'roadmap_gen', label: 'شنو الخطوة الجاية؟', executor: 'ai', description: 'رسم خارطة طريق ذكية بناءً على تقدمك الحالي' },
    { id: 'risk_scanner', label: 'هذا خطر لو لا؟', executor: 'ai', description: 'تحليل أمني للأكواد أو الأوامر المشبوهة', isSensitive: true }
  ],
  media: [
    { id: 'vid_to_aud', label: 'فيديو ← صوت', executor: 'ffmpeg', description: 'استخراج صوت عالي الجودة من الفيديو' },
    { id: 'aud_to_txt', label: 'صوت ← نص', executor: 'whisper', description: 'تحويل الكلام إلى نص بدقة عالية' }
  ],
  system: [
    { id: 'system_optimization', label: 'تحديث التعريفات', executor: 'cmd', description: 'البحث عن تحديثات برامج التشغيل الضرورية', isSensitive: true },
    { id: 'process_scan', label: 'فحص العمليات', executor: 'cmd', description: 'مراقبة البرامج التي تستهلك موارد الجهاز' }
  ]
};

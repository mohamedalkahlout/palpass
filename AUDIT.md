# PALPASS — تقرير تدقيق الواجهة (المرحلة 1)

تاريخ المسح: 4 أكتوبر 2026. المسح ثابت على الشيفرة الحالية. لم يُغيَّر منطق مالي ولا أي RPC. آخر بناء إنتاجي ناجح: 96 صفحة.

هذا التقرير يرصد ما يجب أن تعالجه المراحل 3–10. المرحلة 2 تضبط التوكنز والخطوط فقط، ولا تعيد رسم المكونات.

## 1. مظاهر القالب المستهلك

### تدرجات لونية
- `src/components/sections/HeroSection.js`: عنوان الصفحة الرئيسية يستخدم `bg-gradient-to-b ... bg-clip-text text-transparent`، مع طبقة `bg-gradient-to-b` فوق المشهد.
- أزرار الإجراء في خدمات مجلس الوزراء (العطاءات، المساعدات، القدس، الشكاوى، رخصة القيادة) تستخدم `bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900`.
- بطاقة رخصة القيادة في `DrivingLicenseClient.js` خلفية `bg-gradient-to-br from-emerald-950 via-emerald-900`.

### بقع ضبابية وزجاج
- `HeroSection.js` السطر الذي يرسم `rounded-full ... blur-3xl` بقعة ضوئية في منتصف البطل.
- `DESIGN.md` الحالي يوصي صراحة بـ `backdrop-blur-md` و`backdrop-blur-xl` و`bg-white/80`. هذا يتعارض مع الاتجاه المؤسسي في `DESIGN-BRIEF.md`.
- شريط التنقل المدني `CivicBreadcrumbs.jsx` وعدد من ترويسات الخدمات يستخدمون `backdrop-blur-md` أو `backdrop-blur-xl`.
- نوافذ `GuestAuthModal.jsx` و`SovereignConfirmModal.jsx` تغطي الصفحة بـ `backdrop-blur-md`. المنطق يبقى؛ المعالجة البصرية مؤجلة للمرحلة 4 من المكونات.

### حواف وظلال
- `--radius` في `globals.css` مضبوط على `1rem`، ثم تُشتق منه `radius-2xl` و`radius-3xl` حتى `2.6rem`.
- `rounded-3xl` و`rounded-2xl` مكررة في كل عملاء الخدمات تقريباً (التعليم، العائلة، الضرائب، الشكاوى، العطاءات، المستشفيات، رخصة القيادة، الحدود، الفواتير).
- ظلال ملونة مثل `shadow-emerald-950/20` و`shadow-2xl` على البطاقات والنوافذ.

### أيقونات وشبكات متطابقة
- `ServicesGrid.js` شبكة بطاقات متساوية، كل بطاقة أيقونة Lucide بحجم `h-6 w-6` داخل الحاوية نفسها. لا إيموجي في هذه الشبكة.
- لا توجد طبقة `ServicePage` موحدة: كل عميل خدمة يعيد ترويسة خاصة (ختم + عنوان + `TatreezDivider` + زر).

### البطل والنبرة
- `HeroSection.js` تخطيط وسطي: شارة، عنوان ضخم، فقرة، ثم أزرار. الإحصاءات في البطل ليست جداول قيود.
- `DESIGN.md` يشجع رفع البطاقة `hover:-translate-y-0.5`، وهي حركة استعراضية لا حركة إجراء.

## 2. مكونات مكررة بقيم صلبة

| النمط | أين يتكرر | القيمة الصلبة |
|---|---|---|
| ترويسة الخدمة | عملاء `/services/*` | `rounded-3xl border-2 ... p-6 text-center` |
| زر الإجراء | العطاءات، المساعدات، الشكاوى، القدس | تدرج زمردي + `rounded-2xl` + `shadow-xl` |
| شارة الاعتماد | أربعة نماذج مجلس الوزراء | `border-amber-500/40 bg-amber-500/10` بدلاً من `--warning` |
| الذهب الرسمي | الطوابع والخطوات | خليط `#b45309` و`amber-600` و`#C5A059` |
| النص الثانوي | معظم العملاء | `#334155` و`#64748b` مباشرة لا `--text-muted` |
| الخلفية | صفحات الخدمات | `bg-[#fafaf9]` مكتوبة يدوياً لا `bg-background` |

`CivicServiceShell.js` موجود ولا تستخدمه صفحات مجلس الوزراء والمستشفيات والرخصة. النوافذ (`dialog.jsx`، `GuestAuthModal`، `SovereignConfirmModal`) ثلاث هياكل لا إطار واحد.

## 3. الاتجاه (RTL)

`html` يضبط `dir` حسب اللغة، وهذا صحيح. ما زالت خصائص فيزيائية في واجهات ظاهرة:

- `src/app/[locale]/auth/register/page.js` (نحو 12 موضعاً)
- `src/app/[locale]/auth/login/page.js` (نحو 7)
- `src/app/[locale]/dashboard/page.js` (نحو 8)
- `src/app/[locale]/services/government/page.js`
- `src/components/ui/dropdown-menu.jsx` و`button.jsx` و`dialog.jsx` (مكتبة shadcn؛ جزء منها `left-1/2` للتمركز لا للهامش)

`HeroSection.js` يبدل `ArrowLeft` و`ArrowRight` حسب اللغة. هذا انعكاس يدوي صحيح، لكنه ليس خاصية منطقية. بقية الأسهم في الصفحات لا تمر كلها على هذا الفحص.

Tailwind v4 يوفّر `ms-*` و`me-*` و`ps-*` و`pe-*`. الطبقة الأساسية لم تكن تفرضها.

## 4. الوضع الداكن

- `:root` و`.dark` في `globals.css` يستخدمان لوحة أردواز (`#0f172a` / `#090d16` / `#475569`) لا توكنز الحجر والفحم في الموجز (`#1c1917`، `#0c0f0e`، `#26302c`).
- `--muted-foreground` في الداكن `#e2e8f0`، وهو قريب من النص الأساسي فيضعف معنى «ثانوي».
- `--gold` الفاتح `#c5a059` والداكن `#d4af37`، بينما الختم المعتمد `#b45309` / `#f59e0b`.
- `ThemeProvider` في `src/app/[locale]/layout.js` يعتمد `defaultTheme="system"` مع `suppressHydrationWarning`. next-themes يحقن سكربت السمة، لكن لا توجد قراءة صريحة مبكرة مستقلة عن المكتبة، ووميض السمة ما زال خطراً عند أول رسم.
- شعار النسر صورة محلية. لم يُفحص بعد تباين خلفيتها البيضاء على السطح الداكن `#141917`؛ هذا بند المرحلة 4.

## 5. SEO الحالي

- `src/app/[locale]/layout.js` يضبط عنواناً ووصفاً وصورة Open Graph. لا قالب `%s | PALPASS — دولة فلسطين`، ولا `alternates.languages` لـ `ar-PS` و`en`، ولا `canonical` لكل مسار.
- `src/lib/seo/government-metadata.js` يخدم صفحات خدمات كثيرة بـ `generateMetadata` وJSON-LD من نوع خدمة. ليست كل الصفحات تمر عليه (الرئيسية، لوحة التحكم، الملف).
- لا يوجد `src/app/sitemap.ts`.
- لا يوجد `src/app/robots.ts`.
- لا يوجد `BreadcrumbList` في فتات التنقل. `GovernmentOrganization` غير مركّب على الرئيسية ككائن مستقل موثّق في الموجز.
- مسارا `/verify` و`/track` و`/help` و`/accessibility` غير موجودين. التحقق الحالي API فقط: `/api/verify`.

## 6. الخطوط

- `globals.css` يسمّي Inter وCairo و«عام الجمل» عبر `local()` فقط. لا ملف خط داخل المستودع، لذلك البناء لا يجلب خطاً، والواجهة تسقط إلى Segoe UI / Tahoma.
- هذا يحقق عدم الاتصال بـ Google Fonts، ولا يحقق خط IBM Plex Sans Arabic ولا Noto Naskh Arabic المحليين المطلوبين في المرحلة 2.

## 7. ما لم يُمس في هذا التدقيق

دوال RPC السبع، المحفظة، نوافذ الضيف والتأكيد، و`useAccreditationGate` تبقى على منطقها. عدد المسارات المستهدف بقاؤه 96 إلى أن تبدأ المرحلة 8 بإضافة مسارات جديدة عن قصد.

import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { routing } from "@/i18n/routing";
import { GovHeader } from "@/components/ui/GovHeader";
import { CivicBreadcrumbs } from "@/components/ui/CivicBreadcrumbs";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthModalProvider } from "@/context/AuthModalContext";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";

const plexArabic = localFont({
  src: [
    { path: "../../fonts/ibm-plex-sans-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-arabic-500.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-arabic-600.woff2", weight: "600", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-arabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
  fallback: ["Segoe UI", "Tahoma", "sans-serif"],
  adjustFontFallback: false,
});

const naskhArabic = localFont({
  src: [
    { path: "../../fonts/noto-naskh-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/noto-naskh-arabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-naskh",
  display: "swap",
  fallback: ["Times New Roman", "serif"],
  adjustFontFallback: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const title = isAr
    ? "PALPASS | منصة الهوية الرقمية والخدمات الحكومية — دولة فلسطين"
    : "PALPASS | National Digital Identity & e-Government Platform — State of Palestine";
  const description = isAr
    ? "المنظومة الوطنية الموحدة للهوية الرقمية والخدمات الحكومية الإلكترونية في دولة فلسطين. دخول آمن برقم الهوية الوطنية المكوّن من تسعة أرقام، ومحفظة رقمية بالشيكل، ومعاملات سيادية موثّقة."
    : "The official national digital identity and e-government platform of the State of Palestine. Secure access via the 9-digit National ID, a unified ILS wallet, and sovereign civic services.";

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://palpass.pna.ps"),
    title,
    description,
    applicationName: "PALPASS",
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ar: "/ar",
        en: "/en",
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/icon.png", sizes: "32x32", type: "image/png" },
      ],
      apple: "/apple-icon.png",
    },
    openGraph: {
      type: "website",
      locale: isAr ? "ar_PS" : "en_PS",
      siteName: "PALPASS",
      title,
      description,
      url: `/${locale}`,
      images: [
        {
          url: "/images/branding/palpass-logo.png",
          width: 512,
          height: 512,
          alt: "PALPASS",
        },
        {
          url: "/images/branding/palestine-eagle.png",
          alt: isAr ? "شعار دولة فلسطين" : "Coat of arms of the State of Palestine",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@PALPASS",
      title,
      description,
      images: [
        "/images/branding/palpass-logo.png",
        "/images/branding/palestine-eagle.png",
      ],
    },
  };
}

export default async function LocaleLayout({ children, params }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  if (!routing.locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const isArabic = locale === "ar";

  return (
    <html
      lang={locale}
      dir={isArabic ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
      className={`${plexArabic.variable} ${naskhArabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((t!=='light')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',!!d);}catch(e){}})();",
          }}
        />
      </head>
      <body
        className={`${plexArabic.className} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AuthProvider>
              <AuthModalProvider>
                <GovHeader />
                <CivicBreadcrumbs />
                <main id="main" className="relative z-0 mx-auto w-full min-w-0 flex-1">
                  {children}
                </main>
                <Footer />
                <Toaster richColors position="top-center" />
              </AuthModalProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

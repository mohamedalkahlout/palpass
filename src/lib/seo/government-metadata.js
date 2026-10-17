const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://palpass.pna.ps";

/**
 * Localized metadata for government service pages (title, OG, hreflang).
 */
export function governmentServiceMetadata({
  locale,
  path,
  titleAr,
  titleEn,
  descAr,
  descEn,
}) {
  const isAr = locale === "ar";
  const title = isAr ? titleAr : titleEn;
  const description = isAr ? descAr : descEn;
  const normalized = path.startsWith("/") ? path : `/${path}`;

  return {
    metadataBase: new URL(APP_URL),
    title,
    description,
    alternates: {
      canonical: `/${locale}${normalized}`,
      languages: {
        ar: `/ar${normalized}`,
        en: `/en${normalized}`,
      },
    },
    openGraph: {
      type: "website",
      locale: isAr ? "ar_PS" : "en_PS",
      siteName: "PALPASS",
      title,
      description,
      url: `/${locale}${normalized}`,
      images: [
        {
          url: "/images/branding/palestine-eagle.png",
          alt: isAr ? "شعار دولة فلسطين" : "Coat of arms of the State of Palestine",
        },
      ],
    },
  };
}

/**
 * schema.org GovernmentService JSON-LD payload.
 */
export function governmentServiceJsonLd({
  locale,
  nameAr,
  nameEn,
  descriptionAr,
  descriptionEn,
  path,
}) {
  const isAr = locale === "ar";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = APP_URL.replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    name: isAr ? nameAr : nameEn,
    description: isAr ? descriptionAr : descriptionEn,
    url: `${base}/${locale}${normalized}`,
    serviceType: isAr ? "خدمة حكومية إلكترونية" : "Digital government service",
    provider: {
      "@type": "GovernmentOrganization",
      name: isAr ? "دولة فلسطين — الأمانة العامة لمجلس الوزراء" : "State of Palestine — Prime Minister's Office",
      url: base,
    },
    areaServed: {
      "@type": "Country",
      name: isAr ? "فلسطين" : "Palestine",
      identifier: "PS",
    },
    termsOfService: `${base}/${locale}/terms`,
    image: `${base}/images/branding/palestine-eagle.png`,
  };
}

/**
 * schema.org GovernmentOrganization JSON-LD payload for the sovereign gateway.
 */
export function governmentOrganizationJsonLd({ locale }) {
  const isAr = locale === "ar";
  const base = APP_URL.replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    "@id": `${base}/#organization`,
    name: isAr ? "دولة فلسطين" : "State of Palestine",
    alternateName: isAr ? "الأمانة العامة لمجلس الوزراء" : "Palestinian Prime Minister's Office",
    url: base,
    logo: `${base}/brand/national-emblem.svg`,
    image: `${base}/images/branding/palestine-eagle.png`,
    areaServed: {
      "@type": "Country",
      name: isAr ? "فلسطين" : "Palestine",
      identifier: "PS",
    },
    brand: {
      "@type": "Brand",
      name: "PALPASS",
      logo: `${base}/brand/palpass-logo.svg`,
    },
  };
}

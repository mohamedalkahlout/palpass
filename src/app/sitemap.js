const BASE = (process.env.NEXT_PUBLIC_APP_URL || "https://palpass.pna.ps").replace(/\/$/, "");

const LOCALES = ["ar", "en"];

const DAILY = "daily";
const WEEKLY = "weekly";
const MONTHLY = "monthly";

const SERVICE_PATHS = [
  "/services/aid",
  "/services/aid-ration",
  "/services/bills",
  "/services/border",
  "/services/cabinet-aid",
  "/services/complaints",
  "/services/driving-license",
  "/services/education",
  "/services/family",
  "/services/gazette",
  "/services/government",
  "/services/hajj",
  "/services/health-records",
  "/services/healthcare",
  "/services/hospitals",
  "/services/jerusalem-fund",
  "/services/justice",
  "/services/licenses",
  "/services/reports",
  "/services/tax-clearance",
  "/services/tenders",
  "/services/violations",
];

const DAILY_TRANSIT_PATHS = ["/transport/buses", "/transport/taxis"];

const CORE_PORTAL_PATHS = ["/verify", "/track"];

const CONTENT_PATHS = ["/about", "/news", "/charity", "/transport", "/restaurants", "/jobs"];

const LEGAL_PATHS = ["/terms", "/privacy"];

function entry(path, changeFrequency, priority) {
  const href = path === "/" ? "" : path;
  return LOCALES.map((locale) => ({
    url: `${BASE}/${locale}${href}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: {
        ar: `${BASE}/ar${href}`,
        en: `${BASE}/en${href}`,
        "x-default": `${BASE}/en${href}`,
      },
    },
  }));
}

export default function sitemap() {
  return [
    ...entry("/", DAILY, 1.0),
    ...SERVICE_PATHS.flatMap((path) => entry(path, DAILY, 0.9)),
    ...DAILY_TRANSIT_PATHS.flatMap((path) => entry(path, DAILY, 0.9)),
    ...CORE_PORTAL_PATHS.flatMap((path) => entry(path, DAILY, 0.9)),
    ...CONTENT_PATHS.flatMap((path) => entry(path, WEEKLY, 0.7)),
    ...LEGAL_PATHS.flatMap((path) => entry(path, MONTHLY, 0.7)),
  ];
}
export default function manifest() {
  return {
    name: "PALPASS | منصة الهوية الرقمية والخدمات الحكومية",
    short_name: "PALPASS",
    description: "منظومة الهوية الرقمية والخدمات الحكومية الإلكترونية — دولة فلسطين",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#047857",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icon.png", sizes: "32x32", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

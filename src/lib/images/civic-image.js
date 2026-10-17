export function civicImageSrc(src) {
  if (typeof src !== "string") return null;
  const value = src.trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (!url.hostname.endsWith(".supabase.co")) return null;
    if (!url.pathname.startsWith("/storage/v1/object/public/")) return null;
    return value;
  } catch {
    return null;
  }
}

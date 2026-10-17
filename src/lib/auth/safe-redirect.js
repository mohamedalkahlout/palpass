export function sanitizeRedirect(url, fallback = "/dashboard") {
  if (!url || typeof url !== "string") return fallback;
  const value = url.trim();
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://") ||
    value.toLowerCase().includes("http:") ||
    value.toLowerCase().includes("https:")
  ) {
    return fallback;
  }
  return value;
}

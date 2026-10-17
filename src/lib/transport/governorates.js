export const GOVERNORATES = [
  { id: "all", aliases: [] },
  { id: "jerusalem", aliases: ["jerusalem", "القدس", "al-quds", "alquds"] },
  { id: "ramallah", aliases: ["ramallah", "رام الله", "رام الله والبيرة"] },
  { id: "gaza", aliases: ["gaza", "غزة"] },
  { id: "hebron", aliases: ["hebron", "الخليل"] },
  { id: "nablus", aliases: ["nablus", "نابلس"] },
  { id: "deir_al_balah", aliases: ["deir al-balah", "deir al balah", "دير البلح"] },
  { id: "bethlehem", aliases: ["bethlehem", "بيت لحم"] },
  { id: "jericho", aliases: ["jericho", "أريحا"] },
  { id: "jenin", aliases: ["jenin", "جنين"] },
  { id: "khan_yunis", aliases: ["khan yunis", "khan younis", "خان يونس"] },
  { id: "rafah", aliases: ["rafah", "رفح"] },
];

export function governorateId(value) {
  const needle = String(value || "").trim().toLowerCase();
  if (!needle) return null;
  const hit = GOVERNORATES.find(
    (item) => item.id !== "all" && item.aliases.some((alias) => alias.toLowerCase() === needle)
  );
  return hit?.id || null;
}

export function matchesGovernorate(value, id) {
  if (!id || id === "all") return true;
  const resolved = governorateId(value);
  if (resolved) return resolved === id;
  const needle = String(value || "").trim().toLowerCase();
  const item = GOVERNORATES.find((entry) => entry.id === id);
  return Boolean(item?.aliases.some((alias) => needle.includes(alias.toLowerCase())));
}

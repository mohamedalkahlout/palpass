import fs from "fs";
import path from "path";

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk("src");
const issues = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const importMatch = text.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/g) || [];
  const imported = new Set();
  for (const block of importMatch) {
    const inner = block.match(/\{([^}]+)\}/)[1];
    for (const part of inner.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) imported.add(name);
    }
  }

  // Collect JSX component usages that look like Lucide (PascalCase, common icon patterns)
  const jsxTags = [...text.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map((m) => m[1]);
  const localDecls = new Set();
  for (const m of text.matchAll(/(?:function|const|class)\s+([A-Z][A-Za-z0-9]*)/g)) {
    localDecls.add(m[1]);
  }
  for (const m of text.matchAll(/import\s+(\w+)\s+from/g)) localDecls.add(m[1]);
  for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](?!lucide-react)[^"']+["']/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) localDecls.add(name);
    }
  }

  // Only flag tags that are also imported from lucide elsewhere OR end with common icon suffixes
  // and appear without being imported/declared in this file
  const lucideLike = jsxTags.filter((tag) => {
    if (localDecls.has(tag) || imported.has(tag)) return false;
    // Heuristic: Icon suffix or known lucide names used in this codebase
    return /Icon$|^(Bell|Menu|X|ChevronDown|LayoutDashboard|ShieldCheck|Utensils|Bus|Briefcase|Heart|Globe|Newspaper|HeartPulse|LogIn|User|LogOut|Landmark|FileWarning|Building2|Mail|Phone|MapPin|Map|FileText|Upload|CreditCard|Loader2|Eye|EyeOff|KeyRound|Fingerprint|Moon|Sun|ArrowLeft|ArrowRight|Car|Stethoscope|CheckCircle|Clock|AlertCircle|Zap|Waves|Wifi|AlertTriangle|FileWarning|Coins|TrendingUp|Store|CheckCircle2|PackageOpen|Info|Search|Tag|Share2|Route|ChefHat|CalendarPlus|FileSignature|CalendarSearch)$/.test(
      tag
    );
  });

  const unique = [...new Set(lucideLike)];
  if (unique.length) issues.push({ file, missing: unique });
}

if (issues.length === 0) {
  console.log("OK: no missing Lucide icon imports detected");
} else {
  console.log("MISSING ICON IMPORTS:");
  for (const issue of issues) {
    console.log(`- ${issue.file}: ${issue.missing.join(", ")}`);
  }
  process.exitCode = 1;
}

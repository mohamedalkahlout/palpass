/**
 * ESM loader for PALPASS auth lifecycle tests.
 * Maps @/ → src/ and stubs Next.js server-only modules.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");

const stubs = new Map([
  [
    "next/cache",
    `export function revalidatePath() {}
export function revalidateTag() {}
export function unstable_cache(fn) { return fn; }`,
  ],
  [
    "next/headers",
    `const jar = globalThis.__PALPASS_TEST_COOKIES__ || { store: new Map() };
export function cookies() {
  return Promise.resolve({
    getAll() {
      return [...jar.store.entries()].map(([name, value]) => ({ name, value }));
    },
    get(name) {
      const value = jar.store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name, value) {
      jar.store.set(name, typeof value === "object" && value !== null && "value" in value ? value.value : value);
    },
    delete(name) {
      jar.store.delete(name);
    },
  });
}
export function headers() {
  return Promise.resolve(new Headers());
}`,
  ],
  [
    "next/navigation",
    `export function redirect() {
  const err = new Error("NEXT_REDIRECT");
  err.digest = "NEXT_REDIRECT";
  throw err;
}
export function notFound() {
  const err = new Error("NEXT_NOT_FOUND");
  err.digest = "NEXT_NOT_FOUND";
  throw err;
}
export function useRouter() { return { push() {}, replace() {}, refresh() {} }; }
export function usePathname() { return "/"; }
export function useSearchParams() { return new URLSearchParams(); }`,
  ],
]);

function resolveSrc(specifier) {
  const rel = specifier.slice(2);
  const abs = path.join(srcRoot, rel);
  const candidates = [
    abs,
    `${abs}.js`,
    `${abs}.jsx`,
    `${abs}.mjs`,
    `${abs}.ts`,
    `${abs}.tsx`,
    path.join(abs, "index.js"),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return pathToFileURL(c).href;
      }
    } catch {
      // continue
    }
  }
  return pathToFileURL(`${abs}.js`).href;
}

export async function resolve(specifier, context, nextResolve) {
  if (stubs.has(specifier)) {
    return {
      shortCircuit: true,
      url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stubs.get(specifier))}`,
    };
  }

  if (specifier.startsWith("@/")) {
    return {
      shortCircuit: true,
      url: resolveSrc(specifier),
    };
  }

  return nextResolve(specifier, context);
}

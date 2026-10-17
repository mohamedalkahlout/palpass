/**
 * PALPASS — Global Runtime Reliability Instrumentation
 * Protects Next.js runtime against process termination from transient socket disconnects (e.g. ECONNRESET).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      const msg = reason?.message || String(reason);
      if (
        msg.includes("fetch failed") ||
        msg.includes("ECONNRESET") ||
        msg.includes("Client network socket disconnected")
      ) {
        console.warn("[Handled Transient Network Disconnect]:", msg);
        return;
      }
      console.error("[Handled Global Rejection]:", msg);
    });

    process.on("uncaughtException", (err) => {
      if (
        err?.code === "ECONNRESET" ||
        err?.message?.includes("fetch failed") ||
        err?.message?.includes("Client network socket disconnected")
      ) {
        console.warn("[Handled Transient Socket Drop]:", err.message);
        return;
      }
      console.error("[Handled Process Exception]:", err);
    });
  }
}

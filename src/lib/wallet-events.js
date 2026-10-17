export function notifyWalletUpdated(newBalance) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("palpass-wallet-updated", {
      detail: { newBalance: newBalance ?? null },
    })
  );
}

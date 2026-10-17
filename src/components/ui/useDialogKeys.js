"use client";

import { useEffect, useRef } from "react";

export function useDialogKeys(open, onDismiss) {
  const dialogRef = useRef(null);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!open) return undefined;
    const root = dialogRef.current;
    if (!root) return undefined;
    const previous = document.activeElement;
    const items = () =>
      [...root.querySelectorAll("a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)")];
    const first = items()[0] || root;
    first.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const list = items();
      if (!list.length) return;
      const start = list[0];
      const end = list[list.length - 1];
      if (event.shiftKey && document.activeElement === start) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        start.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, [open]);

  return dialogRef;
}

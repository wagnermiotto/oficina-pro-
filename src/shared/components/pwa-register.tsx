"use client";

import { useEffect } from "react";

/** Registra o service worker do PWA (apenas em produção/HTTPS). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const registrar = () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* falha de registro não deve quebrar o app */
      });
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  }, []);

  return null;
}

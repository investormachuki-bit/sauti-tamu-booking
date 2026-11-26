"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function AdminPwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    navigator.serviceWorker
      .register("/admin/sw.js", { scope: "/admin/", updateViaCache: "none" })
      .catch((error) => console.error("Admin PWA service worker registration failed:", error));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowIosHelp(false);
    };

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!cancelled && isIos && !isStandalone) setShowIosHelp(true);
    if (isStandalone) setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  if (installed) return null;

  if (installPrompt) {
    return (
      <div className="fixed bottom-5 right-5 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-[var(--st-border)] bg-white p-3 shadow-xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--st-bg-soft)] text-sm font-black text-[var(--st-red)]">ST</div>
        <div className="min-w-0">
          <p className="m-0 text-xs font-bold text-[var(--st-charcoal-dark)]">Install Sauti Tamu Admin</p>
          <p className="m-0 mt-1 text-[10px] text-[var(--st-gray)]">Add the admin dashboard to your device.</p>
        </div>
        <button type="button" onClick={installApp} className="shrink-0 rounded-lg bg-[var(--st-red)] px-3 py-2 text-xs font-bold text-white hover:opacity-90">Install</button>
      </div>
    );
  }

  if (showIosHelp) {
    return (
      <div className="fixed bottom-5 right-5 z-[100] max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--st-border)] bg-white p-4 shadow-xl sm:max-w-sm">
        <button type="button" onClick={() => setShowIosHelp(false)} aria-label="Dismiss install instructions" className="float-right ml-3 text-lg leading-none text-[var(--st-gray)]">×</button>
        <p className="m-0 text-xs font-bold text-[var(--st-charcoal-dark)]">Add Sauti Tamu Admin to your Home Screen</p>
        <p className="mb-0 mt-2 text-[11px] leading-relaxed text-[var(--st-gray)]">In Safari, tap Share, then choose <strong>Add to Home Screen</strong>. Open it from the new icon for an app-like admin experience.</p>
      </div>
    );
  }

  return null;
}

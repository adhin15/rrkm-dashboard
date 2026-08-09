"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

// Store tema sederhana (module-level). State = apakah mode light aktif.
// Baca dari DOM class + localStorage. Toggle → update DOM + localStorage
// + notify subscriber. useSyncExternalStore menghindari setState-in-effect
// (lint-clean) dan mencegah hydration mismatch.
const THEME_KEY = "rrkm-theme";

function getSnapshot(): boolean {
  // Client-only: server selalu return false (dark default).
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("light");
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("rrkm-theme-change", cb);
  return () => window.removeEventListener("rrkm-theme-change", cb);
}

function applyTheme(isLight: boolean) {
  document.documentElement.classList.toggle("light", isLight);
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
  window.dispatchEvent(new Event("rrkm-theme-change"));
}

// Toggle light/dark. Default: dark (tanpa class .light di <html>).
// Class .light di <html> memicu override token warna di globals.css.
export default function ThemeToggle() {
  const isLight = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function toggle() {
    applyTheme(!isLight);
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-elevated px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:border-cyan-400 hover:text-cyan-300"
      title={isLight ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
      aria-label="Toggle tema"
    >
      {isLight ? <Sun size={15} /> : <Moon size={15} />}
      {isLight ? "Terang" : "Gelap"}
    </button>
  );
}

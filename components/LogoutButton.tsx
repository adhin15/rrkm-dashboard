"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-elevated px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:border-red-400 hover:text-red-300"
    >
      <LogOut size={15} /> Logout
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login gagal");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            RRKM <span className="text-cyan-400">Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-ink-faint">Silakan masuk untuk melanjutkan</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-line bg-card p-6"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-line-strong bg-elevated px-3 py-2 text-sm text-ink outline-none focus:border-cyan-400"
              placeholder="username"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-line-strong bg-elevated px-3 py-2 text-sm text-ink outline-none focus:border-cyan-400"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500 bg-red-950/50 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-cyan-400 disabled:opacity-50"
          >
            <Lock size={15} />
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}

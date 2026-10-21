"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Connexion impossible");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email professionnel
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-slate-300 p-3"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-slate-300 p-3"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="min-h-[48px] rounded-xl bg-primary px-6 font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}

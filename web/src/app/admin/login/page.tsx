"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPassword } from "./actions";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const res = await signInWithPassword(email, password);
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next") ?? "/admin";
      router.push(next);
      router.refresh();
    } else {
      setStatus("error");
      setError(res.error ?? "Invalid email or password.");
    }
  }

  return (
    <div className="adm-login">
      <form className="adm-login__card" onSubmit={onSubmit}>
        <span className="adm-logo">HUNCH<span className="adm-logo__sub"> / Admin</span></span>

        <label className="adm-login__label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoFocus
          autoComplete="username"
          placeholder="you@hunch.co"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="adm-login__input"
        />

        <label className="adm-login__label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="adm-login__input"
        />

        <button type="submit" className="adm-login__btn" disabled={status === "sending"}>
          {status === "sending" ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="adm-login__error">{error}</p>}
      </form>
    </div>
  );
}

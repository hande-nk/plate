"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// One style for both inputs: 44px tap target, 17px text so iOS doesn't zoom.
const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  minHeight: "var(--tap)",
  marginTop: 6,
  padding: "0 14px",
  border: "1px solid var(--hairline)",
  borderRadius: "var(--radius-control)",
  background: "var(--paper)",
  color: "var(--ink)",
  fontSize: 17,
  fontFamily: "inherit",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
  };

  return (
    <main
      style={{
        maxWidth: 430,
        minHeight: "100dvh",
        margin: "0 auto",
        padding: "52px 18px 32px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 20,
      }}
    >
      <div>
        <div className="muted">Plate</div>
        <h1 style={{ margin: "4px 0 0", fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>
          Welcome back.
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 14, padding: 20 }}
      >
        <label className="muted">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            required
            style={inputStyle}
          />
        </label>

        <label className="muted">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={inputStyle}
          />
        </label>

        {error && (
          <p role="alert" style={{ margin: 0, fontSize: 15, color: "var(--ink)" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn" style={{ marginTop: 4 }}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
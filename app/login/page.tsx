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

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false); // true when a confirmation email went out
  const [busy, setBusy] = useState(false);

  const signup = mode === "signup";

  function switchMode() {
    setMode(signup ? "login" : "signup");
    setError(null);
    setSent(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (signup) {
      const clean = email.trim().toLowerCase();
      setBusy(true);
      const { data, error } = await supabase.auth.signUp({
        email: clean,
        password,
        options: { emailRedirectTo: `${window.location.origin}/welcome` },
      });
      setBusy(false);
      if (error) { setError(error.message); return; }
      // With "Confirm email" on, an existing email comes back with no identities instead of an error.
      if (data.user && data.user.identities?.length === 0) {
        setError("That email already has an account. Log in instead.");
        return;
      }
      if (data.session) { router.replace("/welcome"); return; } // "Confirm email" is off
      setSent(true);                                             // "Confirm email" is on
      return;
    }

    setBusy(true);
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
          {signup ? "Make your account." : "Welcome back."}
        </h1>
      </div>

      {sent ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 500 }}>Check your email.</div>
          <div className="muted" style={{ fontSize: 15 }}>
            We sent a link to {email.trim().toLowerCase()}. Open it on this phone to finish setting up Plate.
          </div>
        </div>
      ) : (
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
              autoComplete={signup ? "new-password" : "current-password"}
              minLength={signup ? 8 : undefined}
              required
              style={inputStyle}
            />
          </label>
          {signup && <div className="muted" style={{ fontSize: 12, marginTop: -6 }}>At least 8 characters.</div>}

          {error && (
            <p role="alert" style={{ margin: 0, fontSize: 15, color: "var(--ink)" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn" style={{ marginTop: 4 }}>
            {busy ? (signup ? "Creating…" : "Logging in…") : (signup ? "Create account" : "Log in")}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={switchMode}
        className="muted"
        style={{ background: "none", border: "none", cursor: "pointer", minHeight: "var(--tap)", fontSize: 15, fontFamily: "inherit" }}
      >
        {signup ? "Have an account? Log in" : "New here? Create an account"}
      </button>
    </main>
  );
}
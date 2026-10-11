"use client"

// state: email, password, error: string | null, busy: boolean
// onSubmit(e): e.preventDefault() → signInWithPassword({ email, password })
//   error → show error.message ; success → router.push("/")

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
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
        router.push("/");
    };
    return(
        <main>

            <form onSubmit={handleSubmit} className="card">
                <h1>
                    Sign In
                </h1>
                <div>
                    <label className="muted">
                        Email
                        <input
                            type="email"
                            value={email}
                            autoComplete="username"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ display: "block", width: "100%", minHeight: "var(--tap)",
                                    borderRadius: "var(--radius-control)", border: "1px solid var(--hairline)",
                                    padding: "0 12px", marginTop: 4, fontSize: 17 }}
                        />
                    </label>
                </div>

                <div>
                    <label className="muted">
                        Password
                        <input
                            type="password"
                            value={password}
                            autoComplete="current-password"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ display: "block", width: "100%", minHeight: "var(--tap)",
                                    borderRadius: "var(--radius-control)", border: "1px solid var(--hairline)",
                                    padding: "0 12px", marginTop: 4, fontSize: 17 }}
                        />
                    </label>
                </div>
                {error && <p className="muted">{error}</p>}
                <button
                    type="submit"
                    disabled={busy}
                    className="btn"
                >
                    {busy ? "Logging in…" : "Log In"}
                </button>

            </form>
        </main>
    );
}
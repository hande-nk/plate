"use client"    

import { useEffect, useState} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";


const linkBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
};


// Today screen shell. Real content arrives in Nov (see STUDIO_LOG roadmap).
export default function Today() {
  const router = useRouter();
  // Stays false until we know there's a session, so Today never flashes for a logged-out visitor.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setReady(true);

    });
  }, [router]);

  if (!ready) return null;

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="muted">Day 1 · Sprint 1</div>
      <h1 style={{ margin: 0, fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>Today</h1>
      <div className="card">
        <div style={{ fontWeight: 500 }}>Nothing logged yet</div>
        <div className="muted">The camera lands here once the matcher passes the speed test.</div>
      </div>
      <div className="card" style={{ background: "var(--ink)", color: "var(--paper)", border: "none" }}>
        <div style={{ fontSize: 14 }}>&ldquo;Kuzum, the case is open. First, we test the machine.&rdquo;</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Safiye Hanım</div>
      </div>
      <Link href="/spike" className="btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
        Run the speed test
      </Link>
      <Link href="/ocr" className="btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
        Run the ocr test
      </Link>

      <button
        className="muted"
        style={{ background: "none", border: "none", minHeight: "var(--tap)", cursor: "pointer" }}
        onClick={async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        }}
      >
        Log out
      </button>
    </main>
  );
}

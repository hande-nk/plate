// "small win" card: plates logged before 6pm this week,  one segment per day
export function WinCard({ count, days }: { count: number; days: boolean[] }) {
  const hit = days.filter(Boolean).length;
  return (
    <div className="card" style={{ background: "var(--ink)", color: "var(--paper)", border: "none", display: "grid", gap: 12, padding: 20 }}>
      <div style={{ fontSize: 13, color: "var(--matcha)" }}>Small win</div>
      <div style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
        {count} {count === 1 ? "meal" : "meals"} logged before 6pm this week.
      </div>
      <div role="img" aria-label={`Logged before 6pm on ${hit} of 7 days`}
        style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {days.map((on, i) => (
          <span key={i} style={{ height: 6, borderRadius: 3, background: on ? "var(--matcha)" : "rgba(255,255,255,0.15)" }} />
        ))}
      </div>
      <div style={{ fontSize: 13, opacity: 0.65 }}>No streaks. Missed days don&rsquo;t erase anything.</div>
    </div>
  );
}
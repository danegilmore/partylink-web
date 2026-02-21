import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#2b2b2b",
        display: "flex",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        style={{
          width: "min(430px, 92vw)", // shows grey margin even on mobile
          background: "#fff",
          borderRadius: 12,
          padding: 18,
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Partylink.co</div>
          <div style={{ color: "#333", marginTop: 2 }}>
            We are the fastest way to run parties
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <NavButton href="/" active>
            Home
          </NavButton>
          <NavButton href="/host/events/new">Create Party</NavButton>
          <NavButton href="/host/events">Add Guests</NavButton>
          <NavButton href="/host/events">Track RSVP</NavButton>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
          <Link
            href="/host/events/new"
            style={{
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "#0E5B78",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: "#fff",
              textDecoration: "none",
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            Create your
            <br />
            Party Now
          </Link>
        </div>

        {/* How it works */}
        <div style={{ marginTop: 34, paddingLeft: 6 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            How does this work:
          </div>

          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li style={{ marginBottom: 6 }}>30secs – create an event</li>
            <li style={{ marginBottom: 6 }}>5mins – add 10 guests</li>
            <li style={{ marginBottom: 6 }}>2mins – send invites</li>
            <li style={{ marginBottom: 6 }}>Track responses</li>
          </ol>
        </div>
      </div>
    </main>
  );
}

function NavButton({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        flex: 1,
        textAlign: "center",
        padding: "8px 10px",
        border: "2px solid #2C5B73",
        background: active ? "#E07B2D" : "#fff",
        color: "#111",
        textDecoration: "none",
        fontWeight: 600,
        fontSize: 12,
        lineHeight: 1.1,
        borderRadius: 6,
      }}
    >
      {children}
    </Link>
  );
}

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 36, marginBottom: 12 }}>Partylink</h1>
      <p style={{ fontSize: 18, marginBottom: 24 }}>
        Create a WhatsApp RSVP link for kids’ birthday parties in Singapore.
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <a href="/host/login" style={{ padding: 12, borderRadius: 10, background: "#000", color: "#fff", textDecoration: "none" }}>
          Create a party link
        </a>
        <a href="/rsvp/test" style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc", textDecoration: "none" }}>
          RSVP demo
        </a>
      </div>
    </main>
  );
}

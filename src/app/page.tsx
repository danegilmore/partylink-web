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
          width: "min(430px, 92vw)",
          background: "#fff",
          borderRadius: 12,
          padding: 18,
          boxSizing: "border-box",
          border: "1px solid #d0d0d0",
        }}
      >
        {/* Header */}
        <header style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Partylink.co</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              fontWeight: 600,
              color: "#222",
              lineHeight: 1.35,
            }}
          >
            Free party execution platform that guarantees your party runs
            smoothly with minimal effort
          </div>
          <div
            style={{
              borderBottom: "1px solid #d9d9d9",
              marginTop: 10,
            }}
          />
        </header>

        {/* Hero line */}
        <section
          style={{
            marginTop: 14,
            fontSize: 13,
            lineHeight: 1.5,
            color: "#222",
          }}
        >
          Create a party in under 3mins → Send invites via your Whatsapp → Know
          exactly how many kids are coming
        </section>

        {/* Main CTAs */}
        <section
          style={{
            display: "flex",
            gap: 12,
            marginTop: 20,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/host/events"
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
              padding: "12px 10px",
              borderRadius: 10,
              background: "#000",
              color: "#fff",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.25,
            }}
          >
            Create your
            <br />
            FREE party invites
          </Link>

        </section>

        {/* How it works box */}
        <section
          style={{
            marginTop: 22,
            background: "#f5f5f5",
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: 6,
              fontSize: 13,
            }}
          >
            How does this work:
          </div>
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <li>Create a birthday party event (30 secs)</li>
            <li>Add guests (30 secs)</li>
            <li>Send guided invite via whatapp smart link (30 secs)</li>
            <li>Track responses</li>
          </ol>
        </section>

        {/* Vendor section */}
        <section
          style={{
            marginTop: 22,
            background: "#f5f5f5",
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            If you need help with parties supplies we have scouted a shortlist
            of trusted vendors for easy booking
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 8,
              gap: 8,
            }}
          >
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <li>Party Favours</li>
              <li>Cake suppliers</li>
              <li>Entertainment</li>
              <li>Food &amp; Drink Catering</li>
            </ul>

            <div>
              <Link
                href="/vendors" // placeholder route
                style={{
                  display: "inline-block",
                  padding: "6px 16px",
                  borderRadius: 16,
                  border: "1px solid #b3b3b3",
                  background: "#e3e3e3",
                  textDecoration: "none",
                  fontSize: 12,
                  color: "#222",
                  fontWeight: 500,
                }}
              >
                Book a Vendor
              </Link>
            </div>
          </div>
        </section>

        {/* Footer contact */}
        <footer
          style={{
            marginTop: 18,
            borderTop: "1px solid #e0e0e0",
            paddingTop: 10,
            fontSize: 11,
            lineHeight: 1.5,
            color: "#555",
          }}
        >
          <div>For party support enquiries contact XXXX</div>
          <div>For app support contact XXXX</div>
        </footer>
      </div>
    </main>
  );
}
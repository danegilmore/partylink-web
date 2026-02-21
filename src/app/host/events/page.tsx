import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

function HostShell({
  activeTab,
  children,
}: {
  activeTab: "home" | "create" | "guests" | "tracker";
  children: React.ReactNode;
}) {
  const tabBaseStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: 14,
    textDecoration: "none",
  };

  const activeUnderline: React.CSSProperties = {
    borderBottom: "3px solid #000",
    fontWeight: 600,
  };

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "40px auto",
        border: "1px solid #1c1c1c",
        padding: "16px 20px 24px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Top brand */}
      <header>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          Partylink.co
        </div>

        {/* Nav tabs */}
        <nav
          style={{
            display: "flex",
            gap: 8,
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          <Link
            href="/"
            style={{
              ...tabBaseStyle,
              ...(activeTab === "home" ? activeUnderline : {}),
            }}
          >
            Home
          </Link>
          <Link
            href="/host/events"
            style={{
              ...tabBaseStyle,
              ...(activeTab === "create" ? activeUnderline : {}),
            }}
          >
            Create Event
          </Link>
          {/* Adjust hrefs for these tabs to your actual routes if different */}
          <Link
            href="/host/guests"
            style={{
              ...tabBaseStyle,
              ...(activeTab === "guests" ? activeUnderline : {}),
            }}
          >
            Add Guests
          </Link>
          <Link
            href="/host/tracker"
            style={{
              ...tabBaseStyle,
              ...(activeTab === "tracker" ? activeUnderline : {}),
            }}
          >
            Tracker
          </Link>
        </nav>

        <div
          style={{
            borderBottom: "1px solid #d4d4d4",
            marginBottom: 16,
          }}
        />
      </header>

      <main>{children}</main>
    </div>
  );
}

export default async function HostEventsPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <HostShell activeTab="create">
        <p style={{ marginBottom: 8 }}>Not logged in.</p>
        <Link href="/login">Go to login</Link>
      </HostShell>
    );
  }

  const { data: events, error } = await supabase
    .from("events")
    .select("id,title,starts_at,location_name,created_at")
    .order("created_at", { ascending: false });

  const hasEvents = (events ?? []).length > 0;

  return (
    <HostShell activeTab="create">
      {/* “No events” banner */}
      {!hasEvents && (
        <div
          style={{
            backgroundColor: "#e6e6e6",
            borderRadius: 4,
            padding: "10px 12px",
            textAlign: "center",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          There are no events created
        </div>
      )}

      {error && (
        <pre
          style={{
            backgroundColor: "#fee",
            padding: 8,
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {error.message}
        </pre>
      )}

      {/* Table header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        <span>Party Name</span>
        <span>Date &amp; Time</span>
      </div>

      <div
        style={{
          borderBottom: "2px solid #00627A",
          marginBottom: 12,
        }}
      />

      {/* Event rows */}
      <div>
        {(events ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/host/events/${e.id}/guests`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #e0e0e0",
              textDecoration: "none",
              fontSize: 14,
              color: "#111",
            }}
          >
            <span>{e.title}</span>
            <span style={{ fontSize: 12, color: "#555", textAlign: "right" }}>
              {e.starts_at
                ? new Date(e.starts_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : ""}
            </span>
          </Link>
        ))}

        {/* If you want visible empty lines like in the mockup even when no events: */}
        {!hasEvents && (
          <>
            <div
              style={{
                borderBottom: "1px solid #e0e0e0",
                padding: "12px 0",
              }}
            />
            <div
              style={{
                borderBottom: "1px solid #e0e0e0",
                padding: "12px 0",
              }}
            />
          </>
        )}
      </div>

      {/* Add Event button (bottom-right) */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 24,
        }}
      >
        <Link
          href="/host/events/new"
          style={{
            display: "inline-block",
            padding: "10px 22px",
            backgroundColor: "#000",
            color: "#fff",
            borderRadius: 6,
            border: "1px solid #000",
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          + Add Event
        </Link>
      </div>
    </HostShell>
  );
}
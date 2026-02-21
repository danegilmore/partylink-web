// src/app/host/events/page.tsx
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import EventsClient from "./EventsClient";

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

  return (
    <HostShell activeTab="create">
      <EventsClient initialEvents={events ?? []} errorMessage={error?.message} />
    </HostShell>
  );
}
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

function HostNav() {
  return (
    <header
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid #e5e5e5",
        marginBottom: 16,
      }}
    >
      <nav style={{ display: "flex", gap: 12 }}>
        <Link href="/">Home</Link>
        <Link href="/host/events">My Events</Link>
        <Link href="/host/events/new">Create Event</Link>
      </nav>
    </header>
  );
}

export default async function HostEventsPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
        <HostNav />
        <main>
          <p>Not logged in.</p>
          <Link href="/login">Go to login</Link>
        </main>
      </div>
    );
  }

  const { data: events, error } = await supabase
    .from("events")
    .select("id,title,starts_at,location_name,created_at")
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <HostNav />
      <main>
        <h1 style={{ marginBottom: 16 }}>Your Events</h1>
        <p style={{ marginBottom: 16 }}>
          <Link href="/host/events/new">+ Create new event</Link>
        </p>

        {error && <pre>{error.message}</pre>}

        <ul style={{ lineHeight: 1.8 }}>
          {(events ?? []).map((e) => (
            <li key={e.id}>
              <strong>{e.title}</strong>{" "}
              <span style={{ color: "#666" }}>
                {e.starts_at
                  ? `(${new Date(e.starts_at).toLocaleString()})`
                  : ""}
              </span>{" "}
              —{" "}
              <Link href={`/host/events/${e.id}/guests`}>
                Add guests / View RSVPs
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function NewEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");

  async function handleCreate() {
    setStatus("Saving…");

    const supabase = supabaseBrowser();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatus("You must be logged in to create an event.");
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .insert({
        title,
        starts_at: date || null,
        location_name: location || null,
        host_user_id: user.id,
      })
      .select("id")
      .single();

    if (error) {
      setStatus("Error: " + error.message);
      return;
    }

    setStatus("Event created successfully. Redirecting…");
    router.push(`/host/events/${data.id}/guests`);
  }

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: 16 }}>
      <h1>Create Event</h1>

      <div style={{ marginTop: 16 }}>
        <label>Event title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ display: "block", width: "100%", marginTop: 4 }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Date & time</label>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ display: "block", width: "100%", marginTop: 4 }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Location</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={{ display: "block", width: "100%", marginTop: 4 }}
        />
      </div>

      <button onClick={handleCreate} style={{ marginTop: 24, padding: 10 }}>
        Create event
      </button>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </main>
  );
}


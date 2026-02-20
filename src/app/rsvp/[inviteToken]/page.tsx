"use client";

import { use, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type RsvpView = {
  event_id: string;
  participant_id: string;
  parent_name: string | null;
  event_title: string | null;
  starts_at: string | null;
  location_name: string | null;
  child_name: string | null;
  current_status: string;
};

export default function RsvpPage({
  params,
}: {
  params: Promise<{ inviteToken: string }>;
}) {
  // Unwrap params Promise (Next app router pattern you've been using)
  const { inviteToken } = use(params);

  // Public anon client (fine for RSVP)
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<RsvpView | null>(null);
  const [status, setStatus] = useState<"yes" | "no" | "maybe">("yes");
  const [msg, setMsg] = useState("");

  // Load invite by token via RPC
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      const { data, error } = await supabase.rpc("get_rsvp_view", {
        p_invite_token: inviteToken,
      });

      if (error) {
        console.error("get_rsvp_view error", error);
        setView(null);
        setMsg("Invalid or expired invite link.");
        setLoading(false);
        return;
      }

      // data can be an array or single object, depending on supabase-js version
      const row = Array.isArray(data) ? data[0] : data;

      if (!row) {
        setView(null);
        setMsg("Invalid or expired invite link.");
        setLoading(false);
        return;
      }

      const mapped: RsvpView = {
        event_id: row.event_id,
        participant_id: row.participant_id,
        parent_name: row.parent_name ?? null,
        event_title: row.event_title ?? null,
        starts_at: row.starts_at ?? null,
        location_name: row.location_name ?? null,
        child_name: row.child_name ?? null,
        current_status: row.current_status ?? "pending",
      };

      setView(mapped);

      // Default selected status to current_status if valid
      if (
        mapped.current_status === "yes" ||
        mapped.current_status === "no" ||
        mapped.current_status === "maybe"
      ) {
        setStatus(mapped.current_status);
      } else {
        setStatus("yes");
      }

      setLoading(false);
    })();
  }, [inviteToken, supabase]);

  async function submit() {
    if (!view) return;

    setMsg("Saving...");

    const { error } = await supabase.rpc("submit_rsvp", {
      p_invite_token: inviteToken,
      p_status: status,
    });

    if (error) {
      console.error("submit_rsvp error", error);
      setMsg("Error saving response: " + error.message);
    } else {
      setMsg("Saved. Thank you!");
    }
  }

  if (loading) {
    return <main style={{ padding: 16 }}>Loading…</main>;
  }

  if (!view) {
    return (
      <main style={{ padding: 16 }}>
        <p>{msg || "Invalid or expired invite link."}</p>
      </main>
    );
  }

  const evTitle = view.event_title ?? "Event";
  const child = view.child_name ?? "Guest";

  const dateLine =
    view.starts_at || view.location_name
      ? [
          view.starts_at
            ? new Date(view.starts_at).toLocaleString()
            : null,
          view.location_name ? view.location_name : null,
        ]
          .filter(Boolean)
          .join(" • ")
      : "";

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: 16 }}>
      <h1>RSVP</h1>

      <p>
        Event: <strong>{evTitle}</strong>
      </p>

      {dateLine && (
        <p style={{ color: "#666" }}>
          {dateLine}
        </p>
      )}

      <p>
        RSVP for: <strong>{child}</strong>
      </p>

      <p style={{ color: "#666" }}>
        Current status: <strong>{view.current_status}</strong>
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <label>
          <input
            type="radio"
            checked={status === "yes"}
            onChange={() => setStatus("yes")}
          />{" "}
          Yes
        </label>
        <label>
          <input
            type="radio"
            checked={status === "no"}
            onChange={() => setStatus("no")}
          />{" "}
          No
        </label>
        <label>
          <input
            type="radio"
            checked={status === "maybe"}
            onChange={() => setStatus("maybe")}
          />{" "}
          Maybe
        </label>
      </div>

      <button
        onClick={submit}
        style={{ marginTop: 18, padding: 10 }}
      >
        Submit
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
"use client";

import { use, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function RsvpPage({
  params,
}: {
  params: Promise<{ inviteToken: string }>;
}) {
  const { inviteToken } = use(params); // ✅ unwrap params Promise

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [status, setStatus] = useState<"yes" | "no" | "maybe">("yes");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      // 1) Look up invite by token (public)

const { data, error } = await supabase
  .from("event_invites")
  .select("event_id,participant_id,parent_name")
  .eq("invite_token", inviteToken)
  .maybeSingle();

if (!data) {
  setInvite(null);
  setMsg("Invalid or expired invite link.");
  setLoading(false);
  return;
}




      // 2) Load event + participant details (these may be RLS-protected later)
      // If you lock these tables down, move this into an RPC too.
      const [{ data: ev }, { data: p }, { data: att }] = await Promise.all([
        supabase
          .from("events")
          .select("title,starts_at,location_name")
          .eq("id", data.event_id)
          .single(),
        supabase
          .from("participants")
          .select("full_name")
          .eq("id", data.participant_id)
          .single(),
        supabase
          .from("attendance")
          .select("status")
          .eq("event_id", data.event_id)
          .eq("participant_id", data.participant_id)
          .single(),
      ]);

      setInvite({
        ...data,
        event: ev ?? null,
        participant: p ?? null,
        current: att?.status ?? "pending",
      });

      // default the radio selection to current status if available
      if (att?.status === "yes" || att?.status === "no" || att?.status === "maybe") {
        setStatus(att.status);
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken]);

  async function submit() {
    if (!invite) return;

    setMsg("Saving...");

    // ✅ Use RPC so unauthenticated guests can submit under RLS
    const { error } = await supabase.rpc("submit_rsvp", {
      p_invite_token: inviteToken,
      p_status: status,
    });

    if (error) {
      setMsg("Error: " + error.message);
      return;
    }

    setMsg("Saved. Thank you!");

    // Refresh current status from attendance (optional but nice UX)
    const { data: att2 } = await supabase
      .from("attendance")
      .select("status")
      .eq("event_id", invite.event_id)
      .eq("participant_id", invite.participant_id)
      .single();

    setInvite((prev: any) => ({
      ...prev,
      current: att2?.status ?? prev?.current ?? "pending",
    }));
  }

  if (loading) return <main style={{ padding: 16 }}>Loading…</main>;
  if (!invite) return <main style={{ padding: 16 }}>{msg || "Invite not found."}</main>;

  const ev = invite.event;
  const child = invite.participant?.full_name ?? "Guest";

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: 16 }}>
      <h1>RSVP</h1>

      <p>
        Event: <strong>{ev?.title ?? invite.event_id}</strong>
      </p>

      <p style={{ color: "#666" }}>
        {ev?.starts_at ? new Date(ev.starts_at).toLocaleString() : ""}
        {ev?.location_name ? ` • ${ev.location_name}` : ""}
      </p>

      <p>
        RSVP for: <strong>{child}</strong>
      </p>

      <p style={{ color: "#666" }}>
        Current status: <strong>{invite.current}</strong>
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

      <button onClick={submit} style={{ marginTop: 18, padding: 10 }}>
        Submit
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}

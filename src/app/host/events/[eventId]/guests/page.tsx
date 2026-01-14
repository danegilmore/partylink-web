"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

function normalizeSGPhone(input: string) {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("65") && digits.length === 10) return `+${digits}`;
  if (digits.length === 8) return `+65${digits}`;
  if (input.startsWith("+") && digits.length >= 8) return `+${digits}`;
  return input;
}

type Row = {
  invite_token: string;
  child_name: string;
  parent_name: string | null;
  phone_e164: string | null;
  rsvp_status: string;
};

export default function GuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [eventTitle, setEventTitle] = useState("");
  const [childName, setChildName] = useState("");
  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("events")
        .select("title")
        .eq("id", eventId)
        .single();

      if (error) {
        setStatusMsg("Error loading event: " + error.message);
      } else {
        setEventTitle(data?.title ?? "");
      }

      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function refresh() {
    const { data, error } = await supabase
      .from("event_invites")
      .select(
        "invite_token,parent_name,phone_e164,participant_id,participants(full_name)"
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      setStatusMsg("Error loading invites: " + error.message);
      return;
    }

    const participantIds = (data ?? [])
      .map((x: any) => x.participant_id)
      .filter(Boolean);

    let attendanceMap = new Map<string, string>();
    if (participantIds.length > 0) {
      const { data: att } = await supabase
        .from("attendance")
        .select("participant_id,status")
        .eq("event_id", eventId)
        .in("participant_id", participantIds);

      (att ?? []).forEach((a: any) =>
        attendanceMap.set(a.participant_id, a.status)
      );
    }

    const mapped: Row[] = (data ?? []).map((d: any) => ({
      invite_token: d.invite_token,
      child_name: d.participants?.full_name ?? "",
      parent_name: d.parent_name ?? null,
      phone_e164: d.phone_e164 ?? null,
      rsvp_status: attendanceMap.get(d.participant_id) ?? "pending",
    }));

    setRows(mapped);
  }

  async function addGuest() {
    if (!childName.trim()) return;

    setStatusMsg("Saving...");

    const phone_e164 = normalizeSGPhone(phone);

    const { error } = await supabase.rpc("add_guest", {
      p_event_id: eventId,
      p_child_name: childName.trim(),
      p_parent_name: parentName.trim() || null,
      p_phone_e164: phone_e164 || null,
    });

    if (error) {
      setStatusMsg("Error adding guest: " + error.message);
      return;
    }

    setChildName("");
    setParentName("");
    setPhone("");
    setStatusMsg("Guest added.");
    await refresh();
  }

    function whatsappLink(inviteToken: string, parent: string | null) {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://partylink.co";

    const rsvpUrl = `${base}/rsvp/${inviteToken}`;
    const text = `Hi${parent ? " " + parent : ""}! Please RSVP here: ${rsvpUrl}\nEvent: ${
      eventTitle || ""
    }`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 6 }}>Guests & RSVPs</h1>
      <p style={{ color: "#666", marginBottom: 18 }}>
        Event: <strong>{eventTitle || eventId}</strong>
      </p>

      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
        <h2 style={{ marginTop: 0 }}>Add a guest (child)</h2>

        <div style={{ display: "grid", gap: 10 }}>
          <label>
            Child name
            <input
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>

          <label>
            Parent name (optional)
            <input
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>

          <label>
            Parent phone (optional)
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 91234567 or +6591234567"
              style={{ display: "block", width: "100%" }}
            />
          </label>

          <button
            onClick={addGuest}
            disabled={!childName.trim()}
            style={{ padding: 10 }}
          >
            Add guest & generate RSVP link
          </button>

          {statusMsg && <p style={{ margin: 0 }}>{statusMsg}</p>}
        </div>
      </div>

      <h2 style={{ marginTop: 28 }}>Current invites</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
              Child
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
              Parent
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
              Phone
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
              RSVP
            </th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.invite_token}>
              <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                {r.child_name}
              </td>
              <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                {r.parent_name ?? "-"}
              </td>
              <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                {r.phone_e164 ?? "-"}
              </td>
              <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                {r.rsvp_status}
              </td>
              <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                <a href={`/rsvp/${r.invite_token}`}>Open RSVP</a>{" "}
                |{" "}
                <a
                  href={whatsappLink(r.invite_token, r.parent_name)}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 12, color: "#666" }}>
                No guests yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

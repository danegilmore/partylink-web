"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
	<Link href="/host/events/new">Create Event</Link>
        <Link href="/host/events">My Events</Link>
      </nav>
    </header>
  );
}

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
        return;
      }

      setEventTitle(data?.title ?? "");
    })();
  }, [supabase, eventId]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("event_invites")
        .select(
          `
            invite_token,
            parent_name,
            phone_e164,
            participant_id,
            participants:participant_id(full_name)
          `
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

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
      setStatusMsg("");
    })();
  }, [supabase, eventId]);

  function phoneDigits(e164: string | null) {
    const digits = (e164 || "").replace(/\D/g, "");
    if (digits.startsWith("65") && digits.length === 10) {
      return digits.slice(2);
    }
    return digits;
  }

  function whatsappLink(
    inviteToken: string,
    parent: string | null,
    phone_e164: string | null
  ) {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://www.partylink.co";

    const rsvpUrl = `${base}/rsvp/${inviteToken}`;
    const text = `Hi${parent ? " " + parent : ""}! Please RSVP here: ${rsvpUrl}\nEvent: ${
      eventTitle || ""
    }`;

    if (!phone_e164) {
      return `https://wa.me/?text=${encodeURIComponent(text)}`;
    }

    const digits = phoneDigits(phone_e164);
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  async function handleAddGuest() {
    setStatusMsg("");

    if (!childName.trim()) {
      setStatusMsg("Child name is required.");
      return;
    }

    const normalizedPhone = phone ? normalizeSGPhone(phone) : null;

    const { error: insertError } = await supabase.rpc(
      "create_invite_with_participant",
      {
        p_event_id: eventId,
        p_child_name: childName.trim(),
        p_parent_name: parentName.trim() || null,
        p_phone_e164: normalizedPhone,
      }
    );

    if (insertError) {
      setStatusMsg("Error creating invite: " + insertError.message);
      return;
    }

    setChildName("");
    setParentName("");
    setPhone("");
    setStatusMsg("Guest added. Reloading list...");

    const { data, error } = await supabase
      .from("event_invites")
      .select(
        `
          invite_token,
          parent_name,
          phone_e164,
          participant_id,
          participants:participant_id(full_name)
        `
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      setStatusMsg("Error reloading invites: " + error.message);
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
    setStatusMsg("Guest added.");
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <HostNav />
      <div style={{ marginBottom: 12 }}>
        <Link href="/host/events">← Back to event list</Link>
      </div>

      <main>
        <h1 style={{ marginBottom: 6 }}>Guests & RSVPs</h1>
        <p style={{ color: "#666", marginBottom: 18 }}>
          Event: <strong>{eventTitle || eventId}</strong>
        </p>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 12,
          }}
        >
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
              Phone (optional, SG or +65)
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ display: "block", width: "100%" }}
              />
            </label>

            <button
              type="button"
              onClick={handleAddGuest}
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                border: "1px solid #000",
                background: "#fff",
                cursor: "pointer",
                maxWidth: 180,
              }}
            >
              Add guest
            </button>

            {statusMsg && (
              <p style={{ color: "#444", marginTop: 4 }}>{statusMsg}</p>
            )}
          </div>
        </div>

        <h2 style={{ marginTop: 24, marginBottom: 10 }}>Guest list</h2>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Child
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Parent
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Phone
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                RSVP
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  padding: "8px 4px",
                }}
              >
                Share link
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.invite_token}>
                <td
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "6px 4px",
                  }}
                >
                  {row.child_name}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "6px 4px",
                  }}
                >
                  {row.parent_name || "-"}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "6px 4px",
                  }}
                >
                  {row.phone_e164
                    ? `${row.phone_e164} (${phoneDigits(row.phone_e164)})`
                    : "-"}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "6px 4px",
                    textTransform: "capitalize",
                  }}
                >
                  {row.rsvp_status}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    padding: "6px 4px",
                  }}
                >
                  <a
                    href={whatsappLink(
                      row.invite_token,
                      row.parent_name,
                      row.phone_e164
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
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
    </div>
  );
}

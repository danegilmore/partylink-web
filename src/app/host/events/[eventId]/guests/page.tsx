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
  const [showAddForm, setShowAddForm] = useState(false);

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
    setShowAddForm(false);
  }

  const guestCount = rows.length;
  const guestCountLabel =
    guestCount === 1 ? "1 Guest in List" : `${guestCount} Guests in List`;

  const cardWidth = "min(430px, 92vw)";

  const bottomButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #000",
    background: "#000",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  };

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
          width: cardWidth,
          background: "#fff",
          borderRadius: 12,
          padding: 18,
          boxSizing: "border-box",
          boxShadow: "0 0 0 1px #ddd",
        }}
      >
        {/* Brand + Tabs */}
        <header style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Partylink.co</div>

          <nav
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              marginTop: 8,
              borderBottom: "1px solid #ddd",
            }}
          >
            <Link
              href="/host/events"
              style={{ padding: "6px 0", textDecoration: "none", color: "#000" }}
            >
              Home
            </Link>
            <Link
              href="/host/events/new"
              style={{ padding: "6px 0", textDecoration: "none", color: "#000" }}
            >
              Create Event
            </Link>
            {/* Active tab */}
            <span
              style={{
                padding: "6px 0",
                fontWeight: 600,
                borderBottom: "2px solid #000",
              }}
            >
              Add Guests
            </span>
            <Link
              href={`/host/events/${eventId}/tracker`}
              style={{ padding: "6px 0", textDecoration: "none", color: "#000" }}
            >
              Tracker
            </Link>
          </nav>
        </header>

        {/* Event title */}
        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {eventTitle || "Event"}
          </div>
        </div>

        {/* Guest count pill */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #c3c3c3",
              background: "#f4f4f4",
              textAlign: "center",
              fontSize: 13,
              color: "#555",
            }}
          >
            {guestCountLabel}
          </div>
        </div>

        {/* Column headers */}
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            display: "grid",
            gridTemplateColumns: "2fr 2fr 2fr auto",
            columnGap: 6,
            marginBottom: 4,
          }}
        >
          <div>Child Name</div>
          <div>Parent Name</div>
          <div>Phone Number</div>
          <div style={{ textAlign: "right" }}>Invite Method</div>
        </div>
        <div
          style={{
            borderBottom: "2px solid #0077a8",
            marginBottom: 4,
          }}
        />

        {/* Guest rows */}
        <div>
          {rows.map((row) => (
            <div
              key={row.invite_token}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr 2fr auto",
                columnGap: 6,
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid #eee",
                fontSize: 13,
              }}
            >
              <div>{row.child_name}</div>
              <div>{row.parent_name || ""}</div>
              <div>
                {row.phone_e164 ? phoneDigits(row.phone_e164) : ""}
              </div>
              <div style={{ textAlign: "right" }}>
                <a
                  href={whatsappLink(
                    row.invite_token,
                    row.parent_name,
                    row.phone_e164
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "2px solid #0077a8",
                    background:
                      row.phone_e164 && row.rsvp_status !== "pending"
                        ? "#0077a8"
                        : "transparent",
                  }}
                />
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div
              style={{
                padding: "12px 0",
                fontSize: 13,
                color: "#777",
                borderBottom: "1px solid #eee",
              }}
            >
              No guests yet.
            </div>
          )}
        </div>

        {/* Add guest form (collapsible) */}
        {showAddForm && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fafafa",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Add New Guest
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 13 }}>
                Child name
                <input
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 4,
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </label>

              <label style={{ fontSize: 13 }}>
                Parent name (optional)
                <input
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 4,
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </label>

              <label style={{ fontSize: 13 }}>
                Phone (optional, SG or +65)
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 4,
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 4,
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={handleAddGuest}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #000",
                    background: "#000",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Save Guest
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>
              </div>

              {statusMsg && (
                <p style={{ color: "#444", marginTop: 4, fontSize: 13 }}>
                  {statusMsg}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bottom buttons */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            type="button"
            style={bottomButtonStyle}
            onClick={() =>
              setStatusMsg("Add Previous Guest – feature not implemented yet.")
            }
          >
            + Add Previous Guest
          </button>
          <button
            type="button"
            style={bottomButtonStyle}
            onClick={() => setShowAddForm(true)}
          >
            + Add New Guest
          </button>
        </div>

        {/* Status message when form not open */}
        {!showAddForm && statusMsg && (
          <p
            style={{
              color: "#444",
              marginTop: 8,
              fontSize: 13,
            }}
          >
            {statusMsg}
          </p>
        )}
      </div>
    </main>
  );
}
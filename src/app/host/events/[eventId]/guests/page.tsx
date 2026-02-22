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

type InviteMethod = "whatsapp" | "manual";
type InviteStatus = "not_sent" | "whatsapp_sent" | "acknowledged";

type Row = {
  invite_token: string;
  participant_id: string;
  child_name: string;
  parent_name: string | null;
  phone_e164: string | null;
  rsvp_status: string;
  invite_method: InviteMethod;
  invite_status: InviteStatus;
};

type PreviousGuest = {
  child_name: string | null;
  parent_name: string | null;
  phone_e164: string | null;
};

export default function GuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [eventTitle, setEventTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [statusMsg, setStatusMsg] = useState("");

  // Add-new modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [childName, setChildName] = useState("");
  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState("");
  const [sendViaWhatsapp, setSendViaWhatsapp] = useState(true);

  // Previous guests modal state
  const [showPrevModal, setShowPrevModal] = useState(false);
  const [prevGuests, setPrevGuests] = useState<PreviousGuest[]>([]);
  const [prevSelected, setPrevSelected] = useState<Set<number>>(new Set());
  const [prevLoading, setPrevLoading] = useState(false);
  const [prevError, setPrevError] = useState("");

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [editChild, setEditChild] = useState("");
  const [editParent, setEditParent] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Load event title
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

  async function reloadRows() {
    const { data, error } = await supabase
      .from("event_invites")
      .select(
        `
        invite_token,
        participant_id,
        child_name,
        parent_name,
        phone_e164,
        invite_method,
        invite_status
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
      participant_id: d.participant_id,
      child_name: d.child_name ?? "",
      parent_name: d.parent_name ?? null,
      phone_e164: d.phone_e164 ?? null,
      rsvp_status: attendanceMap.get(d.participant_id) ?? "pending",
      invite_method: (d.invite_method ?? "whatsapp") as InviteMethod,
      invite_status: (d.invite_status ?? "not_sent") as InviteStatus,
    }));

    setRows(mapped);
  }

  // Initial load
  useEffect(() => {
    reloadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, eventId]);

  function displayStatus(row: Row): string {
    const rsvp = row.rsvp_status?.toLowerCase();

    // Final RSVP overrides everything
    if (rsvp === "yes" || rsvp === "no" || rsvp === "maybe") {
      return rsvp.charAt(0).toUpperCase() + rsvp.slice(1);
    }

    if (row.invite_method === "whatsapp") {
      if (row.invite_status === "whatsapp_sent") return "WhatsApp sent";
      if (row.invite_status === "acknowledged") return "Invite acknowledged";
      return "Not sent";
    }

    // Manual method, but no RSVP yet
    return "Pending";
  }

  // Add new guest (from modal)
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
        p_invite_method: sendViaWhatsapp ? "whatsapp" : "manual",
      }
    );

    if (insertError) {
      setStatusMsg("Error creating invite: " + insertError.message);
      return;
    }

    setChildName("");
    setParentName("");
    setPhone("");
    setSendViaWhatsapp(true);
    setShowAddModal(false);
    setStatusMsg("Guest added.");

    await reloadRows();
  }

  // Manual RSVP dropdown update
  async function updateManualStatus(row: Row, newStatus: string) {
    setStatusMsg("");

    const { error } = await supabase
      .from("attendance")
      .update({ status: newStatus })
      .eq("event_id", eventId)
      .eq("participant_id", row.participant_id);

    if (error) {
      setStatusMsg("Error updating status: " + error.message);
      return;
    }

    await reloadRows();
  }

  // Open "Previous guests" modal and load data
  async function openPreviousGuestsModal() {
    setPrevGuests([]);
    setPrevSelected(new Set());
    setPrevError("");
    setPrevLoading(true);
    setShowPrevModal(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setPrevError("Unable to load previous guests (no user).");
      setPrevLoading(false);
      return;
    }

    const hostUserId = userData.user.id;

    const { data, error } = await supabase.rpc(
      "get_previous_guests_for_host",
      {
        p_host_user_id: hostUserId,
      }
    );

    if (error) {
      setPrevError("Error loading previous guests: " + error.message);
      setPrevLoading(false);
      return;
    }

    setPrevGuests((data ?? []) as PreviousGuest[]);
    setPrevLoading(false);
  }

  function togglePrevSelected(index: number) {
    setPrevSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  // Add selected previous guests to this event
  async function handleAddPreviousGuests() {
    if (prevSelected.size === 0) {
      setPrevError("Please select at least one guest.");
      return;
    }

    setPrevError("");

    const guestsPayload = Array.from(prevSelected).map((i) => {
      const g = prevGuests[i];
      return {
        child_name: g.child_name,
        parent_name: g.parent_name,
        phone_e164: g.phone_e164,
        invite_method: "manual", // previous guests default to manual; adjust if you want WhatsApp
      };
    });

    const { error } = await supabase.rpc("add_invites_for_previous_guests", {
      p_event_id: eventId,
      p_guests: guestsPayload,
    });

    if (error) {
      setPrevError("Error adding guests: " + error.message);
      return;
    }

    setShowPrevModal(false);
    await reloadRows();
    setStatusMsg("Previous guests added.");
  }

  // Open edit modal for a specific row
  function openEditModal(row: Row) {
    setEditToken(row.invite_token);
    setEditChild(row.child_name);
    setEditParent(row.parent_name || "");
    setEditPhone(row.phone_e164 ? phoneDigits(row.phone_e164) : "");
    setShowEditModal(true);
  }

  // Save edits
  async function handleSaveEdit() {
    if (!editToken) return;

    const normalizedPhone = editPhone ? normalizeSGPhone(editPhone) : null;

    const { error } = await supabase.rpc("update_event_invite_details", {
      p_invite_token: editToken,
      p_child_name: editChild.trim(),
      p_parent_name: editParent.trim() || null,
      p_phone_e164: normalizedPhone,
    });

    if (error) {
      setStatusMsg("Error updating guest: " + error.message);
      return;
    }

    setShowEditModal(false);
    setEditToken(null);
    await reloadRows();
    setStatusMsg("Guest updated.");
  }

  // Delete guest
  async function handleDeleteGuest(row: Row) {
    const ok = window.confirm(
      `Delete guest "${row.child_name}" from this event?`
    );
    if (!ok) return;

    const { error } = await supabase.rpc("delete_event_invite", {
      p_invite_token: row.invite_token,
    });

    if (error) {
      setStatusMsg("Error deleting guest: " + error.message);
      return;
    }

    await reloadRows();
    setStatusMsg("Guest deleted.");
  }

  const guestCount = rows.length;
  const guestCountLabel =
    guestCount === 1 ? "1 Guest in List" : `${guestCount} Guests in List`;

  const cardWidth = "min(430px, 92vw)";
  const bottomButtonStyle = {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #000",
    background: "#000",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  } as const;

  return (
    <>
      {/* Add Guest Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1100,
          }}
        >
          <div
            style={{
              width: "min(360px, 90vw)",
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 16 }}>Add Guest</div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 18,
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 13 }}>
                Child name
                <input
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  style={{
                    marginTop: 4,
                    display: "block",
                    width: "100%",
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
                    marginTop: 4,
                    display: "block",
                    width: "100%",
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
                    marginTop: 4,
                    display: "block",
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </label>

              <label
                style={{
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <input
                  type="checkbox"
                  checked={sendViaWhatsapp}
                  onChange={(e) => setSendViaWhatsapp(e.target.checked)}
                />
                Send invite via WhatsApp
              </label>

              <button
                type="button"
                onClick={handleAddGuest}
                style={{
                  marginTop: 8,
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
                Add guest
              </button>

              {statusMsg && (
                <p style={{ color: "#444", marginTop: 4, fontSize: 13 }}>
                  {statusMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Previous Guests Modal */}
      {showPrevModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1050,
          }}
        >
          <div
            style={{
              width: "min(420px, 95vw)",
              maxHeight: "80vh",
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                Add Previous Guests
              </div>
              <button
                type="button"
                onClick={() => setShowPrevModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 18,
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {prevLoading ? (
              <p style={{ fontSize: 13 }}>Loading previous guests…</p>
            ) : prevGuests.length === 0 ? (
              <p style={{ fontSize: 13 }}>No previous guests found.</p>
            ) : (
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: 8,
                  marginBottom: 8,
                }}
              >
                {prevGuests.map((g, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 2fr 2fr 1.5fr",
                      alignItems: "center",
                      columnGap: 6,
                      padding: "4px 0",
                      borderBottom:
                        idx === prevGuests.length - 1
                          ? "none"
                          : "1px solid #f0f0f0",
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={prevSelected.has(idx)}
                      onChange={() => togglePrevSelected(idx)}
                    />
                    <span>{g.child_name || ""}</span>
                    <span>{g.parent_name || ""}</span>
                    <span>
                      {g.phone_e164 ? phoneDigits(g.phone_e164) : ""}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {prevError && (
              <p style={{ color: "red", fontSize: 12, marginBottom: 6 }}>
                {prevError}
              </p>
            )}

            <button
              type="button"
              onClick={handleAddPreviousGuests}
              disabled={prevLoading || prevGuests.length === 0}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #000",
                background: "#000",
                color: "#fff",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                opacity:
                  prevLoading || prevGuests.length === 0 ? 0.6 : 1,
              }}
            >
              Add selected guests
            </button>
          </div>
        </div>
      )}

      {/* Edit Guest Modal */}
      {showEditModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1100,
          }}
        >
          <div
            style={{
              width: "min(360px, 90vw)",
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 16 }}>Edit Guest</div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 18,
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 13 }}>
                Child name
                <input
                  value={editChild}
                  onChange={(e) => setEditChild(e.target.value)}
                  style={{
                    marginTop: 4,
                    display: "block",
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </label>

              <label style={{ fontSize: 13 }}>
                Parent name
                <input
                  value={editParent}
                  onChange={(e) => setEditParent(e.target.value)}
                  style={{
                    marginTop: 4,
                    display: "block",
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </label>

              <label style={{ fontSize: 13 }}>
                Phone (SG or +65)
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  style={{
                    marginTop: 4,
                    display: "block",
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleSaveEdit}
                style={{
                  marginTop: 8,
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
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main page */}
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
                style={{
                  padding: "6px 0",
                  textDecoration: "none",
                  color: "#000",
                }}
              >
                Home
              </Link>
              <Link
                href="/host/events/new"
                style={{
                  padding: "6px 0",
                  textDecoration: "none",
                  color: "#000",
                }}
              >
                Create Event
              </Link>
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
                style={{
                  padding: "6px 0",
                  textDecoration: "none",
                  color: "#000",
                }}
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
              gridTemplateColumns: "2fr 2fr 1.7fr 1.6fr 1.5fr",
              columnGap: 6,
              marginBottom: 4,
            }}
          >
            <div>Child Name</div>
            <div>Parent Name</div>
            <div>Phone Number</div>
            <div>RSVP Status</div>
            <div style={{ textAlign: "right" }}>Actions</div>
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
                  gridTemplateColumns: "2fr 2fr 1.7fr 1.6fr 1.5fr",
                  columnGap: 6,
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: "1px solid #eee",
                  fontSize: 13,
                }}
              >
                <div>{row.child_name}</div>
                <div>{row.parent_name || ""}</div>
                <div>{row.phone_e164 ? phoneDigits(row.phone_e164) : ""}</div>

                {/* RSVP Status column */}
                <div>
                  {row.invite_method === "manual" ? (
                    <select
                      value={
                        ["yes", "no", "maybe"].includes(
                          row.rsvp_status.toLowerCase()
                        )
                          ? row.rsvp_status.toLowerCase()
                          : "pending"
                      }
                      onChange={(e) =>
                        updateManualStatus(row, e.target.value.toLowerCase())
                      }
                      style={{
                        fontSize: 12,
                        padding: "2px 4px",
                        borderRadius: 4,
                        border: "1px solid #ccc",
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="maybe">Maybe</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: 12 }}>
                      {displayStatus(row)}
                    </span>
                  )}
                </div>

                {/* Actions column: WhatsApp / manual + Edit/Delete */}
                <div
                  style={{
                    textAlign: "right",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  {row.invite_method === "manual" ? (
                    <span style={{ fontSize: 12, color: "#555" }}>
                      Manual
                    </span>
                  ) : row.phone_e164 ? (
                    <button
                      type="button"
                      onClick={async () => {
                        window.open(
                          whatsappLink(
                            row.invite_token,
                            row.parent_name,
                            row.phone_e164
                          ),
                          "_blank"
                        );

                        if (row.invite_status === "not_sent") {
                          await supabase.rpc("mark_whatsapp_sent", {
                            p_invite_token: row.invite_token,
                          });
                          await reloadRows();
                        }
                      }}
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "1px solid #0077a8",
                        background:
                          row.invite_status === "whatsapp_sent" ||
                          row.invite_status === "acknowledged"
                            ? "#0077a8"
                            : "transparent",
                        color:
                          row.invite_status === "whatsapp_sent" ||
                          row.invite_status === "acknowledged"
                            ? "#fff"
                            : "#0077a8",
                        cursor: "pointer",
                      }}
                    >
                      {row.invite_status === "not_sent" ? "Send" : "Resend"}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: "#aaa" }}>—</span>
                  )}

                  <button
                    type="button"
                    onClick={() => openEditModal(row)}
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: "1px solid #ccc",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteGuest(row)}
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: "1px solid #f33",
                      background: "#fff",
                      color: "#c00",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
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
              onClick={openPreviousGuestsModal}
            >
              + Add Previous Guest
            </button>
            <button
              type="button"
              style={bottomButtonStyle}
              onClick={() => {
                setStatusMsg("");
                setShowAddModal(true);
              }}
            >
              + Add New Guest
            </button>
          </div>

          {statusMsg && !showAddModal && !showEditModal && (
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
    </>
  );
}
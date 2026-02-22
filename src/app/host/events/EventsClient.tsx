// src/app/host/events/EventsClient.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

type EventRow = {
  id: string;
  title: string | null;
  starts_at: string | null;
  location_name: string | null;
  created_at: string;
};

// Minimal type for the PWA install prompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function EventsClient({
  initialEvents,
  errorMessage,
}: {
  initialEvents: EventRow[];
  errorMessage?: string;
}) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDateTime, setCreateDateTime] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDateTime, setEditDateTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Add-to-home-screen / PWA install state
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallCard, setShowInstallCard] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const hasEvents = events.length > 0;

  // Detect iOS and capture beforeinstallprompt on Android/desktop
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = window.navigator.userAgent || "";
    const ios =
      /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS/.test(ua);
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      setInstallPromptEvent(bip);
      setShowInstallCard(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  // CREATE EVENT (same shape as /host/events/new)
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    if (!createTitle.trim()) {
      setCreateError("Please enter a party name.");
      return;
    }
    if (!createDateTime) {
      setCreateError("Please select date & time.");
      return;
    }

    setSavingCreate(true);
    try {
      const supabase = supabaseBrowser();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setCreateError("You must be logged in to create an event.");
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .insert({
          title: createTitle,
          // Match existing /host/events/new: store raw datetime-local
          starts_at: createDateTime || null,
          location_name: createLocation || null,
          host_user_id: user.id,
        })
        .select("id,title,starts_at,location_name,created_at")
        .single();

      if (error) {
        setCreateError("Error: " + error.message);
        return;
      }

      setEvents((prev) => [data as EventRow, ...prev]);

      setCreateTitle("");
      setCreateDateTime("");
      setCreateLocation("");
      setShowCreateModal(false);
    } finally {
      setSavingCreate(false);
    }
  }

  // OPEN EDIT MODAL
  function handleOpenEdit(ev: EventRow) {
    setEditingEvent(ev);
    setEditTitle(ev.title ?? "");
    setEditDateTime(ev.starts_at ?? "");
    setEditLocation(ev.location_name ?? "");
    setEditError(null);
    setShowEditModal(true);
  }

  // SAVE EDITED EVENT
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;

    setEditError(null);

    if (!editTitle.trim()) {
      setEditError("Please enter a party name.");
      return;
    }
    if (!editDateTime) {
      setEditError("Please select date & time.");
      return;
    }

    setSavingEdit(true);
    try {
      const supabase = supabaseBrowser();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setEditError("You must be logged in to edit an event.");
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .update({
          title: editTitle,
          starts_at: editDateTime || null,
          location_name: editLocation || null,
        })
        .eq("id", editingEvent.id)
        .select("id,title,starts_at,location_name,created_at")
        .single();

      if (error) {
        setEditError("Error: " + error.message);
        return;
      }

      const updated = data as EventRow;
      setEvents((prev) =>
        prev.map((ev) => (ev.id === updated.id ? updated : ev))
      );

      setShowEditModal(false);
      setEditingEvent(null);
    } finally {
      setSavingEdit(false);
    }
  }

  // DELETE EVENT
  async function handleDelete(ev: EventRow) {
    const confirmed = window.confirm(
      `Delete "${ev.title ?? "this event"}"? This cannot be undone.`
    );
    if (!confirmed) return;

    const supabase = supabaseBrowser();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("You must be logged in to delete an event.");
      return;
    }

    const { error } = await supabase.from("events").delete().eq("id", ev.id);

    if (error) {
      alert("Error deleting event: " + error.message);
      return;
    }

    setEvents((prev) => prev.filter((e) => e.id !== ev.id));
  }

  // INSTALL APP (Android / desktop supporting beforeinstallprompt)
  async function handleInstallClick() {
    if (!installPromptEvent) return;

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;

    if (choice.outcome === "accepted") {
      setShowInstallCard(false);
      setInstallPromptEvent(null);
    }
  }

  return (
    <>
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

      {errorMessage && (
        <pre
          style={{
            backgroundColor: "#fee",
            padding: 8,
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {errorMessage}
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
        {events.map((e) => (
          <div
            key={e.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #e0e0e0",
              fontSize: 14,
            }}
          >
            {/* Left: clickable link to guest list */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link
                href={`/host/events/${e.id}/guests`}
                style={{
                  textDecoration: "none",
                  color: "#111",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                  }}
                >
                  {e.title}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "#555",
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.starts_at
                    ? new Date(e.starts_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : ""}
                </span>
              </Link>
            </div>

            {/* Right: Edit / Delete actions */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginLeft: 8,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => handleOpenEdit(e)}
                style={{
                  border: "none",
                  background: "none",
                  color: "#00627A",
                  cursor: "pointer",
                  fontSize: 12,
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(e)}
                style={{
                  border: "none",
                  background: "none",
                  color: "#B00020",
                  cursor: "pointer",
                  fontSize: 12,
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Optional empty lines when no events, for visual spacing */}
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

      {/* Add Event button (bottom-right) opens create modal */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 24,
        }}
      >
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "10px 22px",
            backgroundColor: "#000",
            color: "#fff",
            borderRadius: 6,
            border: "1px solid #000",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          + Add Event
        </button>
      </div>

      {/* Save to home screen / install helper */}
      <div
        style={{
          marginTop: 24,
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #e0e0e0",
          backgroundColor: "#f8f8f8",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Save Partylink.co to your home screen
        </div>

        {/* Android / desktop PWA prompt */}
        {showInstallCard && installPromptEvent && !isIOS && (
          <>
            <p style={{ margin: "4px 0 8px" }}>
              Install this app on your device for faster access next time.
            </p>
            <button
              type="button"
              onClick={handleInstallClick}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid #000",
                backgroundColor: "#000",
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Install app
            </button>
          </>
        )}

        {/* iOS Safari instructions */}
        {isIOS && (
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            On iPhone: open Partylink.co in <strong>Safari</strong>, tap the{" "}
            <strong>Share</strong> icon, then choose{" "}
            <strong>“Add to Home Screen”</strong>.
          </p>
        )}

        {/* Generic fallback */}
        {!showInstallCard && !isIOS && (
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            In your browser menu, look for <strong>“Install app”</strong> or{" "}
            <strong>“Add to Home Screen”</strong> to save Partylink.co.
          </p>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: "20px 24px",
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  margin: 0,
                }}
              >
                Create Event
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  border: "none",
                  background: "none",
                  fontSize: 18,
                  cursor: "pointer",
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateEvent}>
              <div style={{ marginBottom: 10 }}>
                <label
                  style={{ display: "block", fontSize: 13, marginBottom: 4 }}
                >
                  Party Name
                </label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label
                  style={{ display: "block", fontSize: 13, marginBottom: 4 }}
                >
                  Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={createDateTime}
                  onChange={(e) => setCreateDateTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label
                  style={{ display: "block", fontSize: 13, marginBottom: 4 }}
                >
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={createLocation}
                  onChange={(e) => setCreateLocation(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </div>

              {createError && (
                <div
                  style={{
                    color: "#b00020",
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  {createError}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    background: "#fff",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCreate}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 4,
                    border: "1px solid #000",
                    background: "#000",
                    color: "#fff",
                    fontSize: 14,
                    cursor: "pointer",
                    opacity: savingCreate ? 0.7 : 1,
                  }}
                >
                  {savingCreate ? "Saving..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editingEvent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: "20px 24px",
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  margin: 0,
                }}
              >
                Edit Event
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
                }}
                style={{
                  border: "none",
                  background: "none",
                  fontSize: 18,
                  cursor: "pointer",
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: 10 }}>
                <label
                  style={{ display: "block", fontSize: 13, marginBottom: 4 }}
                >
                  Party Name
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label
                  style={{ display: "block", fontSize: 13, marginBottom: 4 }}
                >
                  Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={editDateTime}
                  onChange={(e) => setEditDateTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label
                  style={{ display: "block", fontSize: 13, marginBottom: 4 }}
                >
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </div>

              {editError && (
                <div
                  style={{
                    color: "#b00020",
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  {editError}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEvent(null);
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    background: "#fff",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 4,
                    border: "1px solid #000",
                    background: "#000",
                    color: "#fff",
                    fontSize: 14,
                    cursor: "pointer",
                    opacity: savingEdit ? 0.7 : 1,
                  }}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
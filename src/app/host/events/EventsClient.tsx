// src/app/host/events/EventsClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

type EventRow = {
  id: string;
  title: string | null;
  starts_at: string | null;
  location_name: string | null;
  created_at: string;
};

export default function EventsClient({
  initialEvents,
  errorMessage,
}: {
  initialEvents: EventRow[];
  errorMessage?: string;
}) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const hasEvents = events.length > 0;

async function handleCreateEvent(e: React.FormEvent) {
  e.preventDefault();
  setFormError(null);

  if (!title.trim()) {
    setFormError("Please enter a party name.");
    return;
  }
  if (!dateTime) {
    setFormError("Please select date & time.");
    return;
  }

  setSaving(true);
  try {
    const supabase = supabaseBrowser();

    // Same as in /host/events/new
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setFormError("You must be logged in to create an event.");
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .insert({
        title,
        // match your existing code: store the raw datetime-local value
        starts_at: dateTime || null,
        location_name: location || null,
        host_user_id: user.id, // critical for RLS
      })
      .select("id,title,starts_at,location_name,created_at")
      .single();

    if (error) {
      setFormError("Error: " + error.message);
      return;
    }

    // Add new event to the top of the list
    setEvents((prev) => [data as EventRow, ...prev]);

    // Reset form + close modal
    setTitle("");
    setDateTime("");
    setLocation("");
    setShowModal(false);
  } finally {
    setSaving(false);
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
          <Link
            key={e.id}
            href={`/host/events/${e.id}/guests`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #e0e0e0",
              textDecoration: "none",
              fontSize: 14,
              color: "#111",
            }}
          >
            <span>{e.title}</span>
            <span style={{ fontSize: 12, color: "#555", textAlign: "right" }}>
              {e.starts_at
                ? new Date(e.starts_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : ""}
            </span>
          </Link>
        ))}

        {/* Optional empty lines if no events (to match mockup visual) */}
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

      {/* Add Event button (bottom-right) opens modal */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 24,
        }}
      >
        <button
          type="button"
          onClick={() => setShowModal(true)}
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

      {/* Modal overlay */}
      {showModal && (
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
                onClick={() => setShowModal(false)}
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
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
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    fontSize: 14,
                  }}
                />
              </div>

              {formError && (
                <div
                  style={{
                    color: "#b00020",
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  {formError}
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
                  onClick={() => setShowModal(false)}
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
                  disabled={saving}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 4,
                    border: "1px solid #000",
                    background: "#000",
                    color: "#fff",
                    fontSize: 14,
                    cursor: "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
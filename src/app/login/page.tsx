"use client";

import { use, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = use(searchParams); // ✅ unwrap Promise
  const nextPath = sp?.next ?? "/host/events";

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function sendLink() {
    setMsg("Sending magic link...");

    const supabase = supabaseBrowser();

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;


    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setMsg(error ? `Error: ${error.message}` : "Check your email for the login link.");
  }

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h1>Login</h1>
      <p style={{ color: "#666" }}>We’ll email you a magic link.</p>

      <label>
        Email
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", marginTop: 6 }}
          placeholder="you@example.com"
        />
      </label>

      <button onClick={sendLink} style={{ marginTop: 16, padding: 10 }}>
        Send login link
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}

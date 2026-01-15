"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = use(searchParams);
  const nextPath = sp?.next ?? "/host/events";

  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [step, setStep] = useState<"send" | "verify">("send");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  async function sendCode() {
    setMsg("Sending code...");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // keeps signups allowed if enabled in Supabase
        shouldCreateUser: true,
      },
    });

    if (error) {
      setMsg("Error: " + error.message);
      return;
    }

    setMsg("Check your email for a 6-digit code.");
    setStep("verify");
  }

  async function verifyCode() {
    setMsg("Verifying...");

    const token = code.trim().replace(/\s+/g, "");

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email", // OTP code flow (not magic link)
    });

    if (error) {
      setMsg("Error: " + error.message);
      return;
    }

    setMsg("Logged in. Redirecting...");
    router.replace(nextPath);
  }

  return (
    <main style={{ maxWidth: 520, margin: "50px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Login</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        We’ll email you a one-time code.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ display: "block", width: "100%", padding: 10 }}
            inputMode="email"
          />
        </label>

        {step === "verify" && (
          <label>
            6-digit code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              style={{ display: "block", width: "100%", padding: 10 }}
              inputMode="numeric"
            />
          </label>
        )}

        {step === "send" ? (
          <button
            onClick={sendCode}
            disabled={!email.trim()}
            style={{ padding: 10 }}
          >
            Send code
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={verifyCode}
              disabled={!email.trim() || code.trim().length < 4}
              style={{ padding: 10 }}
            >
              Verify & login
            </button>
            <button onClick={sendCode} style={{ padding: 10 }}>
              Resend code
            </button>
          </div>
        )}

        {msg && <p style={{ margin: 0 }}>{msg}</p>}

        <p style={{ color: "#666", marginTop: 8 }}>
          After login you’ll be sent to: <code>{nextPath}</code>
        </p>
      </div>
    </main>
  );
}

import { createClient } from "@supabase/supabase-js";

export default async function HealthPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return (
      <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1>Health Check</h1>
        <pre>{JSON.stringify({ ok: false, error: "Missing env vars", urlSet: !!url, anonSet: !!anon }, null, 2)}</pre>
      </main>
    );
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.from("parties").select("id").limit(1);

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Health Check</h1>
      <pre>
        {JSON.stringify(
          { ok: !error, error: error?.message ?? null, sample: data ?? [] },
          null,
          2
        )}
      </pre>
    </main>
  );
}

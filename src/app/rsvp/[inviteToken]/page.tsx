export default function RsvpPage({
  params,
}: {
  params: { inviteToken: string };
}) {
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>RSVP Page</h1>

      <p>
        Invite token: <code>{params.inviteToken}</code>
      </p>

      <p style={{ marginTop: 16, color: "#666" }}>
        This is a placeholder RSVP page.
        <br />
        Later, guests will respond here.
      </p>
    </main>
  );
}

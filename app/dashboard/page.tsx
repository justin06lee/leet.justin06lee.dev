import { requireUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser(); // redirects to "/" if logged out

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-24 lowercase">
      <p className="text-muted">
        signed in as <span className="text-foreground">{user.githubLogin}</span> · tier:{" "}
        <span className="text-foreground">{user.tier}</span>
      </p>
      <div className="rounded border border-border bg-surface p-6">
        <p className="text-muted">your mastery track starts here.</p>
      </div>
    </section>
  );
}

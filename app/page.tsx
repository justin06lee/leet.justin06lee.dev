import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <h1 className="text-3xl font-mono tracking-tight">leetcode, but a mastery course.</h1>
      <p className="text-muted leading-relaxed">
        a tiered syllabus of data structures and techniques. articles teach each pattern,
        problems drill it, and your weak patterns come back on a spaced schedule — so you
        know what to practice and where to stop.
      </p>
      {user ? (
        <Link href="/dashboard" className="text-foreground underline underline-offset-4">
          go to your dashboard →
        </Link>
      ) : (
        <Link href="/api/auth/github" className="text-foreground underline underline-offset-4">
          sign in with github to start →
        </Link>
      )}
    </section>
  );
}

import Link from "next/link";
import { ArrowRight, ClipboardList, FileStack, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between py-4">
          <div className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
            Homestead Keep
          </div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get started</Button>
            </Link>
          </div>
        </header>

        <section className="relative flex flex-1 flex-col justify-center overflow-hidden rounded-[28px] border border-[var(--line)] bg-[linear-gradient(145deg,#10363a_0%,#0f766e_48%,#1f8f7d_100%)] px-6 py-16 text-white shadow-[var(--shadow)] sm:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 28%), radial-gradient(circle at 80% 0%, rgba(255,210,170,0.25), transparent 32%)",
            }}
          />
          <div className="relative max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-teal-100">
              Homestead Keep
            </p>
            <h1 className="text-4xl leading-tight sm:text-6xl">
              Maintenance memory for every home you care for.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-teal-50/90">
              Track appliances, vehicles, warranties, and recurring service — with reminders,
              documents, and an audit trail your household can trust.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="bg-white text-[var(--brand-strong)] hover:bg-teal-50">
                  Start free locally
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="secondary"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/15"
                >
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 py-10 md:grid-cols-3">
          {[
            {
              icon: ClipboardList,
              title: "Schedules that stick",
              body: "Recurring maintenance with overdue detection and in-app reminders.",
            },
            {
              icon: ShieldCheck,
              title: "Warranty awareness",
              body: "Know what is covered before you pay for repairs out of pocket.",
            },
            {
              icon: FileStack,
              title: "Evidence on file",
              body: "Store manuals and receipts in MinIO-backed document storage.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[22px] border border-[var(--line)] bg-white/80 p-5 shadow-sm"
            >
              <item.icon className="text-[var(--brand)]" />
              <h2 className="mt-4 text-xl">{item.title}</h2>
              <p className="mt-2 text-[var(--ink-muted)]">{item.body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Home, LogOut, Wrench } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";

type MeResponse = {
  user: { id: string; email: string; fullName: string };
  households: Array<{ id: string; name: string; role: string }>;
};

export function AppShell({
  children,
  householdId,
}: {
  children: ReactNode;
  householdId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<MeResponse>("/api/auth/me");
        if (!cancelled) setMe(data);
        const notes = await api<{ total: number; items: Array<{ readAt: string | null }> }>(
          "/api/notifications?unreadOnly=true&pageSize=1",
        );
        if (!cancelled) setUnread(notes.total);
      } catch {
        if (!cancelled) router.replace("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const nav = [
    { href: "/app", label: "Households", icon: Home },
    ...(householdId
      ? [
          {
            href: `/households/${householdId}`,
            label: "Dashboard",
            icon: Wrench,
          },
          {
            href: `/households/${householdId}/assets`,
            label: "Assets",
            icon: Wrench,
          },
          {
            href: `/households/${householdId}/audit`,
            label: "Audit",
            icon: Wrench,
          },
        ]
      : []),
    { href: "/notifications", label: "Alerts", icon: Bell },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/app" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)] text-white">
              <Wrench size={18} />
            </span>
            <div>
              <div className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                Homestead Keep
              </div>
              <div className="text-xs text-[var(--ink-muted)]">Home Maintenance Manager</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {me ? (
              <div className="hidden text-right text-sm sm:block">
                <div className="font-semibold">{me.user.fullName}</div>
                <div className="text-[var(--ink-muted)]">{me.user.email}</div>
              </div>
            ) : null}
            <Button variant="ghost" onClick={logout} aria-label="Log out">
              <LogOut size={16} />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                  active
                    ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                    : "text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]",
                )}
              >
                <Icon size={14} />
                {item.label}
                {item.href === "/notifications" && unread > 0 ? (
                  <span className="rounded-full bg-[var(--accent)] px-1.5 text-[10px] text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Alert,
  Badge,
  Button,
  Card,
  PageHeader,
  Spinner,
} from "@/components/ui/primitives";
import { api, ApiClientError } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/utils/cn";

type Dashboard = {
  summary: {
    assetCount: number;
    overdueCount: number;
    dueIn7Days: number;
    expiringWarrantyCount: number;
    unreadNotifications: number;
  };
  overdueSchedules: Array<{
    id: string;
    title: string;
    nextDueAt: string;
    asset: { id: string; name: string };
  }>;
  upcomingSchedules: Array<{
    id: string;
    title: string;
    nextDueAt: string;
    asset: { id: string; name: string };
  }>;
  expiringWarranties: Array<{
    id: string;
    provider: string;
    endsOn: string;
    asset: { id: string; name: string };
  }>;
  recentRecords: Array<{
    id: string;
    title: string;
    performedAt: string;
    asset: { id: string; name: string };
  }>;
};

export default function HouseholdDashboardPage() {
  const params = useParams<{ id: string }>();
  const householdId = params.id;
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await api<Dashboard>(`/api/households/${householdId}/dashboard`);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  return (
    <AppShell householdId={householdId}>
      <PageHeader
        title="Household dashboard"
        description="Overdue work, upcoming maintenance, and warranty risk at a glance."
        actions={
          <Link href={`/households/${householdId}/assets`}>
            <Button>Manage assets</Button>
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Alert>{error}</Alert>
      ) : data ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Assets", value: data.summary.assetCount },
              { label: "Overdue", value: data.summary.overdueCount },
              { label: "Due in 7 days", value: data.summary.dueIn7Days },
              { label: "Warranties expiring", value: data.summary.expiringWarrantyCount },
            ].map((stat) => (
              <Card key={stat.label}>
                <div className="text-sm text-[var(--ink-muted)]">{stat.label}</div>
                <div className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                  {stat.value}
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl">Overdue maintenance</h2>
                <Badge tone="danger">{data.overdueSchedules.length}</Badge>
              </div>
              {data.overdueSchedules.length === 0 ? (
                <p className="text-[var(--ink-muted)]">Nothing overdue. Nice work.</p>
              ) : (
                <ul className="space-y-3">
                  {data.overdueSchedules.map((item) => (
                    <li key={item.id} className="rounded-xl border border-[var(--line)] p-3">
                      <Link
                        className="font-semibold text-[var(--brand-strong)]"
                        href={`/households/${householdId}/assets/${item.asset.id}`}
                      >
                        {item.title}
                      </Link>
                      <div className="text-sm text-[var(--ink-muted)]">
                        {item.asset.name} · due {formatDateTime(item.nextDueAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl">Upcoming (30 days)</h2>
                <Badge tone="warning">{data.upcomingSchedules.length}</Badge>
              </div>
              {data.upcomingSchedules.length === 0 ? (
                <p className="text-[var(--ink-muted)]">No upcoming schedules in the next month.</p>
              ) : (
                <ul className="space-y-3">
                  {data.upcomingSchedules.map((item) => (
                    <li key={item.id} className="rounded-xl border border-[var(--line)] p-3">
                      <Link
                        className="font-semibold text-[var(--brand-strong)]"
                        href={`/households/${householdId}/assets/${item.asset.id}`}
                      >
                        {item.title}
                      </Link>
                      <div className="text-sm text-[var(--ink-muted)]">
                        {item.asset.name} · {formatDateTime(item.nextDueAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-4 text-xl">Expiring warranties</h2>
              {data.expiringWarranties.length === 0 ? (
                <p className="text-[var(--ink-muted)]">No warranties ending soon.</p>
              ) : (
                <ul className="space-y-3">
                  {data.expiringWarranties.map((item) => (
                    <li key={item.id} className="rounded-xl border border-[var(--line)] p-3">
                      <div className="font-semibold">{item.asset.name}</div>
                      <div className="text-sm text-[var(--ink-muted)]">
                        {item.provider} · ends {formatDate(item.endsOn)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-4 text-xl">Recent service</h2>
              {data.recentRecords.length === 0 ? (
                <p className="text-[var(--ink-muted)]">No service history yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.recentRecords.map((item) => (
                    <li key={item.id} className="rounded-xl border border-[var(--line)] p-3">
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-sm text-[var(--ink-muted)]">
                        {item.asset.name} · {formatDateTime(item.performedAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

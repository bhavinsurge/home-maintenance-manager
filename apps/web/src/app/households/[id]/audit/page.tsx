"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Alert,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from "@/components/ui/primitives";
import { api, ApiClientError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils/cn";

type AuditItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: { fullName: string; email: string } | null;
};

export default function AuditPage() {
  const params = useParams<{ id: string }>();
  const householdId = params.id;
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ items: AuditItem[] }>(
          `/api/households/${householdId}/audit-logs?pageSize=50`,
        );
        if (!cancelled) setItems(data.items);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Failed to load audit log");
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
        title="Audit history"
        description="Append-only record of household mutations for accountability."
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Alert>{error}</Alert>
      ) : items.length === 0 ? (
        <EmptyState title="No audit events" description="Actions will appear here as the household changes." />
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--line)]">
            {items.map((item) => (
              <li key={item.id} className="py-3">
                <div className="font-semibold">{item.action}</div>
                <div className="text-sm text-[var(--ink-muted)]">
                  {item.entityType}
                  {item.entityId ? ` · ${item.entityId.slice(0, 8)}` : ""} ·{" "}
                  {item.actor?.fullName ?? "System"} · {formatDateTime(item.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}

"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui/primitives";
import { api, ApiClientError } from "@/lib/api-client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/cn";

type AssetDetail = {
  asset: {
    id: string;
    name: string;
    category: string;
    status: string;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
    notes: string | null;
  };
  schedules: Array<{
    id: string;
    title: string;
    frequency: string;
    nextDueAt: string;
    isActive: boolean;
  }>;
  warranties: Array<{
    id: string;
    provider: string;
    startsOn: string;
    endsOn: string;
    coverageNotes: string | null;
  }>;
  recentRecords: Array<{
    id: string;
    title: string;
    performedAt: string;
    cost: string | null;
    vendor: string | null;
  }>;
  documents: Array<{
    id: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    createdAt: string;
  }>;
};

export default function AssetDetailPage() {
  const params = useParams<{ id: string; assetId: string }>();
  const householdId = params.id;
  const assetId = params.assetId;
  const [data, setData] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [scheduleTitle, setScheduleTitle] = useState("");
  const [frequency, setFrequency] = useState("ANNUAL");
  const [nextDueAt, setNextDueAt] = useState("");
  const [intervalDays, setIntervalDays] = useState("30");

  const [warrantyProvider, setWarrantyProvider] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");

  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await api<AssetDetail>(`/api/assets/${assetId}`);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load asset");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional remote fetch when asset changes
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  async function createSchedule(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await api(`/api/assets/${assetId}/schedules`, {
        method: "POST",
        json: {
          title: scheduleTitle,
          frequency,
          nextDueAt: new Date(nextDueAt).toISOString(),
          intervalDays: frequency === "CUSTOM_DAYS" ? Number(intervalDays) : null,
        },
      });
      setScheduleTitle("");
      setMessage("Schedule created");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create schedule");
    }
  }

  async function completeSchedule(scheduleId: string) {
    setMessage(null);
    try {
      await api(`/api/schedules/${scheduleId}/complete`, {
        method: "POST",
        json: {},
      });
      setMessage("Maintenance marked complete");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to complete schedule");
    }
  }

  async function createWarranty(e: FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/assets/${assetId}/warranties`, {
        method: "POST",
        json: {
          provider: warrantyProvider,
          startsOn,
          endsOn,
        },
      });
      setWarrantyProvider("");
      setMessage("Warranty added");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to add warranty");
    }
  }

  async function uploadDocument(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setUploading(true);
    setError(null);
    try {
      const response = await fetch(`/api/assets/${assetId}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const payload = await response.json();
      if (!payload.success) {
        throw new ApiClientError(payload.error.message, payload.error.code, response.status);
      }
      form.reset();
      setMessage("Document uploaded");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell householdId={householdId}>
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error && !data ? (
        <Alert>{error}</Alert>
      ) : data ? (
        <>
          <PageHeader
            title={data.asset.name}
            description={[data.asset.manufacturer, data.asset.model, data.asset.serialNumber]
              .filter(Boolean)
              .join(" · ")}
            actions={
              <>
                <Badge tone="brand">{data.asset.category}</Badge>
                <Badge tone="success">{data.asset.status}</Badge>
              </>
            }
          />

          {message ? <div className="mb-4"><Alert tone="success">{message}</Alert></div> : null}
          {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-xl">Maintenance schedules</h2>
              <ul className="mb-5 space-y-3">
                {data.schedules.length === 0 ? (
                  <li className="text-[var(--ink-muted)]">No active schedules.</li>
                ) : (
                  data.schedules.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-col gap-2 rounded-xl border border-[var(--line)] p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-semibold">{s.title}</div>
                        <div className="text-sm text-[var(--ink-muted)]">
                          {s.frequency} · next {formatDateTime(s.nextDueAt)}
                        </div>
                      </div>
                      {s.isActive ? (
                        <Button size="sm" onClick={() => void completeSchedule(s.id)}>
                          Mark complete
                        </Button>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
              <form className="space-y-3 border-t border-[var(--line)] pt-4" onSubmit={createSchedule}>
                <Field label="Schedule title" htmlFor="scheduleTitle">
                  <Input
                    id="scheduleTitle"
                    required
                    value={scheduleTitle}
                    onChange={(e) => setScheduleTitle(e.target.value)}
                  />
                </Field>
                <Field label="Frequency" htmlFor="frequency">
                  <Select
                    id="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    {["ONCE", "WEEKLY", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "CUSTOM_DAYS"].map(
                      (f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ),
                    )}
                  </Select>
                </Field>
                {frequency === "CUSTOM_DAYS" ? (
                  <Field label="Interval days" htmlFor="intervalDays">
                    <Input
                      id="intervalDays"
                      type="number"
                      min={1}
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(e.target.value)}
                    />
                  </Field>
                ) : null}
                <Field label="Next due" htmlFor="nextDueAt">
                  <Input
                    id="nextDueAt"
                    type="datetime-local"
                    required
                    value={nextDueAt}
                    onChange={(e) => setNextDueAt(e.target.value)}
                  />
                </Field>
                <Button type="submit">Add schedule</Button>
              </form>
            </Card>

            <Card>
              <h2 className="mb-4 text-xl">Warranties</h2>
              <ul className="mb-5 space-y-3">
                {data.warranties.length === 0 ? (
                  <li className="text-[var(--ink-muted)]">No warranties on file.</li>
                ) : (
                  data.warranties.map((w) => (
                    <li key={w.id} className="rounded-xl border border-[var(--line)] p-3">
                      <div className="font-semibold">{w.provider}</div>
                      <div className="text-sm text-[var(--ink-muted)]">
                        {formatDate(w.startsOn)} → {formatDate(w.endsOn)}
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <form className="space-y-3 border-t border-[var(--line)] pt-4" onSubmit={createWarranty}>
                <Field label="Provider" htmlFor="provider">
                  <Input
                    id="provider"
                    required
                    value={warrantyProvider}
                    onChange={(e) => setWarrantyProvider(e.target.value)}
                  />
                </Field>
                <Field label="Starts on" htmlFor="startsOn">
                  <Input
                    id="startsOn"
                    type="date"
                    required
                    value={startsOn}
                    onChange={(e) => setStartsOn(e.target.value)}
                  />
                </Field>
                <Field label="Ends on" htmlFor="endsOn">
                  <Input
                    id="endsOn"
                    type="date"
                    required
                    value={endsOn}
                    onChange={(e) => setEndsOn(e.target.value)}
                  />
                </Field>
                <Button type="submit">Add warranty</Button>
              </form>
            </Card>

            <Card>
              <h2 className="mb-4 text-xl">Service history</h2>
              <ul className="space-y-3">
                {data.recentRecords.length === 0 ? (
                  <li className="text-[var(--ink-muted)]">No service records yet.</li>
                ) : (
                  data.recentRecords.map((r) => (
                    <li key={r.id} className="rounded-xl border border-[var(--line)] p-3">
                      <div className="font-semibold">{r.title}</div>
                      <div className="text-sm text-[var(--ink-muted)]">
                        {formatDateTime(r.performedAt)}
                        {r.vendor ? ` · ${r.vendor}` : ""}
                        {r.cost ? ` · ${formatCurrency(r.cost)}` : ""}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </Card>

            <Card>
              <h2 className="mb-4 text-xl">Documents</h2>
              <ul className="mb-5 space-y-3">
                {data.documents.length === 0 ? (
                  <li className="text-[var(--ink-muted)]">No documents uploaded.</li>
                ) : (
                  data.documents.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] p-3"
                    >
                      <div>
                        <div className="font-semibold">{d.fileName}</div>
                        <div className="text-sm text-[var(--ink-muted)]">
                          {Math.round(d.sizeBytes / 1024)} KB · {formatDate(d.createdAt)}
                        </div>
                      </div>
                      <a
                        className="text-sm font-semibold text-[var(--brand)]"
                        href={`/api/documents/${d.id}/download`}
                      >
                        Download
                      </a>
                    </li>
                  ))
                )}
              </ul>
              <form className="space-y-3 border-t border-[var(--line)] pt-4" onSubmit={uploadDocument}>
                <Field label="Upload file" htmlFor="file">
                  <Input id="file" name="file" type="file" required />
                </Field>
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Uploading…" : "Upload document"}
                </Button>
              </form>
            </Card>
          </div>

          {data.asset.notes ? (
            <Card className="mt-4">
              <h2 className="mb-2 text-xl">Notes</h2>
              <p className="whitespace-pre-wrap text-[var(--ink-muted)]">{data.asset.notes}</p>
            </Card>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}

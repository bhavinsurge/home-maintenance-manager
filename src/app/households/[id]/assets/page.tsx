"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui/primitives";
import { api, ApiClientError } from "@/lib/api-client";

type Asset = {
  id: string;
  name: string;
  category: string;
  status: string;
  manufacturer: string | null;
  model: string | null;
};

const CATEGORIES = [
  "APPLIANCE",
  "VEHICLE",
  "HVAC",
  "ELECTRONICS",
  "OUTDOOR",
  "OTHER",
];

export default function AssetsPage() {
  const params = useParams<{ id: string }>();
  const householdId = params.id;
  const [items, setItems] = useState<Asset[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [assetCategory, setAssetCategory] = useState("APPLIANCE");
  const [manufacturer, setManufacturer] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (q) query.set("q", q);
      if (category) query.set("category", category);
      const data = await api<{ items: Asset[] }>(
        `/api/households/${householdId}/assets?${query.toString()}`,
      );
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional remote fetch on mount
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api(`/api/households/${householdId}/assets`, {
        method: "POST",
        json: {
          name,
          category: assetCategory,
          manufacturer: manufacturer || null,
        },
      });
      setName("");
      setManufacturer("");
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Could not create asset");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell householdId={householdId}>
      <PageHeader
        title="Assets"
        description="Appliances, vehicles, HVAC, and other equipment under this household."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "Add asset"}
          </Button>
        }
      />

      <Card className="mb-6">
        <form
          className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <Input
            placeholder="Search name, manufacturer, model…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </Card>

      {showForm ? (
        <Card className="mb-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onCreate}>
            {formError ? (
              <div className="md:col-span-2">
                <Alert>{formError}</Alert>
              </div>
            ) : null}
            <Field label="Name" htmlFor="name">
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Category" htmlFor="category">
              <Select
                id="category"
                value={assetCategory}
                onChange={(e) => setAssetCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Manufacturer" htmlFor="manufacturer">
              <Input
                id="manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save asset"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Alert>{error}</Alert>
      ) : items.length === 0 ? (
        <EmptyState
          title="No assets found"
          description="Add your first appliance, vehicle, or piece of equipment."
          action={<Button onClick={() => setShowForm(true)}>Add asset</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {items.map((asset) => (
            <Link key={asset.id} href={`/households/${householdId}/assets/${asset.id}`}>
              <Card className="flex flex-col gap-2 transition hover:border-[var(--brand)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl">{asset.name}</h2>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || "No make/model"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge tone="brand">{asset.category}</Badge>
                  <Badge tone={asset.status === "ACTIVE" ? "success" : "neutral"}>
                    {asset.status}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

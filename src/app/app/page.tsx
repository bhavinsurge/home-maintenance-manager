"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Spinner,
  TextArea,
} from "@/components/ui/primitives";
import { api, ApiClientError } from "@/lib/api-client";

type Household = {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  role: string;
};

export default function AppHomePage() {
  const [items, setItems] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ items: Household[] }>("/api/households");
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load households");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial client-side data load for authenticated household list.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional remote fetch on mount
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      await api("/api/households", {
        method: "POST",
        json: { name, city: city || null, notes: notes || null },
      });
      setName("");
      setCity("");
      setNotes("");
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Could not create household");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Your households"
        description="Each household is an isolated property with its own assets, schedules, and members."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "New household"}
          </Button>
        }
      />

      {showForm ? (
        <Card className="mb-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onCreate}>
            {formError ? (
              <div className="md:col-span-2">
                <Alert>{formError}</Alert>
              </div>
            ) : null}
            <Field label="Household name" htmlFor="name">
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="City" htmlFor="city">
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Notes" htmlFor="notes">
                <TextArea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create household"}
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
          title="No households yet"
          description="Create your first property to start tracking assets and maintenance."
          action={<Button onClick={() => setShowForm(true)}>Create household</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((hh) => (
            <Link key={hh.id} href={`/households/${hh.id}`}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-[var(--brand)]">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                  {hh.role}
                </div>
                <h2 className="mt-2 text-2xl">{hh.name}</h2>
                <p className="mt-2 text-[var(--ink-muted)]">
                  {[hh.city, hh.region].filter(Boolean).join(", ") || "No location set"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

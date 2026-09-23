"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import { Alert, Button, Card, Field, Input } from "@/components/ui/primitives";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/login", {
        method: "POST",
        json: { email, password },
      });
      router.replace("/app");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
            Homestead Keep
          </p>
          <h1 className="mt-2 text-3xl">Welcome back</h1>
          <p className="mt-2 text-[var(--ink-muted)]">Sign in to manage your household assets.</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          {error ? <Alert>{error}</Alert> : null}
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-5 text-sm text-[var(--ink-muted)]">
          No account?{" "}
          <Link className="font-semibold text-[var(--brand)]" href="/register">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}

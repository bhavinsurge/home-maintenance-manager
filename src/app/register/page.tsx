"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import { Alert, Button, Card, Field, Input } from "@/components/ui/primitives";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/register", {
        method: "POST",
        json: { fullName, email, password },
      });
      router.replace("/app");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Registration failed");
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
          <h1 className="mt-2 text-3xl">Create your account</h1>
          <p className="mt-2 text-[var(--ink-muted)]">
            Passwords need 10+ characters with letters and numbers.
          </p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          {error ? <Alert>{error}</Alert> : null}
          <Field label="Full name" htmlFor="fullName">
            <Input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-5 text-sm text-[var(--ink-muted)]">
          Already registered?{" "}
          <Link className="font-semibold text-[var(--brand)]" href="/login">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}

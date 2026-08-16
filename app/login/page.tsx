"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--st-bg)] px-5 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--st-red)] text-sm font-extrabold text-white">
            ST
          </div>

          <p className="mt-5 mb-0 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--st-red)]">
            SAUTI TAMU
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--st-charcoal-dark)]">
            Administration
          </h1>

          <p className="mt-2 text-xs text-[var(--st-gray)]">
            Sign in to manage bookings and follow-ups.
          </p>
        </div>

        <div className="st-card p-6 sm:p-7">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="admin@example.com"
                className="w-full rounded-xl border border-[var(--st-border)] bg-white px-4 py-3 text-sm text-[var(--st-charcoal-dark)] outline-none transition focus:border-[var(--st-red)]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                />

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3 pl-11 pr-4 text-sm text-[var(--st-charcoal-dark)] outline-none transition focus:border-[var(--st-red)]"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] leading-relaxed text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="st-button st-button-primary w-full"
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[9px] text-[var(--st-gray)]">
          Sauti Tamu Piano Center
        </p>
      </div>
    </main>
  );
}
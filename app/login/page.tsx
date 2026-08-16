"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
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
      setError(
        error.message === "Invalid login credentials"
          ? "The email or password is incorrect."
          : error.message
      );

      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[var(--st-bg)] px-5 py-10">
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        <div className="w-full max-w-[430px]">

          {/* BRAND */}

          <div className="mb-8 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--st-red)] text-[16px] font-extrabold tracking-tight text-white shadow-sm">
              ST
            </div>

            <p className="mt-5 mb-0 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--st-red)]">
              SAUTI TAMU
            </p>

            <h1 className="mt-2 text-[28px] font-bold tracking-[-0.04em] text-[var(--st-charcoal-dark)]">
              Administration
            </h1>

            <p className="mx-auto mt-2 max-w-[300px] text-[12px] leading-relaxed text-[var(--st-gray)]">
              Sign in to manage trial bookings,
              leads and follow-ups.
            </p>

          </div>

          {/* LOGIN CARD */}

          <div className="st-card p-6 sm:p-8">

            <div className="mb-6">
              <h2 className="m-0 text-[17px] font-bold text-[var(--st-charcoal-dark)]">
                Welcome back
              </h2>

              <p className="mt-1 mb-0 text-[10px] text-[var(--st-gray)]">
                Enter your administrator credentials.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* EMAIL */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]"
                >
                  Email address
                </label>

                <div className="relative">

                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="admin@example.com"
                    className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[13px] text-[var(--st-charcoal-dark)] outline-none transition placeholder:text-[var(--st-gray)] focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                  />

                </div>
              </div>

              {/* PASSWORD */}

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-charcoal)]"
                >
                  Password
                </label>

                <div className="relative">

                  <LockKeyhole
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
                  />

                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3.5 pl-11 pr-4 text-[13px] text-[var(--st-charcoal-dark)] outline-none transition placeholder:text-[var(--st-gray)] focus:border-[var(--st-red)] focus:ring-2 focus:ring-[var(--st-red)]/10"
                  />

                </div>
              </div>

              {/* ERROR */}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="m-0 text-[10px] leading-relaxed text-red-700">
                    {error}
                  </p>
                </div>
              )}

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={loading}
                className="st-button st-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
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

          {/* FOOTER */}

          <div className="mt-7 text-center">

            <p className="m-0 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--st-gray)]">
              Sauti Tamu Piano Center
            </p>

            <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">
              Booking & Follow-up
            </p>

          </div>

        </div>
      </div>
    </main>
  );
}
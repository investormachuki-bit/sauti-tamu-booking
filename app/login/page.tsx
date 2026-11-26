"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Music2,
  ShieldCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "The email address or password is incorrect. Please try again."
          : signInError.message
      );
      setLoading(false);
      return;
    }

    window.location.replace("/admin");
  }

  return (
    <main className="min-h-screen bg-[#f6eeee] px-4 py-8 sm:px-6 lg:flex lg:items-center lg:justify-center lg:py-12">
      <div className="mx-auto grid min-h-[min(760px,calc(100vh-4rem))] w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-[#eadede] bg-white shadow-[0_24px_80px_rgba(75,45,45,0.10)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#9f202b] p-12 text-white lg:flex">
          <div className="absolute -right-24 -top-20 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -right-10 -top-6 h-52 w-52 rounded-full border border-white/10" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-black tracking-tight text-[#a51f2b]">ST</div>
            <div>
              <p className="m-0 text-sm font-bold tracking-wide">SAUTI TAMU</p>
              <p className="m-0 mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/65">Piano Center</p>
            </div>
          </div>

          <div className="relative z-10 max-w-[360px]">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <Music2 size={25} />
            </div>
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.24em] text-white/65">Administration workspace</p>
            <h1 className="m-0 text-[38px] font-bold leading-[1.12] tracking-[-0.045em]">Your music business, in harmony.</h1>
            <p className="mt-5 max-w-[310px] text-sm leading-7 text-white/75">Manage trial bookings, students, lessons and finances from one secure workspace.</p>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-[10px] text-white/65">
            <ShieldCheck size={14} />
            <span>Secure administrator access</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-[390px]">
            <div className="mb-9 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c51f2a] text-sm font-black text-white">ST</div>
                <div>
                  <p className="m-0 text-sm font-extrabold tracking-wide text-[#353535]">SAUTI TAMU</p>
                  <p className="m-0 mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#999]">Piano Center</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c51f2a]">Administrator sign in</p>
              <h2 className="m-0 text-[30px] font-bold tracking-[-0.045em] text-[#303030]">Welcome back</h2>
              <p className="mt-2 text-[12px] leading-6 text-[#888]">Sign in to continue to your Sauti Tamu workspace.</p>
            </div>

            {searchParams.get("loggedOut") === "1" && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#dce9df] bg-[#f2f8f3] px-4 py-3 text-[11px] leading-5 text-[#477451]">
                <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                <span>You have been signed out securely.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.09em] text-[#555]">Email address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aaa]" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-[#e8e1e1] bg-[#fffdfd] py-3.5 pl-11 pr-4 text-[13px] text-[#353535] outline-none transition placeholder:text-[#b4adad] focus:border-[#c51f2a] focus:ring-4 focus:ring-[#c51f2a]/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.09em] text-[#555]">Password</label>
                <div className="relative">
                  <LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aaa]" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-[#e8e1e1] bg-[#fffdfd] py-3.5 pl-11 pr-12 text-[13px] text-[#353535] outline-none transition placeholder:text-[#b4adad] focus:border-[#c51f2a] focus:ring-4 focus:ring-[#c51f2a]/[0.07]"
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#999] hover:bg-[#f6eeee] hover:text-[#c51f2a]">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] leading-5 text-red-700">{error}</div>
              )}

              <button type="submit" disabled={loading} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#c51f2a] px-5 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(197,31,42,0.18)] transition hover:bg-[#a81722] disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Signing in..." : <>Sign in to dashboard <ArrowRight size={15} /></>}
              </button>
            </form>

            <div className="mt-8 border-t border-[#f0eaea] pt-5 text-center">
              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.16em] text-[#777]">Sauti Tamu Piano Center</p>
              <p className="mb-0 mt-1 text-[9px] text-[#aaa]">Booking &amp; Financial Management</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

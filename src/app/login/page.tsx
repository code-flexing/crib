"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { SafeCribLogo } from "@/components/branding/SafeCribLogo";
import { VerifiedHomeIllustration } from "@/components/branding/VerifiedHomeIllustration";
import { Button } from "@/components/ui/Button";

const API_URL = "/api/auth/login";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goNext = () => {
    setError("");

    if (step === 1) {
      if (!email.trim()) {
        setError("Email is required.");
        return;
      }

      if (!isValidEmail(email)) {
        setError("Enter a valid email address.");
        return;
      }
    }

    if (step === 2) {
      if (!password) {
        setError("Password is required.");
        return;
      }

      void handleSubmit();
      return;
    }

    setStep((current) => (current === 0 ? 1 : 2));
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    setError("");

    if (!password) {
      setError("Password is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(response.status === 401 ? "Invalid email or password." : "We could not log you in right now. Please try again.");
        return;
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("accessToken" in result) ||
        !("refreshToken" in result) ||
        typeof result.accessToken !== "string" ||
        typeof result.refreshToken !== "string"
      ) {
        setError("Login succeeded, but the server returned an invalid token response.");
        return;
      }

      localStorage.setItem("safecrib_access_token", result.accessToken);
      localStorage.setItem("safecrib_refresh_token", result.refreshToken);
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (step === 2) {
      void handleSubmit();
      return;
    }

    goNext();
  };

  const title = step === 0 ? "Welcome back" : step === 1 ? "What is your email?" : "Enter your password";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(12,115,85,0.08),_transparent_28%),_linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] px-4 py-10">
      <div className="w-full max-w-md rounded-[18px] border border-black/10 bg-white p-8 shadow-[0_24px_60px_rgba(11,12,14,0.08)]">
        <div className="flex justify-center">
          <SafeCribLogo height={32} href={false} />
        </div>

        <div className="mt-6 flex items-center justify-between text-[0.7rem] font-medium uppercase tracking-[0.18em] text-black/45">
          <span>{step === 0 ? "Welcome" : step === 1 ? "Email" : "Password"}</span>
          <span>{step + 1}/3</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
          <div className="h-full rounded-full bg-safecrib-green transition-all duration-300" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>

        <form onSubmit={handleFormSubmit} className="mt-8" noValidate>
          <h1 className="text-center text-3xl font-medium text-safecrib-black">{title}</h1>

          {step === 0 && (
            <div className="mt-6">
              <div className="overflow-hidden rounded-[14px] border border-black/10 bg-[#f7faf8] px-5 py-3 shadow-[0_12px_28px_rgba(11,12,14,0.04)]">
                <div className="mx-auto max-w-[220px]">
                  <VerifiedHomeIllustration />
                </div>
              </div>
              <p className="mt-4 text-center text-sm leading-6 text-black/60">
                Continue to your trusted accommodation space.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="mt-8">
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-safecrib-black">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@university.edu"
                className="w-full rounded-[8px] border border-black/15 bg-white px-4 py-3 text-base text-safecrib-black placeholder:text-black/35 focus:border-safecrib-green focus:outline-none"
              />
            </div>
          )}

          {step === 2 && (
            <div className="mt-8">
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-safecrib-black">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-[8px] border border-black/15 bg-white px-4 py-3 text-base text-safecrib-black placeholder:text-black/35 focus:border-safecrib-green focus:outline-none"
              />
              <button type="button" className="mt-3 text-sm font-medium text-safecrib-green">Forgot password?</button>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}

          <div className="mt-8 flex items-center justify-between gap-3">
            {step === 0 ? (
              <Link href="/" className="text-sm font-medium text-black/65 hover:text-safecrib-black">Back home</Link>
            ) : (
              <button type="button" onClick={() => { setError(""); setStep((current) => current === 2 ? 1 : 0); }} className="text-sm font-medium text-black/65 hover:text-safecrib-black">Back</button>
            )}
            <Button type="button" onClick={goNext} loading={isSubmitting}>
              {step === 0 ? "Continue to login" : step === 2 ? "Log in" : "Continue"}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-black/60">
          Need an account? <Link href="/signup" className="font-medium text-safecrib-green">Create one</Link>
        </div>
      </div>
    </main>
  );
}

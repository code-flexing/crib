"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SafeCribLogo } from "@/components/branding/SafeCribLogo";
import { VerifiedHomeIllustration } from "@/components/branding/VerifiedHomeIllustration";
import { Button } from "@/components/ui/Button";
import { readDraft, removeDraft, writeDraft } from "@/lib/drafts";

const API_URL = "/api/auth/register";

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
};

type StepErrors = Partial<Record<keyof FormState, string>> & {
  submit?: string;
};

type SignupDraft = {
  email: string;
  displayName: string;
  step: number;
};

const emptyForm: FormState = {
  email: "",
  password: "",
  confirmPassword: "",
  displayName: "",
};

const SIGNUP_DRAFT_KEY = "safecrib:draft:signup:v1";

const stepLabels = [
  "Welcome",
  "Email",
  "Display name",
  "Password",
  "Confirm password",
  "Review",
  "Success",
];

const passwordRules = [
  { label: "8+ characters", valid: (value: string) => value.length >= 8 },
  { label: "1 number", valid: (value: string) => /\d/.test(value) },
  { label: "1 uppercase letter", valid: (value: string) => /[A-Z]/.test(value) },
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignUpPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<StepErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    const draft = readDraft<SignupDraft>(SIGNUP_DRAFT_KEY);
    if (draft) {
      setForm((current) => ({ ...current, email: draft.email, displayName: draft.displayName }));
      setStep(Math.min(Math.max(draft.step, 0), stepLabels.length - 2));
      setDraftRestored(true);
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated || isSuccess) return;
    const timeout = window.setTimeout(() => writeDraft<SignupDraft>(SIGNUP_DRAFT_KEY, {
      email: form.email,
      displayName: form.displayName,
      step,
    }), 400);
    return () => window.clearTimeout(timeout);
  }, [draftHydrated, form.displayName, form.email, isSuccess, step]);

  const progress = ((step + 1) / stepLabels.length) * 100;

  const currentStepLabel = stepLabels[Math.min(step, stepLabels.length - 1)];

  const passwordChecks = useMemo(
    () => passwordRules.map((rule) => ({ ...rule, passed: rule.valid(form.password) })),
    [form.password],
  );

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, submit: undefined }));
  };

  const validateCurrentStep = () => {
    switch (step) {
      case 1: {
        if (!form.email.trim()) {
          setErrors((current) => ({ ...current, email: "Email is required." }));
          return false;
        }

        if (!isValidEmail(form.email)) {
          setErrors((current) => ({ ...current, email: "Enter a valid email address." }));
          return false;
        }

        setErrors((current) => ({ ...current, email: undefined }));
        return true;
      }

      case 2: {
        if (!form.displayName.trim()) {
          setErrors((current) => ({ ...current, displayName: "Display name is required." }));
          return false;
        }

        setErrors((current) => ({ ...current, displayName: undefined }));
        return true;
      }

      case 3: {
        if (!form.password) {
          setErrors((current) => ({ ...current, password: "Password is required." }));
          return false;
        }

        if (form.password.length < 8 || !/\d/.test(form.password) || !/[A-Z]/.test(form.password)) {
          setErrors((current) => ({ ...current, password: "Use 8+ characters, 1 number and 1 uppercase letter." }));
          return false;
        }

        setErrors((current) => ({ ...current, password: undefined }));
        return true;
      }

      case 4: {
        if (!form.confirmPassword) {
          setErrors((current) => ({ ...current, confirmPassword: "Please confirm your password." }));
          return false;
        }

        if (form.confirmPassword !== form.password) {
          setErrors((current) => ({ ...current, confirmPassword: "Passwords do not match." }));
          return false;
        }

        setErrors((current) => ({ ...current, confirmPassword: undefined }));
        return true;
      }

      default:
        return true;
    }
  };

  const validateAccountStep = () => {
    const nextErrors: StepErrors = {};

    if (!form.email.trim()) nextErrors.email = "Email is required.";
    else if (!isValidEmail(form.email)) nextErrors.email = "Enter a valid email address.";

    if (!form.password) nextErrors.password = "Password is required.";
    else if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    else if (!/\d/.test(form.password) || !/[A-Z]/.test(form.password)) {
      nextErrors.password = "Use at least 1 number and 1 uppercase letter.";
    }

    if (!form.confirmPassword) nextErrors.confirmPassword = "Please confirm your password.";
    else if (form.confirmPassword !== form.password) nextErrors.confirmPassword = "Passwords do not match.";

    if (!form.displayName.trim()) nextErrors.displayName = "Display name is required.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (step >= 1 && step <= 4) {
      const isValid = validateCurrentStep();
      if (!isValid) return;
    }

    setStep((current) => Math.min(current + 1, stepLabels.length - 1));
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0));
  };

  const discardDraft = () => {
    removeDraft(SIGNUP_DRAFT_KEY);
    setForm(emptyForm);
    setStep(0);
    setErrors({});
    setDraftRestored(false);
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();

    const isValid = validateAccountStep();
    if (!isValid) return;

    setIsSubmitting(true);
    setErrors((current) => ({ ...current, submit: undefined }));

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          displayName: form.displayName.trim(),
        }),
      });

      if (!response.ok) {
        const message = response.status === 409 ? "An account with this email already exists." : "We could not create your account right now. Please try again.";
        setErrors((current) => ({ ...current, submit: message }));
        return;
      }

      setIsSuccess(true);
      removeDraft(SIGNUP_DRAFT_KEY);
      setStep(stepLabels.length - 1);
    } catch {
      setErrors((current) => ({ ...current, submit: "Network error. Please try again." }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (isSuccess || step === stepLabels.length - 1) {
      return (
        <div className="flex w-full max-w-xl flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-safecrib-green/10 text-3xl text-safecrib-green">
            ✓
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-safecrib-green">
            Welcome aboard
          </p>
          <h2 className="mt-3 text-3xl font-medium text-safecrib-black sm:text-4xl">
            Your account is ready
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-black/65 sm:text-base">
            You’re all set. Log in to continue and choose how you want to use SafeCrib.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className="flex-1">
              <Button className="w-full">Go to login</Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="secondary" className="w-full">Back home</Button>
            </Link>
          </div>
        </div>
      );
    }

    if (step === 0) {
      return (
        <div className="w-full max-w-lg text-center">
          <h1 className="mt-4 text-4xl font-medium text-safecrib-black sm:text-5xl">
            Create your account
          </h1>

          <div className="mt-5 overflow-hidden rounded-[18px] border border-black/10 bg-[#f7faf8] p-2 shadow-[0_12px_28px_rgba(11,12,14,0.04)]">
            <div className="mx-auto max-w-[220px]">
              <VerifiedHomeIllustration />
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button type="button" onClick={goNext} className="min-w-[180px]">Create account</Button>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="w-full max-w-xl">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-safecrib-green">
              Step 1 of 6
            </p>
            <h2 className="mt-3 text-3xl font-medium text-safecrib-black">What is your email?</h2>
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-safecrib-black">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="yourname@gmail.com"
              className="w-full rounded-[8px] border border-black/15 bg-white px-4 py-3 text-base text-safecrib-black placeholder:text-black/35 focus:border-safecrib-green focus:outline-none"
            />
            {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <Link href="/" className="text-sm font-medium text-black/65 hover:text-safecrib-black">
              Back home
            </Link>
            <Button type="button" onClick={goNext}>Continue</Button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="w-full max-w-xl">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-safecrib-green">
              Step 2 of 6
            </p>
            <h2 className="mt-3 text-3xl font-medium text-safecrib-black">Choose your display name</h2>
          </div>

          <div>
            <label htmlFor="displayName" className="mb-2 block text-sm font-medium text-safecrib-black">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={form.displayName}
              onChange={(event) => updateField("displayName", event.target.value)}
              placeholder="Sam Dee"
              className="w-full rounded-[8px] border border-black/15 bg-white px-4 py-3 text-base text-safecrib-black placeholder:text-black/35 focus:border-safecrib-green focus:outline-none"
            />
            {errors.displayName && <p className="mt-2 text-sm text-red-600">{errors.displayName}</p>}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button type="button" onClick={goBack} className="text-sm font-medium text-black/65 hover:text-safecrib-black">
              Back
            </button>
            <Button type="button" onClick={goNext}>Continue</Button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="w-full max-w-xl">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-safecrib-green">
              Step 3 of 6
            </p>
            <h2 className="mt-3 text-3xl font-medium text-safecrib-black">Create a password</h2>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-safecrib-black">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Enter a secure password"
              className="w-full rounded-[8px] border border-black/15 bg-white px-4 py-3 text-base text-safecrib-black placeholder:text-black/35 focus:border-safecrib-green focus:outline-none"
            />
            {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}

            <div className="mt-4 rounded-[8px] border border-black/10 bg-black/[0.02] p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-black/55">Password requirements</p>
              <ul className="space-y-2 text-sm text-black/70">
                {passwordChecks.map((rule) => (
                  <li key={rule.label} className="flex items-center gap-2">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${rule.passed ? "bg-safecrib-green" : "bg-black/20"}`} />
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button type="button" onClick={goBack} className="text-sm font-medium text-black/65 hover:text-safecrib-black">
              Back
            </button>
            <Button type="button" onClick={goNext}>Continue</Button>
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="w-full max-w-xl">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-safecrib-green">
              Step 4 of 6
            </p>
            <h2 className="mt-3 text-3xl font-medium text-safecrib-black">Confirm your password</h2>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-safecrib-black">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              placeholder="Repeat your password"
              className="w-full rounded-[8px] border border-black/15 bg-white px-4 py-3 text-base text-safecrib-black placeholder:text-black/35 focus:border-safecrib-green focus:outline-none"
            />
            {errors.confirmPassword && <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button type="button" onClick={goBack} className="text-sm font-medium text-black/65 hover:text-safecrib-black">
              Back
            </button>
            <Button type="button" onClick={goNext}>Continue</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-safecrib-green">
            Step 5 of 6
          </p>
          <h2 className="mt-3 text-3xl font-medium text-safecrib-black">Review your details</h2>
        </div>

        <div className="space-y-4 rounded-[12px] border border-black/10 bg-black/[0.02] p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-black/45">Email</p>
            <p className="mt-1 text-base text-safecrib-black">{form.email || "—"}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-black/45">Display name</p>
            <p className="mt-1 text-base text-safecrib-black">{form.displayName || "—"}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-sm text-black/65">
          <input id="terms" type="checkbox" defaultChecked className="h-4 w-4 rounded border-black/20 text-safecrib-green focus:ring-safecrib-green" />
          <label htmlFor="terms">I agree to the terms and privacy policy.</label>
        </div>

        {errors.submit && <p className="mt-4 text-sm text-red-600">{errors.submit}</p>}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button type="button" onClick={goBack} className="text-sm font-medium text-black/65 hover:text-safecrib-black">
            Back
          </button>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create my account"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(12,115,85,0.09),_transparent_30%),_linear-gradient(180deg,#ffffff_0%,#f6f7f3_100%)] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Link href="/login" className="ml-auto text-sm font-medium text-black/65 hover:text-safecrib-black">
            Log in
          </Link>
        </div>

        <div className="mx-auto max-w-xl overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_26px_70px_rgba(11,12,14,0.08)]">
          <section className="flex items-center justify-center px-5 py-5 sm:px-8 lg:px-12">
            <div className="w-full max-w-xl">
              <div className="mb-6 flex justify-center">
                <SafeCribLogo height={32} href={false} />
              </div>

              <div className="mb-6">
                <div className="mb-4 flex items-center justify-between text-[0.7rem] font-medium uppercase tracking-[0.18em] text-black/45">
                  <span>{currentStepLabel}</span>
                  <span>{Math.min(step + 1, stepLabels.length)}/{stepLabels.length}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full bg-safecrib-green transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {draftRestored && <div className="mt-3 flex items-center justify-between gap-3 rounded-[8px] border border-safecrib-green/20 bg-[#EAF7F1] px-3 py-2 text-xs text-safecrib-green"><span>Saved progress restored</span><button type="button" onClick={discardDraft} className="font-medium underline underline-offset-2">Discard</button></div>}
              </div>

              <form onSubmit={handleSubmit} className="w-full">
                {renderContent()}
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

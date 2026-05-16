"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LandingLogo } from "@/components/landing/LandingLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import {
  COMPANY_TYPE_OPTIONS,
  EMPTY_ONBOARDING,
  HIRING_CHALLENGE_OPTIONS,
  HIRING_VOLUME_OPTIONS,
  mergeStoredAuthUser,
  ONBOARDING_STEP_COUNT,
  OUTREACH_CHANNEL_OPTIONS,
  type OnboardingFormData,
} from "@/lib/onboarding";

function OnboardingHeader({ stepLabel }: { stepLabel: string | null }) {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#c2c6d8]/30 bg-[#f9f9ff]/70 px-4 backdrop-blur-xl md:px-16">
      <Link href="/" className="flex items-center">
        <LandingLogo priority className="h-10 w-auto md:h-12" />
      </Link>
      <div className="flex items-center gap-4">
        {stepLabel ? (
          <span className="text-xs font-semibold uppercase tracking-widest text-[#424656]">
            {stepLabel}
          </span>
        ) : null}
        <button
          type="button"
          aria-label="Help"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#424656] transition-colors hover:text-[#0050cb]"
        >
          <MaterialIcon name="help" />
        </button>
      </div>
    </header>
  );
}

function OnboardingFooter() {
  return (
    <footer className="mt-auto w-full border-t border-[#c2c6d8]/20 bg-[#f9f9ff] py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-16">
        <p className="text-xs text-[#424656]">
          © {new Date().getFullYear()} EJHunter. AI-Driven Recruiting Infrastructure.
        </p>
        <div className="flex gap-6 text-xs text-[#424656]">
          <a href="#" className="transition-colors hover:text-[#0050cb]">
            Privacy Policy
          </a>
          <a href="#" className="transition-colors hover:text-[#0050cb]">
            Terms of Service
          </a>
          <a href="#" className="transition-colors hover:text-[#0050cb]">
            Help Center
          </a>
        </div>
      </div>
    </footer>
  );
}

function ProgressBar({ stepIndex }: { stepIndex: number }) {
  if (stepIndex === 0) return null;
  const pct = Math.round((stepIndex / (ONBOARDING_STEP_COUNT - 1)) * 100);
  return (
    <div className="mb-8 flex w-full max-w-md flex-col items-center">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#424656]">
        Step {stepIndex + 1} of {ONBOARDING_STEP_COUNT}
      </div>
      <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-[#e1e8fd]">
        <div
          className="h-full rounded-full bg-[#0050cb] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function NavButtons({
  showBack,
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueDisabled,
  loading,
}: {
  showBack: boolean;
  onBack: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="mt-8 flex w-full max-w-3xl justify-between border-t border-[#c2c6d8]/30 pt-6">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-[#c2c6d8]/50 bg-white px-6 py-3 text-sm font-medium text-[#141b2b] transition-colors hover:bg-[#f1f3ff]"
        >
          <MaterialIcon name="arrow_back" className="text-sm" />
          Back
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onContinue}
        disabled={continueDisabled || loading}
        className="flex items-center gap-2 rounded-lg bg-[#0050cb] px-8 py-3 text-sm font-medium text-white shadow-[0_4px_14px_rgba(0,80,203,0.3)] transition-colors hover:bg-[#003fa4] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Saving…" : continueLabel}
        {!loading ? <MaterialIcon name="arrow_forward" className="text-sm" /> : null}
      </button>
    </div>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<OnboardingFormData>(EMPTY_ONBOARDING);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      router.replace("/login");
      return;
    }
    if (auth.role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }
    if (auth.onboardingCompleted) {
      router.replace("/dashboard");
      return;
    }
    setReady(true);
  }, [router]);

  const goNext = () => {
    setError("");
    setStepIndex((s) => Math.min(s + 1, ONBOARDING_STEP_COUNT - 1));
  };

  const goBack = () => {
    setError("");
    setStepIndex((s) => Math.max(s - 1, 0));
  };

  const validateStep = (): string | null => {
    if (stepIndex === 1 && !form.companyType) {
      return "Select your organization type to continue.";
    }
    if (stepIndex === 2 && form.hiringChallenges.length === 0) {
      return "Select at least one hiring challenge.";
    }
    if (stepIndex === 3 && form.outreachChannels.length === 0) {
      return "Select at least one outreach channel.";
    }
    if (stepIndex === 4 && !form.hiringVolume) {
      return "Select your monthly hiring volume.";
    }
    return null;
  };

  const handleContinue = async () => {
    if (stepIndex === 0) {
      goNext();
      return;
    }

    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (stepIndex < ONBOARDING_STEP_COUNT - 1) {
      goNext();
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const res = await fetch(`${apiBase}/api/users/me/onboarding`, {
        method: "PATCH",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          companyType: form.companyType,
          hiringChallenges: form.hiringChallenges,
          outreachChannels: form.outreachChannels,
          hiringVolume: form.hiringVolume,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Could not save onboarding"
        );
      }
      mergeStoredAuthUser({
        ...(data.user && typeof data.user === "object" ? data.user : {}),
        onboardingCompleted: true,
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const toggleMulti = (
    key: "hiringChallenges" | "outreachChannels",
    id: string
  ) => {
    setForm((prev) => {
      const list = prev[key];
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      return { ...prev, [key]: next };
    });
  };

  if (!ready) {
    return (
      <div className="onboarding-page flex min-h-screen items-center justify-center">
        <p className="text-sm text-[#424656]">Loading…</p>
      </div>
    );
  }

  const stepLabels = [
    null,
    "Company profile",
    "Hiring challenges",
    "Outreach channels",
    "Hiring volume",
  ];

  return (
    <div className="onboarding-page flex min-h-screen flex-col antialiased selection:bg-[#0050cb] selection:text-white">
      <OnboardingHeader stepLabel={stepLabels[stepIndex]} />
      <main className="relative flex flex-grow flex-col items-center overflow-hidden px-4 py-8 md:px-16 md:py-12">
        {stepIndex === 0 ? (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40">
              <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0050cb]/5 blur-[100px]" />
            </div>
            <div className="relative z-10 mx-auto flex max-w-[600px] flex-col items-center text-center">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0050cb] shadow-[0_0_40px_rgba(0,80,203,0.2)]">
                <MaterialIcon name="target" className="text-[40px] text-white" filled />
              </div>
              <h1 className="mb-4 text-4xl font-bold tracking-tight text-[#141b2b] md:text-5xl">
                Welcome to EJHunter
              </h1>
              <p className="mb-8 max-w-[480px] text-lg leading-relaxed text-[#424656]">
                AI recruiting workflows built for modern hiring teams. Streamline sourcing,
                automate engagement, and close top talent faster.
              </p>
              <button
                type="button"
                onClick={handleContinue}
                className="mt-4 flex items-center gap-2 rounded-full bg-[#0050cb] px-10 py-4 text-sm font-medium text-white shadow-[0_4px_12px_rgba(0,80,203,0.15)] transition-colors hover:bg-[#003fa4]"
              >
                Continue
                <MaterialIcon name="arrow_forward" className="text-[18px]" />
              </button>
              <div className="mt-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#424656]/60">
                <MaterialIcon name="lock" className="text-[14px]" />
                Enterprise-grade security
              </div>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex w-full max-w-4xl flex-col items-center">
            <ProgressBar stepIndex={stepIndex} />

            {stepIndex === 1 ? (
              <>
                <div className="mb-8 text-center">
                  <h1 className="mb-2 text-2xl font-semibold text-[#141b2b] md:text-3xl">
                    Who do you hire for?
                  </h1>
                  <p className="text-[#424656]">
                    Select the option that best describes your organization type.
                  </p>
                </div>
                <div className="grid w-full max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
                  {COMPANY_TYPE_OPTIONS.map((opt) => {
                    const selected = form.companyType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, companyType: opt.id }))}
                        className={`onboarding-glow-shadow flex h-full items-center gap-4 rounded-xl border p-4 text-left transition-all hover:border-[#0050cb]/40 ${
                          selected
                            ? "onboarding-option-selected"
                            : "border-[#c2c6d8]/50 bg-white"
                        }`}
                      >
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            selected
                              ? "bg-[#0050cb] text-white"
                              : "bg-[#e1e8fd] text-[#0050cb]"
                          }`}
                        >
                          <MaterialIcon name={opt.icon} className="text-2xl" />
                        </div>
                        <h3 className="text-base font-semibold">{opt.label}</h3>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {stepIndex === 2 ? (
              <div className="onboarding-glass-panel w-full max-w-3xl rounded-xl border border-[#c2c6d8]/30 p-6 shadow-[0_8px_32px_rgba(66,70,86,0.05)] md:p-8">
                <div className="mb-8 text-center">
                  <h1 className="mb-2 text-2xl font-semibold text-[#141b2b] md:text-3xl">
                    What slows down your hiring most?
                  </h1>
                  <p className="text-[#424656]">Select all that apply to help us tailor your experience.</p>
                </div>
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {HIRING_CHALLENGE_OPTIONS.map((opt) => {
                    const selected = form.hiringChallenges.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleMulti("hiringChallenges", opt.id)}
                        className={`relative flex flex-col items-start rounded-lg border p-4 text-left transition-all ${
                          selected
                            ? "onboarding-option-selected border-2 shadow-[0_0_15px_rgba(0,80,203,0.1)]"
                            : "border-[#c2c6d8] bg-[#f9f9ff] hover:border-[#0050cb]"
                        }`}
                      >
                        {selected ? (
                          <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#0050cb]">
                            <MaterialIcon name="check" className="text-sm text-white" />
                          </div>
                        ) : null}
                        <MaterialIcon
                          name={opt.icon}
                          className={`mb-2 ${selected ? "text-[#0050cb]" : "text-[#505f76]"}`}
                        />
                        <h3
                          className={`mb-1 text-sm font-medium ${selected ? "font-bold text-[#0050cb]" : ""}`}
                        >
                          {opt.label}
                        </h3>
                        <p className="text-xs text-[#424656]">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {stepIndex === 3 ? (
              <>
                <div className="mb-8 max-w-2xl text-center">
                  <h1 className="mb-2 text-2xl font-semibold text-[#141b2b] md:text-3xl">
                    Where do candidates respond most?
                  </h1>
                  <p className="text-[#424656]">
                    Select the primary channels you use. We&apos;ll tailor your dashboard to these
                    workflows.
                  </p>
                </div>
                <div className="mb-6 grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {OUTREACH_CHANNEL_OPTIONS.map((opt) => {
                    const selected = form.outreachChannels.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleMulti("outreachChannels", opt.id)}
                        className={`relative flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                          selected
                            ? "onboarding-option-selected border-2"
                            : "border-[#c2c6d8] bg-[#f9f9ff] hover:border-[#0050cb] hover:bg-[#f1f3ff]"
                        }`}
                      >
                        {selected ? (
                          <MaterialIcon
                            name="check_circle"
                            className="absolute right-4 top-4 text-[24px] text-[#0050cb]"
                            filled
                          />
                        ) : null}
                        <div
                          className={`mb-1 flex h-12 w-12 items-center justify-center rounded-full ${
                            selected ? "bg-[#0066ff] text-white" : "bg-[#dce2f7] text-[#424656]"
                          }`}
                        >
                          <MaterialIcon name={opt.icon} className="text-[24px]" />
                        </div>
                        <div>
                          <h3 className="mb-1 text-base font-semibold">{opt.label}</h3>
                          <p className="text-sm text-[#424656]">{opt.description}</p>
                        </div>
                        {"hint" in opt && opt.hint && selected ? (
                          <div className="mt-auto flex items-start gap-2 border-t border-[#0050cb]/20 pt-3 text-[#0050cb]">
                            <MaterialIcon name="lightbulb" className="mt-0.5 text-[16px]" />
                            <span className="text-xs leading-tight">{opt.hint}</span>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {stepIndex === 4 ? (
              <>
                <div className="mb-4 w-full max-w-3xl text-center">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#0050cb]">
                    Infrastructure calibration
                  </p>
                  <h1 className="mb-3 text-3xl font-bold text-[#141b2b] md:text-5xl">
                    How many roles do you hire monthly?
                  </h1>
                  <p className="text-lg text-[#424656]">
                    We use this to provision workspace limits and optimize your sourcing algorithms.
                  </p>
                </div>
                <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
                  {HIRING_VOLUME_OPTIONS.map((opt) => {
                    const selected = form.hiringVolume === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, hiringVolume: opt.id }))}
                        className={`relative flex flex-col items-start rounded-xl border p-6 text-left transition-all ${
                          selected
                            ? "onboarding-option-selected border-2 shadow-[0_8px_24px_rgba(80,95,118,0.15)]"
                            : "border-[#c2c6d8] bg-white hover:border-[#0050cb]/50 hover:bg-[#f1f3ff]"
                        }`}
                      >
                        {selected ? (
                          <div className="absolute right-6 top-6 flex h-6 w-6 items-center justify-center rounded-full bg-[#0050cb]">
                            <MaterialIcon name="check" className="text-base text-white" filled />
                          </div>
                        ) : null}
                        <div
                          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg border ${
                            selected
                              ? "border-[#0050cb]/20 bg-[#dae1ff]"
                              : "border-[#c2c6d8]/30 bg-[#f9f9ff]"
                          }`}
                        >
                          <MaterialIcon
                            name={opt.icon}
                            className={selected ? "text-[#0050cb]" : "text-[#505f76]"}
                            filled={selected}
                          />
                        </div>
                        <span className="mb-1 text-base font-semibold">{opt.label}</span>
                        <span className="text-sm text-[#424656]">{opt.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {error ? (
              <p className="mt-4 w-full max-w-3xl text-center text-sm text-red-600">{error}</p>
            ) : null}

            <NavButtons
              showBack={stepIndex > 0}
              onBack={goBack}
              onContinue={() => void handleContinue()}
              continueLabel={stepIndex === 4 ? "Finish setup" : "Continue"}
              continueDisabled={loading}
              loading={loading}
            />
          </div>
        )}
      </main>
      <OnboardingFooter />
    </div>
  );
}

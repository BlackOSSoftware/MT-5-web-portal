"use client";


import { Toast } from "@/app/components/ui/Toast";
import {
  User,
  Mail,
  Lock,
  Gift,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useCountries } from "@/hooks/useCountries";
import { Country } from "@/types/country";
import { PremiumInput } from "../components/ui/TextInput";
import { CountrySelect } from "../components/ui/CountrySelect";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignup } from "@/hooks/useAuth";
import BackButton from "../components/ui/BackButton";

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupPageFallback />}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signup = useSignup();
  const { data: countries } = useCountries();
  const referralFromQuery = (searchParams.get("ref") || "").trim();

  const defaultCountry = useMemo(
    () => countries?.[0] ?? null,
    [countries]
  );
  const countriesReady = !!defaultCountry;

  const [country, setCountry] = useState<Country | null>(null);
  const [step, setStep] = useState<"signup" | "verify">("signup");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    referral: referralFromQuery,
  });

  const update = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const showToast = (msg: string, type: "success" | "error" = "error") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 6500);
  };

  const isPasswordValid = (password: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/.test(password);

  const handleSignup = () => {
    const selectedCountry = country ?? defaultCountry;
    if (!selectedCountry) return;

    if (!isPasswordValid(form.password)) {
      showToast(
        "Password must be 8-16 chars with uppercase, lowercase, number & special character"
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      showToast("Passwords do not match");
      return;
    }

    signup.mutate(
      {
        name: form.fullname.trim(),
        email: form.email.toLowerCase().trim(),
        phone: `${selectedCountry.dialCode}${form.phone}`,
        password: form.password,
        confirmPassword: form.confirmPassword,
        referral_code: form.referral || undefined,
      },
      {
        onSuccess: () => {
          showToast("Verification email sent. Please check your email.", "success");
          setStep("verify");
        },
        onError: (err: unknown) => {
          const error = err as {
            response?: { data?: { message?: string; error?: string } };
            message?: string;
          };
          const backendMessage =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message;

          showToast(backendMessage || "Signup failed");
        },

      }
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-main)] px-4 py-8">
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[var(--primary)] opacity-20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500 opacity-20 blur-3xl" />

      <div className="relative m-auto w-full max-w-xl rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-card)] backdrop-blur-xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
      <BackButton to="/"/>
        <div className="space-y-2 text-center">
          <img
            src="/oceanaprofx-logo.png?v=oceanaprofx-20261104"
            alt="Oceanaprofx"
            className="mx-auto h-10 w-auto max-w-[220px] object-contain sm:h-12 sm:max-w-[240px]"
          />
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Create account
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Start your journey with Oceanaprofx
          </p>
        </div>

        {step === "signup" && (
          <>
            <div className="space-y-4">
            <PremiumInput
              label="Full name"
              value={form.fullname}
              onChange={(v) => update("fullname", v)}
              icon={User}
              required
            />

            <PremiumInput
              label="Email address"
              type="email"
              value={form.email}
              onChange={(v) => update("email", v)}
              icon={Mail}
              required
            />

            <div className="flex gap-2">
              {defaultCountry ? (
                <CountrySelect
                  value={country ?? defaultCountry}
                  onChange={setCountry}
                />
              ) : (
                <div
                  className="
                    flex w-24 items-center rounded-lg border border-[var(--border-glass)] sm:w-28
                    bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-muted)]
                  "
                >
                  +--
                </div>
              )}

              <input
                type="tel"
                maxLength={10}
                value={form.phone}
                onChange={(e) =>
                  update("phone", e.target.value.replace(/\D/g, ""))
                }
                required
                placeholder="10 digit number"
                className="
                  min-w-0 flex-1 rounded-lg border border-[var(--border-glass)]
                  bg-[var(--bg-card)] px-3 text-sm outline-none
                  focus:border-[var(--primary)]
                  focus:ring-1 focus:ring-[var(--primary)]
                "
              />
            </div>

            <PremiumInput
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => update("password", v)}
              icon={Lock}
              required
            />

            <PremiumInput
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={(v) => update("confirmPassword", v)}
              icon={Lock}
              required
            />

            <PremiumInput
              label="Referral code (optional)"
              value={form.referral}
              onChange={(v) => update("referral", v)}
              icon={Gift}
            />

            </div>

            <button
              onClick={handleSignup}
              disabled={signup.isPending || !countriesReady}
              className="
                w-full rounded-lg py-3 font-medium text-white
                bg-[var(--primary)]
                hover:shadow-[0_0_30px_var(--primary-glow)]
                transition disabled:opacity-70 disabled:cursor-not-allowed
              "
            >
              {signup.isPending
                ? "Sending Mail..."
                : countriesReady
                ? "Create account"
                : "Loading..."}
            </button>
          </>
        )}

        {step === "verify" && (
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold">
              Verify your email
            </h3>

            <p className="text-sm text-[var(--text-muted)]">
              A verification link has been sent to
            </p>

            <p className="text-sm font-medium">
              {form.email}
            </p>

            <p className="text-xs text-[var(--text-muted)]">
              Please check your inbox and click the link to activate your account.
            </p>

            <button
              onClick={() => router.push("/login")}
              className="
                w-full rounded-lg py-3 font-medium text-white
                bg-[var(--primary)]
                hover:shadow-[0_0_30px_var(--primary-glow)]
                transition
              "
            >
              Go to Login
            </button>
          </div>
        )}

        <p className="text-center text-sm text-[var(--text-muted)]">
          Already have an account?{" "}
          <span
            className="text-[var(--primary)] cursor-pointer hover:underline"
            onClick={() => router.push("/login")}
          >
            Login
          </span>
        </p>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function SignupPageFallback() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[var(--primary)] opacity-20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500 opacity-20 blur-3xl" />
      <div className="relative m-auto w-full max-w-lg rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-card)] backdrop-blur-xl shadow-2xl p-4 sm:p-6 space-y-4">
        <div className="h-8 w-44 rounded bg-white/10" />
        <div className="h-4 w-56 rounded bg-white/10" />
        <div className="h-11 w-full rounded-lg bg-white/10" />
        <div className="h-11 w-full rounded-lg bg-white/10" />
        <div className="h-11 w-full rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

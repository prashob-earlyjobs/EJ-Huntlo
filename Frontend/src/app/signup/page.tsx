"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import { postAuthPath } from "@/lib/onboarding";

type SignupField = "fullName" | "companyName" | "email" | "mobile" | "password" | "confirmPassword";
type SignupFieldErrors = Partial<Record<SignupField, string>>;
const lettersAndSpacesOnlyPattern = /^[A-Za-z\s]*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const indianMobilePattern = /^[6-9]\d{9}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) {
      router.replace(postAuthPath(auth));
    }
  }, [router]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    if (field === "password" || field === "confirmPassword") {
      value = value.replace(/\s/g, "");
    }

    if (field === "mobile") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, mobile: digitsOnly }));
      setFieldErrors((prev) => {
        if (!prev.mobile) return prev;
        const next = { ...prev };
        delete next.mobile;
        return next;
      });
      return;
    }

    if ((field === "fullName" || field === "companyName") && !lettersAndSpacesOnlyPattern.test(value)) {
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const inputClassName = (field: SignupField) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-slate-900 outline-none transition focus:ring-4 ${
      fieldErrors[field]
        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
        : "border-slate-300/90 focus:border-blue-500 focus:ring-blue-200/60"
    }`;

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const nextFieldErrors: SignupFieldErrors = {};
    if (!formData.fullName.trim()) nextFieldErrors.fullName = "Full name is required";
    else if (formData.fullName.trim().length < 3) {
      nextFieldErrors.fullName = "Full name must be at least 3 characters";
    }
    if (!formData.companyName.trim()) nextFieldErrors.companyName = "Company name is required";
    else if (formData.companyName.trim().length < 3) {
      nextFieldErrors.companyName = "Company name must be at least 3 characters";
    }
    if (!formData.email.trim()) nextFieldErrors.email = "Email is required";
    else if (!emailPattern.test(formData.email.trim())) {
      nextFieldErrors.email = "Please enter a valid email address";
    }
    if (!formData.mobile.trim()) nextFieldErrors.mobile = "Mobile number is required";
    else if (formData.mobile.trim().length !== 10) {
      nextFieldErrors.mobile = "Mobile number must be exactly 10 digits";
    } else if (!indianMobilePattern.test(formData.mobile.trim())) {
      nextFieldErrors.mobile = "Please enter a valid mobile number";
    }
    if (!formData.password) nextFieldErrors.password = "Password is required";
    else if (!passwordPattern.test(formData.password)) {
      nextFieldErrors.password =
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";
    }
    if (!formData.confirmPassword) {
      nextFieldErrors.confirmPassword = "Confirm password is required";
    } else if (formData.password && formData.password !== formData.confirmPassword) {
      nextFieldErrors.confirmPassword = "Password and confirm password must match";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const response = await fetch(`${apiBase}/api/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to create account");
      }

      if (data.token && data.user) {
        localStorage.setItem(
          "authUser",
          JSON.stringify({ ...data.user, token: data.token })
        );
        setSuccessMessage("Account created. Redirecting...");
        setTimeout(() => {
          router.push(
            postAuthPath({
              role: data.user.role === "admin" ? "admin" : "user",
              onboardingCompleted: Boolean(data.user.onboardingCompleted),
              accountRole:
                data.user.accountRole === "owner" || data.user.accountRole === "member"
                  ? data.user.accountRole
                  : null,
            })
          );
        }, 600);
      } else {
        setSuccessMessage("Account created successfully. Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 1000);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="premium-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="premium-card w-full max-w-md rounded-3xl p-8 sm:p-9">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-700">Join EJHunter</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Create your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Build your hiring workspace in under a minute.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSignup} noValidate>
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(event) => handleChange("fullName", event.target.value)}
              inputMode="text"
              pattern="[A-Za-z\s]*"
              className={inputClassName("fullName")}
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
            />
            {fieldErrors.fullName ? (
              <p id="fullName-error" className="mt-1.5 text-xs font-medium text-red-600">
                {fieldErrors.fullName}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="companyName"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Company name
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Your company"
              value={formData.companyName}
              onChange={(event) =>
                handleChange("companyName", event.target.value)
              }
              inputMode="text"
              pattern="[A-Za-z\s]*"
              className={inputClassName("companyName")}
              aria-invalid={Boolean(fieldErrors.companyName)}
              aria-describedby={fieldErrors.companyName ? "companyName-error" : undefined}
            />
            {fieldErrors.companyName ? (
              <p id="companyName-error" className="mt-1.5 text-xs font-medium text-red-600">
                {fieldErrors.companyName}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(event) => handleChange("email", event.target.value)}
              className={inputClassName("email")}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email ? (
              <p id="email-error" className="mt-1.5 text-xs font-medium text-red-600">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="mobile"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Mobile number
            </label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.mobile}
              onChange={(event) => handleChange("mobile", event.target.value)}
              inputMode="numeric"
              maxLength={10}
              pattern="[0-9]{10}"
              className={inputClassName("mobile")}
              aria-invalid={Boolean(fieldErrors.mobile)}
              aria-describedby={fieldErrors.mobile ? "mobile-error" : undefined}
            />
            {fieldErrors.mobile ? (
              <p id="mobile-error" className="mt-1.5 text-xs font-medium text-red-600">
                {fieldErrors.mobile}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                onChange={(event) => handleChange("password", event.target.value)}
                className={`${inputClassName("password")} pr-12`}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-slate-500 transition hover:text-slate-800 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <MaterialIcon
                  name={showPassword ? "visibility_off" : "visibility"}
                  className="text-[17px]"
                />
              </button>
            </div>
            {fieldErrors.password ? (
              <p id="password-error" className="mt-1.5 text-xs font-medium text-red-600">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(event) =>
                  handleChange("confirmPassword", event.target.value)
                }
                className={`${inputClassName("confirmPassword")} pr-12`}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={
                  fieldErrors.confirmPassword ? "confirmPassword-error" : undefined
                }
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-slate-500 transition hover:text-slate-800 focus:outline-none"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                <MaterialIcon
                  name={showConfirmPassword ? "visibility_off" : "visibility"}
                  className="text-[17px]"
                />
              </button>
            </div>
            {fieldErrors.confirmPassword ? (
              <p id="confirmPassword-error" className="mt-1.5 text-xs font-medium text-red-600">
                {fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full cursor-pointer rounded-xl bg-linear-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-4 focus:ring-blue-200/60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-black hover:underline"
          >
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}

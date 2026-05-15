"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { getStoredAuth } from "@/lib/auth";

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
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) {
      router.replace(auth.role === "admin" ? "/admin/dashboard" : "/dashboard");
    }
  }, [router]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Password and confirm password must match");
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
          router.push("/dashboard");
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

        <form className="space-y-5" onSubmit={handleSignup}>
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
              className="w-full rounded-xl border border-slate-300/90 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-200/60"
              required
            />
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
              className="w-full rounded-xl border border-slate-300/90 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-200/60"
              required
            />
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
              className="w-full rounded-xl border border-slate-300/90 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-200/60"
              required
            />
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
              className="w-full rounded-xl border border-slate-300/90 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-200/60"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={(event) => handleChange("password", event.target.value)}
              className="w-full rounded-xl border border-slate-300/90 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-200/60"
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(event) =>
                handleChange("confirmPassword", event.target.value)
              }
              className="w-full rounded-xl border border-slate-300/90 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-200/60"
              required
            />
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
            className="w-full rounded-xl bg-linear-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-4 focus:ring-blue-200/60"
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

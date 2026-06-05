"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { BlockedAccountModal } from "@/components/dashboard/BlockedAccountModal";
import { getStoredAuth } from "@/lib/auth";
import { resolveAuthRedirect } from "@/lib/claimPublicSearch";
import { isBlockedAccountResponse, isBlockedMemberStatus } from "@/lib/sessionLogout";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [blockedOpen, setBlockedOpen] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth && isBlockedMemberStatus(auth.memberStatus)) {
      setBlockedOpen(true);
      return;
    }
    if (auth) {
      void resolveAuthRedirect(auth, auth.token).then((path) => router.replace(path));
    }
  }, [router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

      const response = await fetch(`${apiBase}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (isBlockedAccountResponse(response, data)) {
        setBlockedOpen(true);
        setErrorMessage("");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Unable to login"
        );
      }

      localStorage.setItem(
        "authUser",
        JSON.stringify({ ...data.user, token: data.token })
      );
      const redirectPath = await resolveAuthRedirect(
        {
          role: data.user.role === "admin" ? "admin" : "user",
          onboardingCompleted: Boolean(data.user.onboardingCompleted),
          accountRole:
            data.user.accountRole === "owner" || data.user.accountRole === "member"
              ? data.user.accountRole
              : null,
        },
        data.token
      );
      router.push(redirectPath);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <BlockedAccountModal open={blockedOpen} />
      <main className="premium-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="premium-card w-full max-w-md rounded-3xl p-8 sm:p-9">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-700">Welcome back</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Login to your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Continue with your workspace credentials.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300/90 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-200/60"
              required
            />
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-linear-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-4 focus:ring-blue-200/60"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Do not have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-black hover:underline"
          >
            Create one
          </Link>
        </p>
      </section>
    </main>
    </>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="premium-shell relative isolate min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[92vh] w-full max-w-6xl flex-col justify-between">
        <header className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/75 px-5 py-3 backdrop-blur md:px-6">
          <div>
            <p className="text-sm font-semibold tracking-wide text-blue-700">EJHunter</p>
            <p className="text-xs text-slate-600">Talent Intelligence Platform</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/signup"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Login
            </Link>
          </div>
        </header>

        <section className="grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Premium hiring workflow
            </p>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Build high-performing teams with a refined recruiting experience.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Source, evaluate, and manage top candidates in one professional workspace
              designed for modern hiring teams.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-linear-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-cyan-600"
              >
                Create workspace
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Access account
              </Link>
            </div>
          </div>

          <div className="premium-card rounded-3xl p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Live pipeline snapshot
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: "Open roles", value: "24" },
                { label: "Candidates", value: "318" },
                { label: "Placements", value: "46" },
              ].map((metric) => (
                <article key={metric.label} className="rounded-xl bg-slate-900 px-3 py-4 text-white">
                  <p className="text-2xl font-semibold">{metric.value}</p>
                  <p className="mt-1 text-xs text-slate-300">{metric.label}</p>
                </article>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {[
                "AI-powered candidate discovery",
                "Credit and team management controls",
                "Professional workflows for hiring teams",
              ].map((item) => (
                <p key={item} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  {item}
                </p>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

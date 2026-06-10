import Link from "next/link";

import { listSolutionPages } from "@/lib/solutionPages";

export function SolutionsIndexContent() {
  const pages = listSolutionPages();

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {pages.map((page) => (
        <Link
          key={page.id}
          href={page.href}
          className="group rounded-2xl border border-[#c3c6d6]/40 bg-white p-6 shadow-sm transition-all hover:border-[#0050cb]/35 hover:shadow-md"
        >
          <h2 className="text-lg font-bold text-[#141b2b] transition-colors group-hover:text-[#0050cb]">
            {page.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#434654]">{page.description}</p>
          <span className="mt-4 inline-block text-sm font-semibold text-[#0050cb]">
            Learn more →
          </span>
        </Link>
      ))}
    </div>
  );
}

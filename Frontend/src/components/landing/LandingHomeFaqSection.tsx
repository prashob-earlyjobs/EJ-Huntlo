import Link from "next/link";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { HOMEPAGE_FAQS } from "@/lib/homepageFaqs";

export function LandingHomeFaqSection() {
  return (
    <section className="bg-[#faf9ff] px-4 py-20 md:px-8 lg:px-12" id="faq">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            Agentic AI Recruiting — Frequently Asked Questions
          </h2>
          <p className="mt-3 text-[#434654]">
            Everything hiring teams ask about autonomous sourcing, outreach, and screening.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {HOMEPAGE_FAQS.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-[#c3c6d6]/30 bg-white p-5 shadow-sm open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold text-[#141b2b] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start gap-2">
                  <MaterialIcon
                    name="quiz"
                    className="mt-0.5 shrink-0 text-[18px] text-[#0050cb]"
                  />
                  {item.question}
                </span>
                <MaterialIcon
                  name="expand_more"
                  className="shrink-0 text-[22px] text-[#434654] transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#434654]">{item.answer}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[#434654]">
          Have more questions?{" "}
          <Link href="/faqs" className="font-semibold text-[#0050cb] hover:underline">
            Browse the full FAQ
          </Link>{" "}
          or{" "}
          <Link href="/compare/juicebox" className="font-semibold text-[#0050cb] hover:underline">
            see how Huntlo compares
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

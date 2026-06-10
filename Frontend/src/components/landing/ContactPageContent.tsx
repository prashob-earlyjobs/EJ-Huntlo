import Link from "next/link";

import { BookDemoLink } from "@/components/landing/BookDemoLink";

export function ContactPageContent() {
  return (
    <div className="mt-8 space-y-10">
      <div className="rounded-2xl border border-[#c3c6d6]/40 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#141b2b]">General inquiries</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#434654]">
          Sales, partnerships, billing, and product questions.
        </p>
        <a
          href="mailto:info@huntlo.ai"
          className="mt-4 inline-block text-sm font-semibold text-[#0050cb] hover:underline"
        >
          info@huntlo.ai
        </a>
      </div>

      <section className="landing-legal-section landing-legal-body">
        <h2>Book a demo</h2>
        <p>
          Want a walkthrough of sourcing, outreach, screening, and hiring workflows? Schedule time
          with our team to see Huntlo in action.
        </p>
        <div className="mt-4">
          <BookDemoLink className="inline-flex rounded-full bg-[#0050cb] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0050cb]/20 transition-colors hover:bg-[#003fa4]">
            Schedule a demo
          </BookDemoLink>
        </div>
      </section>

      <section className="landing-legal-section landing-legal-body">
        <h2>Help &amp; support</h2>
        <p>
          For quick answers on setup, integrations, pricing, and product features, visit our{" "}
          <Link href="/faqs" className="text-[#0050cb] hover:underline">
            FAQs
          </Link>{" "}
          or browse{" "}
          <Link href="/docs" className="text-[#0050cb] hover:underline">
            documentation
          </Link>
          . Existing customers can reach us at{" "}
          <a href="mailto:info@huntlo.ai" className="text-[#0050cb] hover:underline">
            info@huntlo.ai
          </a>{" "}
          from their work email for account-specific help.
        </p>
        <p className="text-sm text-[#434654]/90">
          We typically respond to inquiries within one business day.
        </p>
      </section>
    </div>
  );
}

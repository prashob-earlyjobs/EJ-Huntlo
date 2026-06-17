import { SITE_URL } from "@/lib/siteMetadata";

export type FaqSchemaItem = {
  question: string;
  answer: string;
};

export type BreadcrumbSchemaItem = {
  name: string;
  href?: string;
};

export function homeOrganizationSoftwareGraphJsonLd() {
  const homeUrl = "https://huntlo.ai";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${homeUrl}/#organization`,
        name: "Huntlo AI",
        alternateName: "Huntlo",
        url: homeUrl,
        logo: {
          "@type": "ImageObject",
          url: `${homeUrl}/huntlologo.png`,
        },
        description:
          "Huntlo AI is an Agentic AI Hiring OS that automates sourcing, outreach, screening, engagement and recruiting execution for enterprise talent acquisition teams.",
        founder: {
          "@type": "Person",
          name: "Saurav Kumar",
        },
        parentOrganization: {
          "@type": "Organization",
          name: "EarlyJobs AI",
          url: "https://www.earlyjobs.ai",
        },
        sameAs: ["https://www.linkedin.com/company/earlyjobs"],
        knowsAbout: [
          "Agentic AI",
          "AI Recruiting",
          "Talent Acquisition",
          "Talent Intelligence",
          "Recruitment Automation",
          "Candidate Sourcing",
          "Talent Mapping",
          "Hiring Automation",
          "Recruitment CRM",
          "Executive Search",
          "Workforce Planning",
          "HR Technology",
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${homeUrl}/#software`,
        name: "Huntlo AI",
        url: homeUrl,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Recruitment Software",
        operatingSystem: "Web",
        creator: {
          "@id": `${homeUrl}/#organization`,
        },
        description:
          "Agentic AI Hiring OS that automates recruiting execution, talent sourcing, outreach, engagement, screening and hiring workflows.",
        featureList: [
          "AI Candidate Sourcing",
          "Intent-Based Talent Discovery",
          "AI Recruiter Agent",
          "Automated Candidate Outreach",
          "Talent Intelligence",
          "Recruitment CRM",
          "Candidate Engagement",
          "ATS Integration",
          "Talent Pipeline Management",
          "Recruitment Analytics",
        ],
      },
    ],
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Huntlo",
    url: SITE_URL,
    logo: `${SITE_URL}/huntlologo.png`,
    description:
      "Huntlo is agentic AI recruiting infrastructure that autonomously sources candidates, runs multi-channel outreach, conducts AI voice screening, and schedules interviews for modern hiring teams.",
    sameAs: ["https://www.linkedin.com/company/huntlo"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      url: "https://calendly.com/huntlo-info/15min",
    },
    parentOrganization: {
      "@type": "Organization",
      name: "EarlyJobs",
    },
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Huntlo",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Recruiting Infrastructure",
    operatingSystem: "Web",
    description:
      "Agentic AI recruiting infrastructure for autonomous candidate sourcing, outreach, screening, and interview scheduling.",
    url: SITE_URL,
    offers: [
      {
        "@type": "Offer",
        name: "Trial",
        price: "0",
        priceCurrency: "USD",
        description:
          "7-day free trial — 3 active roles, 30 candidate searches, AI sourcing workflows",
      },
      {
        "@type": "Offer",
        name: "Starter",
        price: "99",
        priceCurrency: "USD",
        billingIncrement: "Monthly",
      },
    ],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Huntlo",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/faqs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function faqPageJsonLd(items: FaqSchemaItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(items: BreadcrumbSchemaItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: item.href.startsWith("http") ? item.href : `${SITE_URL}${item.href}` } : {}),
    })),
  };
}

export function flattenFaqSectionsForSchema(
  sections: { items: { question: string; answer: string; bullets?: string[] }[] }[]
): FaqSchemaItem[] {
  return sections.flatMap((section) =>
    section.items.map((item) => ({
      question: item.question,
      answer: item.bullets?.length
        ? `${item.answer} ${item.bullets.join(". ")}.`
        : item.answer,
    }))
  );
}

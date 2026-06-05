export type ComparisonRow = {
  feature: string;
  huntlo: string;
  competitor: string;
  huntloAdvantage?: boolean;
};

export type CompetitorComparison = {
  slug: string;
  name: string;
  shortName: string;
  summary: string;
  positioning: string;
  rows: ComparisonRow[];
  huntloHighlights: string[];
};

export const COMPETITOR_COMPARISONS: CompetitorComparison[] = [
  {
    slug: "linkedin-recruiter",
    name: "LinkedIn Recruiter",
    shortName: "LinkedIn",
    summary:
      "LinkedIn Recruiter is the incumbent network for professional profiles. Huntlo is built for outbound execution — AI search, multi-channel outreach, and campaigns in one hiring OS.",
    positioning:
      "Choose LinkedIn Recruiter when your team lives inside LinkedIn InMail. Choose Huntlo when you need AI sourcing plus email, WhatsApp, and sequence automation beyond a single network.",
    rows: [
      {
        feature: "Primary focus",
        huntlo: "Outbound hiring OS — source, unlock, outreach",
        competitor: "Professional network + InMail seats",
      },
      {
        feature: "AI candidate search",
        huntlo: "Natural-language search across skills, role, location",
        competitor: "Boolean + LinkedIn filters",
        huntloAdvantage: true,
      },
      {
        feature: "Email outreach",
        huntlo: "Built-in sequences & campaigns",
        competitor: "Limited; mostly InMail",
        huntloAdvantage: true,
      },
      {
        feature: "WhatsApp outreach",
        huntlo: "Native WhatsApp campaigns",
        competitor: "Not a core workflow",
        huntloAdvantage: true,
      },
      {
        feature: "Contact reveal",
        huntlo: "Email & phone unlock with credits",
        competitor: "InMail credits; limited direct contact",
        huntloAdvantage: true,
      },
      {
        feature: "Network reach",
        huntlo: "Talent intelligence beyond one portal",
        competitor: "Deep LinkedIn member graph",
      },
      {
        feature: "Pricing model",
        huntlo: "Plan-based searches & outreach credits",
        competitor: "Per-seat Recruiter licenses",
      },
    ],
    huntloHighlights: [
      "Run Gmail and WhatsApp campaigns without leaving the platform",
      "Describe hires in plain English instead of building Boolean strings",
      "Preview candidates on the website before signup",
    ],
  },
  {
    slug: "hireez",
    name: "HireEZ",
    shortName: "HireEZ",
    summary:
      "HireEZ (formerly Hiretual) pioneered AI sourcing for agencies. Huntlo extends that model with a full outbound stack — search, People Scout, campaigns, and reply tracking in one product.",
    positioning:
      "HireEZ excels at sourcing automation for high-volume agency workflows. Huntlo targets teams that want sourcing and multi-channel outreach unified for staffing firms and in-house TA alike.",
    rows: [
      {
        feature: "AI sourcing",
        huntlo: "Prompt-based sessions with saved history",
        competitor: "AI-assisted talent search & rediscovery",
      },
      {
        feature: "Outbound campaigns",
        huntlo: "Email + WhatsApp sequences with editor",
        competitor: "Email automation; varies by plan",
        huntloAdvantage: true,
      },
      {
        feature: "People lookup",
        huntlo: "People Scout by LinkedIn URL",
        competitor: "Profile-centric sourcing",
      },
      {
        feature: "Hiring OS scope",
        huntlo: "Source → pool → campaign → analytics",
        competitor: "Sourcing-first with CRM add-ons",
        huntloAdvantage: true,
      },
      {
        feature: "Public try-before-buy",
        huntlo: "Landing search preview → claim after signup",
        competitor: "Demo-led enterprise sales",
        huntloAdvantage: true,
      },
      {
        feature: "Integrations",
        huntlo: "ATS & workflow connectors",
        competitor: "Broad ATS integrations",
      },
      {
        feature: "Best for",
        huntlo: "Outbound recruiting teams & staffing firms",
        competitor: "Agency sourcers at scale",
      },
    ],
    huntloHighlights: [
      "One workspace for session results, saved candidates, and campaigns",
      "WhatsApp-native outreach for high-response markets",
      "Transparent credit-based unlocks and outreach metering",
    ],
  },
  {
    slug: "seekout",
    name: "SeekOut",
    shortName: "SeekOut",
    summary:
      "SeekOut is known for diversity analytics and deep talent search. Huntlo focuses on recruiter velocity — faster searches, contact reveal, and outbound execution without enterprise complexity.",
    positioning:
      "SeekOut shines for diversity insights and large enterprise talent intelligence. Huntlo is for teams that need to move from search to conversation quickly.",
    rows: [
      {
        feature: "Search experience",
        huntlo: "Conversational AI search with instant preview",
        competitor: "Power filters & diversity insights",
        huntloAdvantage: true,
      },
      {
        feature: "Diversity analytics",
        huntlo: "Match scoring & AI recommendations",
        competitor: "Deep diversity search & reporting",
      },
      {
        feature: "Outreach execution",
        huntlo: "Campaigns, sequences, reply sync",
        competitor: "Export & integrate; less native outreach",
        huntloAdvantage: true,
      },
      {
        feature: "Contact data",
        huntlo: "Reveal email/phone in-product",
        competitor: "Enrichment via partners",
        huntloAdvantage: true,
      },
      {
        feature: "Deployment",
        huntlo: "Self-serve signup & onboarding",
        competitor: "Enterprise-led rollout",
        huntloAdvantage: true,
      },
      {
        feature: "Time to first candidates",
        huntlo: "Minutes from homepage search",
        competitor: "Longer implementation cycle",
        huntloAdvantage: true,
      },
    ],
    huntloHighlights: [
      "Start sourcing from the marketing site without a sales call",
      "Built for outbound — not just search and export",
      "Campaign workspace with job description + outreach plans",
    ],
  },
  {
    slug: "gem",
    name: "Gem",
    shortName: "Gem",
    summary:
      "Gem is a CRM for recruiting outreach, especially strong for in-house teams nurturing pipelines. Huntlo combines AI sourcing with that same outreach layer — so you find and engage talent in one system.",
    positioning:
      "Gem is ideal when you already have candidates and need nurture sequences. Huntlo adds AI discovery on top — so you are not only engaging known leads but finding new ones too.",
    rows: [
      {
        feature: "Starting point",
        huntlo: "AI search → session → campaign",
        competitor: "CRM sequences for existing pipelines",
        huntloAdvantage: true,
      },
      {
        feature: "Talent discovery",
        huntlo: "AI sourcing sessions & People Scout",
        competitor: "Limited net-new sourcing",
        huntloAdvantage: true,
      },
      {
        feature: "Sequence builder",
        huntlo: "Email & WhatsApp outreach plans",
        competitor: "Polished email nurture CRM",
      },
      {
        feature: "Analytics",
        huntlo: "Campaign sends, replies, dispositions",
        competitor: "Pipeline analytics & team reporting",
      },
      {
        feature: "WhatsApp",
        huntlo: "First-class WhatsApp campaigns",
        competitor: "Email-first product",
        huntloAdvantage: true,
      },
      {
        feature: "Staffing firms",
        huntlo: "Multi-client search volume & credits",
        competitor: "Stronger for corporate TA CRM",
        huntloAdvantage: true,
      },
      {
        feature: "Best for",
        huntlo: "Outbound sourcing + engagement",
        competitor: "In-house nurture & rediscovery",
      },
    ],
    huntloHighlights: [
      "Do not choose between sourcing tool and outreach CRM",
      "Staffing-friendly plans with search and unlock quotas",
      "Session-based workflow from first query to first reply",
    ],
  },
];

export function comparisonBySlug(slug: string): CompetitorComparison | undefined {
  return COMPETITOR_COMPARISONS.find((c) => c.slug === slug.trim());
}

export const COMPARISON_FOOTER_LINKS = COMPETITOR_COMPARISONS.map((c) => ({
  label: `Huntlo vs ${c.shortName}`,
  href: `/compare#${c.slug}`,
}));

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  list?: string[];
};

export type LegalPageData = {
  slug: LegalPageSlug;
  title: string;
  shortTitle: string;
  metaTitle: string;
  metaDescription: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const LEGAL_PAGE_SLUGS = ["privacy", "terms", "security", "cookies"] as const;

export type LegalPageSlug = (typeof LEGAL_PAGE_SLUGS)[number];

export const FOOTER_LEGAL_LINKS: { label: string; slug: LegalPageSlug }[] = [
  { label: "Privacy", slug: "privacy" },
  { label: "Terms", slug: "terms" },
  { label: "Security", slug: "security" },
  { label: "Cookies", slug: "cookies" },
];

export function legalPageHref(slug: LegalPageSlug): string {
  return `/${slug}`;
}

const LEGAL_PAGES: Record<LegalPageSlug, LegalPageData> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    shortTitle: "Privacy",
    metaTitle: "Privacy Policy | Huntlo",
    metaDescription:
      "How Huntlo collects, uses, stores, and protects personal data when you use our AI recruiting platform.",
    lastUpdated: "June 6, 2026",
    sections: [
      {
        id: "introduction",
        title: "Introduction",
        paragraphs: [
          'Huntlo ("Huntlo", "we", "us", or "our") provides an AI-powered outbound recruiting platform. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you visit our website, create an account, or use our services.',
          "By using Huntlo, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use our services.",
        ],
      },
      {
        id: "information-we-collect",
        title: "Information we collect",
        paragraphs: ["We collect information in the following categories:"],
        list: [
          "Account information such as your name, work email, company name, job title, and authentication credentials.",
          "Recruiting data you upload or generate, including job descriptions, search criteria, candidate lists, outreach messages, and campaign activity.",
          "Candidate and contact data sourced or revealed through the platform, including professional profile information and contact details where permitted.",
          "Usage and device data such as IP address, browser type, pages viewed, feature usage, and log data.",
          "Payment and billing information processed through our payment providers. We do not store full payment card numbers on our servers.",
          "Communications you send to us, including support requests and feedback.",
        ],
      },
      {
        id: "how-we-use-information",
        title: "How we use information",
        paragraphs: ["We use collected information to:"],
        list: [
          "Provide, operate, maintain, and improve the Huntlo platform.",
          "Process searches, outreach, integrations, billing, and account management.",
          "Personalize product experiences and generate AI-assisted recruiting content at your direction.",
          "Monitor usage, troubleshoot issues, prevent fraud, and enforce our Terms of Service.",
          "Send service-related notices, product updates, and—where permitted—marketing communications.",
          "Comply with legal obligations and respond to lawful requests.",
        ],
      },
      {
        id: "legal-bases",
        title: "Legal bases for processing",
        paragraphs: [
          "Where applicable law requires a legal basis, we process personal data based on contract performance, legitimate interests in operating and improving our services, compliance with legal obligations, and your consent where required.",
        ],
      },
      {
        id: "sharing",
        title: "How we share information",
        paragraphs: [
          "We do not sell personal information. We may share information with service providers that help us operate Huntlo (such as hosting, analytics, email delivery, payment processing, and AI infrastructure), subject to contractual safeguards.",
          "We may also disclose information if required by law, to protect rights and safety, or in connection with a merger, acquisition, or sale of assets with appropriate notice where required.",
        ],
      },
      {
        id: "retention",
        title: "Data retention",
        paragraphs: [
          "We retain information for as long as needed to provide the services, fulfill the purposes described in this policy, comply with legal obligations, resolve disputes, and enforce agreements. Retention periods may vary based on account status and data type.",
        ],
      },
      {
        id: "security",
        title: "Security",
        paragraphs: [
          "We implement administrative, technical, and organizational measures designed to protect information. No method of transmission or storage is completely secure. See our Security page for more detail.",
        ],
      },
      {
        id: "your-rights",
        title: "Your rights and choices",
        paragraphs: ["Depending on your location, you may have rights to:"],
        list: [
          "Access, correct, or delete certain personal information.",
          "Object to or restrict certain processing.",
          "Withdraw consent where processing is consent-based.",
          "Receive a portable copy of certain data.",
          "Opt out of marketing emails using the unsubscribe link in those messages.",
        ],
      },
      {
        id: "international",
        title: "International transfers",
        paragraphs: [
          "Huntlo may process and store information in countries other than where you reside. Where required, we use appropriate safeguards for cross-border transfers.",
        ],
      },
      {
        id: "children",
        title: "Children's privacy",
        paragraphs: [
          "Huntlo is intended for business use and is not directed to children under 16. We do not knowingly collect personal information from children.",
        ],
      },
      {
        id: "changes",
        title: "Changes to this policy",
        paragraphs: [
          "We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the \"Last updated\" date. Material changes may be communicated through the service or by email where appropriate.",
        ],
      },
      {
        id: "contact",
        title: "Contact us",
        paragraphs: [
          "For privacy questions or requests, contact us at info@huntlo.ai.",
        ],
      },
    ],
  },
  terms: {
    slug: "terms",
    title: "Terms of Service",
    shortTitle: "Terms",
    metaTitle: "Terms of Service | Huntlo",
    metaDescription:
      "Terms governing access to and use of the Huntlo AI recruiting platform, subscriptions, and related services.",
    lastUpdated: "June 6, 2026",
    sections: [
      {
        id: "agreement",
        title: "Agreement to terms",
        paragraphs: [
          'These Terms of Service ("Terms") govern your access to and use of Huntlo\'s website, applications, and services (collectively, the "Services"). By creating an account or using the Services, you agree to these Terms and our Privacy Policy.',
          "If you use the Services on behalf of an organization, you represent that you have authority to bind that organization, and \"you\" refers to that organization.",
        ],
      },
      {
        id: "eligibility",
        title: "Eligibility and accounts",
        paragraphs: [
          "You must be at least 18 years old and able to form a binding contract to use the Services. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.",
          "You agree to provide accurate account information and to keep it current.",
        ],
      },
      {
        id: "permitted-use",
        title: "Permitted use",
        paragraphs: ["You may use Huntlo only for lawful recruiting and business purposes. You agree not to:"],
        list: [
          "Use the Services in violation of applicable laws, including employment, privacy, anti-spam, and data protection laws.",
          "Upload or process data you do not have the right to use.",
          "Harass candidates, send unlawful or deceptive outreach, or engage in discriminatory hiring practices.",
          "Reverse engineer, scrape, or attempt to gain unauthorized access to the Services or related systems.",
          "Interfere with the integrity, performance, or security of the Services.",
          "Resell or sublicense the Services except as expressly permitted in writing.",
        ],
      },
      {
        id: "customer-data",
        title: "Customer data and recruiting content",
        paragraphs: [
          'You retain ownership of data you submit to Huntlo ("Customer Data"). You grant Huntlo a limited license to host, process, and display Customer Data solely to provide and improve the Services, including AI-assisted features you enable.',
          "You are responsible for obtaining necessary consents, providing required notices, and ensuring your use of candidate data complies with applicable law.",
        ],
      },
      {
        id: "ai-features",
        title: "AI-assisted features",
        paragraphs: [
          "Huntlo may use automated and AI-assisted tools to help generate searches, messages, summaries, and recommendations. Outputs may be inaccurate or incomplete. You are responsible for reviewing content before sending or relying on it in hiring decisions.",
        ],
      },
      {
        id: "subscriptions",
        title: "Subscriptions, billing, and trials",
        paragraphs: [
          "Paid plans, credits, usage limits, and billing terms are described at checkout or in your order form. Fees are generally non-refundable except where required by law or expressly stated otherwise.",
          "We may change pricing or plan features with reasonable notice. Continued use after changes become effective may constitute acceptance.",
        ],
      },
      {
        id: "third-party",
        title: "Third-party services",
        paragraphs: [
          "The Services may integrate with third-party tools such as email providers, calendars, messaging platforms, and payment processors. Your use of those services is subject to their terms and policies.",
        ],
      },
      {
        id: "intellectual-property",
        title: "Intellectual property",
        paragraphs: [
          "Huntlo and its licensors retain all rights in the Services, software, branding, and underlying technology. These Terms do not grant you ownership of Huntlo intellectual property except for the limited rights necessary to use the Services.",
        ],
      },
      {
        id: "disclaimers",
        title: "Disclaimers",
        paragraphs: [
          'The Services are provided "as is" and "as available" without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. Huntlo does not guarantee hiring outcomes, candidate availability, or contact accuracy.',
        ],
      },
      {
        id: "limitation",
        title: "Limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by law, Huntlo will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenue, data, or business opportunities. Our aggregate liability arising out of or relating to the Services will not exceed the amounts paid by you to Huntlo in the twelve months before the event giving rise to the claim, except where liability cannot be limited by law.",
        ],
      },
      {
        id: "termination",
        title: "Suspension and termination",
        paragraphs: [
          "We may suspend or terminate access to the Services if you violate these Terms, create risk or legal exposure, or fail to pay applicable fees. You may stop using the Services at any time. Provisions that by nature should survive termination will survive.",
        ],
      },
      {
        id: "governing-law",
        title: "Governing law",
        paragraphs: [
          "These Terms are governed by the laws applicable in the jurisdiction specified in your order form or, if none is specified, the laws of India, without regard to conflict-of-law principles. Disputes will be resolved in the courts or forums specified in your order form or as otherwise required by applicable law.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        paragraphs: ["Questions about these Terms may be sent to info@huntlo.ai."],
      },
    ],
  },
  security: {
    slug: "security",
    title: "Security",
    shortTitle: "Security",
    metaTitle: "Security | Huntlo",
    metaDescription:
      "Overview of Huntlo security practices, infrastructure protections, and how to report security concerns.",
    lastUpdated: "June 6, 2026",
    sections: [
      {
        id: "commitment",
        title: "Our commitment",
        paragraphs: [
          "Protecting customer and candidate data is central to Huntlo. We combine technical controls, operational practices, and vendor management to reduce risk across our platform.",
        ],
      },
      {
        id: "infrastructure",
        title: "Infrastructure and access controls",
        list: [
          "Production systems are hosted on reputable cloud infrastructure with network isolation and monitoring.",
          "Access to production environments is limited to authorized personnel on a need-to-know basis.",
          "Administrative access uses strong authentication and is logged and reviewed.",
          "Secrets and credentials are managed using secure storage mechanisms rather than hard-coded values.",
        ],
      },
      {
        id: "data-protection",
        title: "Data protection",
        list: [
          "Data in transit is encrypted using TLS for connections to Huntlo applications and APIs.",
          "Sensitive data at rest is protected using industry-standard encryption where appropriate.",
          "Role-based access controls limit who can view customer account data within Huntlo.",
          "Backups and recovery processes are maintained to support business continuity.",
        ],
      },
      {
        id: "application-security",
        title: "Application security",
        list: [
          "We follow secure development practices including code review and dependency monitoring.",
          "Authentication supports industry-standard flows, including OAuth where integrations require it.",
          "Session and token handling is designed to reduce unauthorized account access.",
          "We monitor for abnormal activity and operational incidents affecting the platform.",
        ],
      },
      {
        id: "vendor-management",
        title: "Vendor and subprocessors",
        paragraphs: [
          "Huntlo uses trusted third-party providers for hosting, messaging, analytics, payments, and AI processing. We evaluate vendors for security and contractual data protection commitments appropriate to the services they provide.",
        ],
      },
      {
        id: "incident-response",
        title: "Incident response",
        paragraphs: [
          "We maintain procedures to investigate, contain, and remediate security incidents. Where required by law or contract, we will notify affected customers of incidents involving their data without undue delay.",
        ],
      },
      {
        id: "your-responsibilities",
        title: "Your responsibilities",
        paragraphs: ["Security is shared. You can help protect your account by:"],
        list: [
          "Using strong, unique passwords and enabling available security controls.",
          "Limiting account access to authorized team members.",
          "Reviewing outreach content and integrations before enabling automated sending.",
          "Promptly reporting suspicious activity related to your Huntlo account.",
        ],
      },
      {
        id: "reporting",
        title: "Reporting a vulnerability",
        paragraphs: [
          "If you believe you have discovered a security vulnerability in Huntlo, please report it to security@huntlo.ai with enough detail for us to reproduce and investigate. Please do not publicly disclose issues before we have had a reasonable opportunity to address them.",
        ],
      },
    ],
  },
  cookies: {
    slug: "cookies",
    title: "Cookie Policy",
    shortTitle: "Cookies",
    metaTitle: "Cookie Policy | Huntlo",
    metaDescription:
      "How Huntlo uses cookies and similar technologies on our website and product.",
    lastUpdated: "June 6, 2026",
    sections: [
      {
        id: "what-are-cookies",
        title: "What are cookies?",
        paragraphs: [
          "Cookies are small text files stored on your device when you visit a website. Similar technologies such as local storage and pixels may also be used. They help websites function, remember preferences, and understand usage.",
        ],
      },
      {
        id: "how-we-use",
        title: "How Huntlo uses cookies",
        paragraphs: ["We use cookies and similar technologies for the following purposes:"],
        list: [
          "Essential cookies required to authenticate users, maintain sessions, and secure the platform.",
          "Preference cookies that remember settings such as locale or UI choices where available.",
          "Analytics cookies that help us understand traffic patterns and improve performance.",
          "Marketing cookies, where enabled, that measure campaign effectiveness on our public site.",
        ],
      },
      {
        id: "cookie-types",
        title: "Types of cookies we may use",
        paragraphs: ["Examples include:"],
        list: [
          "Session cookies that expire when you close your browser.",
          "Persistent cookies that remain until they expire or you delete them.",
          "First-party cookies set by Huntlo.",
          "Third-party cookies set by integrated providers such as analytics or authentication partners.",
        ],
      },
      {
        id: "managing-cookies",
        title: "Managing cookies",
        paragraphs: [
          "Most browsers let you block or delete cookies through settings. Blocking essential cookies may prevent parts of Huntlo from working correctly, including sign-in and dashboard functionality.",
          "Where required by law, we will present cookie choices on our marketing site and honor your preferences for non-essential cookies.",
        ],
      },
      {
        id: "third-party",
        title: "Third-party technologies",
        paragraphs: [
          "Some Huntlo pages may include content or tools from third parties, such as embedded scheduling widgets or sign-in providers. Those providers may set their own cookies subject to their policies.",
        ],
      },
      {
        id: "updates",
        title: "Updates to this policy",
        paragraphs: [
          "We may update this Cookie Policy when our practices or applicable requirements change. The \"Last updated\" date at the top of this page indicates the latest revision.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        paragraphs: [
          "Questions about cookies or tracking technologies can be sent to info@huntlo.ai.",
        ],
      },
    ],
  },
};

export function legalPageBySlug(slug: string): LegalPageData | null {
  if (!(LEGAL_PAGE_SLUGS as readonly string[]).includes(slug)) {
    return null;
  }
  return LEGAL_PAGES[slug as LegalPageSlug];
}

export function requireLegalPage(slug: LegalPageSlug): LegalPageData {
  const page = legalPageBySlug(slug);
  if (!page) {
    throw new Error(`Legal page "${slug}" is missing`);
  }
  return page;
}

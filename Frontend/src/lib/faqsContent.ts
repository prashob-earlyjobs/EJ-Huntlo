export type FaqItem = {
  question: string;
  answer: string;
  bullets?: string[];
};

export type FaqSection = {
  id: string;
  navLabel: string;
  title: string;
  items: FaqItem[];
};

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "about-huntlo",
    navLabel: "About Huntlo",
    title: "About Huntlo AI",
    items: [
      {
        question: "What is Huntlo?",
        answer:
          "Huntlo is an AI Recruiting Operating System that helps hiring teams automate candidate sourcing, outreach, screening, interview coordination, and recruitment workflows from a single platform. Instead of relying on manual sourcing and disconnected tools, recruiters can use Huntlo to discover talent, engage candidates, qualify applicants, and manage hiring pipelines more efficiently.",
      },
      {
        question: "Who is Huntlo built for?",
        answer: "Huntlo is designed for:",
        bullets: [
          "Recruitment agencies",
          "Staffing firms",
          "Executive search companies",
          "Startups",
          "Enterprise hiring teams",
          "Talent acquisition leaders",
          "Global Capability Centers (GCCs)",
          "Recruiting operations teams",
        ],
      },
      {
        question: "What makes Huntlo different from traditional recruiting software?",
        answer:
          "Traditional recruiting software focuses primarily on applicant tracking. Huntlo combines the following into a single recruiting operating system:",
        bullets: [
          "AI sourcing",
          "Candidate enrichment",
          "Multi-channel outreach",
          "AI screening",
          "Interview automation",
          "Recruiter productivity tools",
        ],
      },
    ],
  },
  {
    id: "candidate-sourcing",
    navLabel: "Candidate Sourcing",
    title: "AI Candidate Sourcing",
    items: [
      {
        question: "How does Huntlo source candidates?",
        answer:
          "Recruiters can use natural language search to find candidates across millions of professional profiles. The platform identifies relevant talent based on skills, experience, job titles, industries, locations, and hiring requirements.",
      },
      {
        question: "Does Huntlo provide candidate contact information?",
        answer:
          "Yes. Huntlo enriches candidate profiles with available professional contact information to support recruiter outreach and engagement workflows.",
      },
      {
        question: "Can recruiters search using natural language?",
        answer:
          'Yes. Recruiters can describe the ideal candidate in plain English instead of building complex Boolean searches. Example: "Find senior backend engineers with Python and AWS experience in Bengaluru."',
      },
      {
        question: "Does Huntlo replace LinkedIn Recruiter?",
        answer:
          "Many recruiters use Huntlo alongside existing sourcing tools. Huntlo adds AI sourcing, candidate enrichment, outreach automation, and workflow automation capabilities beyond traditional talent search platforms.",
      },
    ],
  },
  {
    id: "outreach",
    navLabel: "Outreach Automation",
    title: "Candidate Outreach & Engagement",
    items: [
      {
        question: "Can Huntlo automate candidate outreach?",
        answer:
          "Yes. Recruiters can automate personalized outreach campaigns across multiple communication channels while maintaining candidate-specific messaging.",
      },
      {
        question: "Which outreach channels are supported?",
        answer: "Huntlo supports:",
        bullets: [
          "Email outreach",
          "WhatsApp outreach",
          "Follow-up automation",
          "Candidate engagement sequences",
        ],
      },
      {
        question: "Can recruiters personalize outreach messages?",
        answer:
          "Yes. Recruiters can create personalized outreach workflows using candidate profile information, job requirements, and hiring context.",
      },
      {
        question: "Does Huntlo automate follow-ups?",
        answer:
          "Yes. The platform can automatically trigger follow-up communication based on candidate engagement and response behavior.",
      },
    ],
  },
  {
    id: "screening",
    navLabel: "Screening & Qualification",
    title: "AI Screening",
    items: [
      {
        question: "How does AI screening work?",
        answer:
          "Huntlo helps recruiters evaluate candidate qualifications based on predefined hiring criteria, reducing manual screening effort.",
      },
      {
        question: "Can Huntlo qualify candidates automatically?",
        answer:
          "Yes. The platform can assess candidate responses and match them against job requirements before recruiter review.",
      },
      {
        question: "Does Huntlo support AI voice screening?",
        answer:
          "Yes. Recruiters can automate initial screening conversations and qualification workflows using AI-powered voice interactions.",
      },
      {
        question: "Can recruiters review screening results?",
        answer:
          "Absolutely. Recruiters maintain full visibility into candidate evaluations, responses, and qualification outcomes.",
      },
    ],
  },
  {
    id: "interviews",
    navLabel: "Interview Automation",
    title: "Interview Scheduling",
    items: [
      {
        question: "Can Huntlo schedule interviews automatically?",
        answer:
          "Yes. Huntlo automates interview coordination by managing calendars, candidate availability, reminders, and scheduling workflows.",
      },
      {
        question: "Does Huntlo integrate with calendar tools?",
        answer:
          "Yes. Calendar integrations help reduce scheduling friction and improve coordination between recruiters and hiring managers.",
      },
      {
        question: "Can candidates reschedule interviews?",
        answer:
          "Yes. Candidates can update availability and manage scheduling through automated workflows.",
      },
    ],
  },
  {
    id: "productivity",
    navLabel: "Recruiter Productivity",
    title: "Recruiter Productivity & Hiring Operations",
    items: [
      {
        question: "How does Huntlo improve recruiter productivity?",
        answer:
          "Huntlo automates repetitive recruiting tasks including candidate sourcing, profile enrichment, outreach, screening, follow-ups, and scheduling — allowing recruiters to focus on relationship building and hiring decisions.",
      },
      {
        question: "Can multiple recruiters collaborate?",
        answer:
          "Yes. Recruiters, hiring managers, and stakeholders can collaborate within shared hiring workflows.",
      },
      {
        question: "Does Huntlo support recruitment agencies?",
        answer:
          "Yes. Recruitment agencies can manage multiple clients, candidate pipelines, and recruiter workflows within one platform.",
      },
    ],
  },
  {
    id: "gcc",
    navLabel: "GCC Hiring",
    title: "Global Capability Center (GCC) Recruiting",
    items: [
      {
        question: "Is Huntlo suitable for GCC hiring teams?",
        answer:
          "Yes. Huntlo supports high-volume recruiting, talent intelligence, candidate sourcing, and hiring workflows commonly required by GCC organizations.",
      },
      {
        question: "Can GCC teams scale hiring with Huntlo?",
        answer:
          "Yes. The platform is designed to help talent acquisition teams improve sourcing efficiency, candidate engagement, and recruiter productivity at scale.",
      },
    ],
  },
  {
    id: "integrations",
    navLabel: "Integrations",
    title: "Integrations & Connectivity",
    items: [
      {
        question: "Does Huntlo integrate with ATS platforms?",
        answer:
          "Yes. Huntlo is designed to connect with existing recruiting and hiring technology ecosystems.",
      },
      {
        question: "Can Huntlo connect with communication tools?",
        answer:
          "Yes. The platform supports integrations that streamline recruiter communication and candidate engagement.",
      },
      {
        question: "Is API access available?",
        answer:
          "Yes. Developers can leverage APIs to extend workflows and integrate Huntlo into existing recruiting systems.",
      },
    ],
  },
  {
    id: "security",
    navLabel: "Security & Compliance",
    title: "Security & Data Protection",
    items: [
      {
        question: "How is candidate data protected?",
        answer:
          "Huntlo follows industry-standard security practices to protect candidate and recruiter information.",
      },
      {
        question: "Is candidate information encrypted?",
        answer:
          "Yes. Sensitive information is protected through modern security and access control practices.",
      },
      {
        question: "Does Huntlo support enterprise security requirements?",
        answer:
          "Yes. Enterprise customers can discuss security, compliance, and governance requirements with the Huntlo team.",
      },
    ],
  },
  {
    id: "pricing",
    navLabel: "Pricing & Implementation",
    title: "Pricing & Getting Started",
    items: [
      {
        question: "How quickly can teams get started?",
        answer:
          "Most teams can begin using Huntlo shortly after onboarding and implementation.",
      },
      {
        question: "Is onboarding included?",
        answer: "Yes. The Huntlo team provides onboarding guidance and implementation support.",
      },
      {
        question: "Can I request a demo?",
        answer:
          "Absolutely. Schedule a personalized demo to see how Huntlo can improve sourcing, outreach, screening, and hiring operations.",
      },
    ],
  },
];

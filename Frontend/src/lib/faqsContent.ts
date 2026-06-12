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
          "Huntlo is agentic AI recruiting infrastructure — a platform where autonomous AI agents source candidates from 50+ professional platforms, run personalized outreach across email and WhatsApp, conduct AI voice screening calls, and schedule interviews without requiring manual recruiter intervention at each step. Built by the EarlyJobs team, Huntlo is designed for staffing agencies, enterprise TA teams, GCCs, and high-growth startups that need to hire faster without scaling recruiter headcount proportionally.",
      },
      {
        question: "What is agentic AI recruiting?",
        answer:
          "Agentic AI recruiting means AI agents autonomously execute multi-step hiring workflows — sourcing candidates, enriching profiles, sending personalized outreach, screening applicants, and scheduling interviews — without a human having to initiate each action manually. Unlike automation tools that trigger fixed sequences, agentic AI makes decisions and adapts based on candidate behavior, reply signals, and hiring context.",
      },
      {
        question: "Who is Huntlo built for?",
        answer:
          "Huntlo is designed for recruiting teams that run proactive outbound hiring — not just post jobs and wait for applicants. Typical customers include staffing and recruitment agencies managing multiple client mandates, executive search firms sourcing passive senior talent, startups building their first hiring engine, enterprise TA teams standardizing sourcing across regions, and Global Capability Centers hiring at high volume.",
        bullets: [
          "Recruitment agencies and staffing firms",
          "Executive search companies",
          "Startups and scale-ups",
          "Enterprise talent acquisition teams",
          "Global Capability Centers (GCCs)",
          "High-volume hiring organizations",
        ],
      },
      {
        question: "What makes Huntlo different from traditional recruiting software?",
        answer:
          "Traditional recruiting software and ATS platforms focus primarily on tracking applicants who apply to job posts. Huntlo is agentic AI recruiting infrastructure that proactively sources passive candidates, runs autonomous multi-channel outreach, conducts AI voice screening, and schedules interviews — combining capabilities that typically require separate sourcing, sequencing, and screening tools into one platform.",
        bullets: [
          "Agentic AI sourcing across 50+ platforms",
          "Autonomous email and WhatsApp outreach",
          "AI voice screening and qualification",
          "Interview scheduling automation",
          "Campaign-based pipeline management",
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
          "Recruiters describe the ideal hire in plain English — no Boolean strings required. Huntlo's agentic AI searches across 50+ professional platforms including public professional networks, technical profile databases, and portfolio sites. The platform identifies relevant talent based on skills, experience, job titles, industries, locations, and hiring requirements, then scores and ranks candidates by fit.",
      },
      {
        question: "Does Huntlo provide candidate contact information?",
        answer:
          "Yes. Huntlo enriches candidate profiles with available professional contact information including verified email addresses and phone numbers where available. Contact reveal is integrated directly into sourcing sessions and campaign workflows, so recruiters can move from discovery to outreach without switching tools or manually hunting for contact details.",
      },
      {
        question: "Can recruiters search using natural language?",
        answer:
          'Yes. Recruiters describe the ideal candidate in plain English instead of building complex Boolean searches. For example: "Find senior backend engineers with Python and AWS experience in Bengaluru with fintech background." Huntlo maps natural-language intent to structured search criteria and returns ranked, enriched candidate results.',
      },
      {
        question: "Does Huntlo replace LinkedIn Recruiter?",
        answer:
          "Huntlo goes significantly beyond LinkedIn Recruiter. While LinkedIn Recruiter provides talent search on one platform, Huntlo searches 50+ sources, adds autonomous candidate outreach via email and WhatsApp, AI voice screening, interview scheduling, and end-to-end hiring workflow management. Many teams use Huntlo as their primary sourcing and outreach layer, reducing dependence on LinkedIn Recruiter for passive talent engagement.",
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
          "Yes. Huntlo runs autonomous outreach campaigns across email and WhatsApp with personalized messaging based on candidate profile data, role requirements, and hiring context. Recruiters set up multi-step sequences with automated follow-ups for non-responders and reply-driven qualification flows — the AI agents handle execution while recruiters maintain oversight and control.",
      },
      {
        question: "Which outreach channels are supported?",
        answer:
          "Huntlo supports multi-channel outreach designed for modern recruiting teams, with particular strength in markets where WhatsApp is a primary candidate communication channel. All channels are managed from a single campaign workspace with unified reply tracking and pipeline visibility.",
        bullets: [
          "Email outreach with personalized sequences",
          "WhatsApp outreach with template-based messaging",
          "AI voice screening calls",
          "Automated follow-up and no-reply sequences",
        ],
      },
      {
        question: "Can recruiters personalize outreach messages?",
        answer:
          "Yes. Huntlo merges candidate profile information, job titles, role descriptions, and hiring context into outreach messages automatically. Recruiters can use approved templates, customize messaging per campaign, and let AI generate personalized variations — maintaining quality and brand consistency across high-volume outreach.",
      },
      {
        question: "Does Huntlo automate follow-ups?",
        answer:
          "Yes. Huntlo automatically triggers follow-up communication based on candidate engagement and response behavior — including no-reply follow-ups, reply qualification flows, and scheduling nudges. This ensures candidates stay warm through the hiring funnel without recruiters manually tracking every touchpoint.",
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
          "Huntlo evaluates candidate qualifications against predefined hiring criteria using AI-powered assessment — including resume analysis, structured response evaluation, and AI voice screening conversations. Recruiters set qualification criteria per role, and the platform scores and routes candidates based on fit before human review, reducing time spent on unqualified applicants.",
      },
      {
        question: "Can Huntlo qualify candidates automatically?",
        answer:
          "Yes. Huntlo assesses candidate responses and matches them against job requirements before recruiter review. Qualification workflows can include AI voice screening calls that ask role-specific questions, evaluate answers against criteria, and produce structured qualification summaries for recruiter decision-making.",
      },
      {
        question: "Does Huntlo support AI voice screening?",
        answer:
          "Yes. Huntlo conducts AI-powered voice screening calls that qualify candidates on availability, experience, compensation expectations, and role fit. Voice screening runs autonomously — candidates receive calls, respond to structured questions, and recruiters receive qualification summaries without scheduling every initial screen manually.",
      },
      {
        question: "Can recruiters review screening results?",
        answer:
          "Absolutely. Recruiters maintain full visibility into candidate evaluations, voice screening transcripts, response scores, and qualification outcomes. Every AI screening action is logged in the candidate's campaign record, giving hiring teams complete audit trails and the ability to override or refine AI assessments.",
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
          "Yes. Huntlo automates interview coordination by managing calendars, candidate availability, reminders, and scheduling workflows. Once a candidate is qualified through outreach or AI screening, Huntlo can send scheduling links, confirm times, send reminders, and update pipeline status — reducing the back-and-forth that typically delays hiring.",
      },
      {
        question: "Does Huntlo integrate with calendar tools?",
        answer:
          "Yes. Huntlo integrates with calendar tools including Calendly to reduce scheduling friction between recruiters, hiring managers, and candidates. Calendar integrations sync availability, prevent double-booking, and keep all stakeholders informed of upcoming interviews through automated notifications.",
      },
      {
        question: "Can candidates reschedule interviews?",
        answer:
          "Yes. Candidates can update availability and manage scheduling through automated workflows. Huntlo sends rescheduling options when conflicts arise and updates the campaign pipeline automatically, so recruiters don't need to manually chase candidates for new time slots.",
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
          "Huntlo automates the repetitive recruiting tasks that consume most recruiter time — candidate sourcing across 50+ platforms, profile enrichment, multi-channel outreach, follow-ups, AI voice screening, and interview scheduling. Based on aggregate data from 200+ Huntlo recruiting teams, customers report 72% response rates and significantly reduced time-to-shortlist compared to manual workflows.",
      },
      {
        question: "Can multiple recruiters collaborate?",
        answer:
          "Yes. Huntlo supports team workspaces where recruiters, hiring managers, and stakeholders collaborate within shared hiring campaigns. Higher-tier plans include sub-user access, role-based permissions, and manager visibility into team outreach activity, reply rates, and pipeline health across mandates.",
      },
      {
        question: "Does Huntlo support recruitment agencies?",
        answer:
          "Yes. Recruitment and staffing agencies use Huntlo to manage multiple client mandates simultaneously — each open req gets its own campaign workspace with dedicated sourcing sessions, outreach sequences, reply tracking, and client-ready pipeline visibility. Agencies report filling mandates 3x faster with the same team size.",
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
          "Yes. Huntlo is built for the high-volume, WhatsApp-first hiring programs common in Global Capability Centers. GCC teams use Huntlo to source large candidate pools per role family, run compliant template-based WhatsApp sequences at scale, bulk enroll contacts into parallel hiring campaigns, and track pipeline health across engineering, operations, and shared services functions.",
      },
      {
        question: "Can GCC teams scale hiring with Huntlo?",
        answer:
          "Yes. Huntlo supports campaigns with 1,000+ candidates, 500+ monthly WhatsApp outreaches, and parallel hiring drives across multiple role families. GCC teams standardize repeatable sourcing and outreach playbooks across locations, reducing cost-per-hire while hitting aggressive monthly hiring targets.",
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
          "Yes. Huntlo is designed to connect with existing recruiting and hiring technology ecosystems including ATS platforms. Rather than replacing your ATS, Huntlo handles the proactive sourcing, outreach, and screening layer — feeding qualified candidates into your existing applicant tracking and hiring management systems.",
      },
      {
        question: "Can Huntlo connect with communication tools?",
        answer:
          "Yes. Huntlo integrates with email providers, WhatsApp Business APIs (including Gupshup and Meta), and calendar tools like Calendly. These integrations allow recruiters to send outreach from connected accounts, track replies in unified inboxes, and book interviews without leaving the Huntlo workspace.",
      },
      {
        question: "Is API access available?",
        answer:
          "Yes. Huntlo provides API access for enterprise customers who want to extend workflows, sync candidate data with internal systems, or build custom integrations into existing recruiting stacks. Contact the Huntlo team to discuss API access and enterprise integration requirements.",
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
          "Huntlo follows industry-standard security practices including encrypted data transmission, access controls, and secure cloud infrastructure to protect candidate and recruiter information. Enterprise customers can discuss specific security, compliance, and data residency requirements with the Huntlo team during onboarding.",
      },
      {
        question: "Is candidate information encrypted?",
        answer:
          "Yes. Sensitive candidate and recruiter information is protected through encryption in transit and at rest, role-based access controls, and secure authentication. Huntlo limits data access to authorized team members within each organization's workspace.",
      },
      {
        question: "Does Huntlo support enterprise security requirements?",
        answer:
          "Yes. Enterprise customers can discuss security assessments, compliance documentation, data processing agreements, and governance requirements with the Huntlo team. Huntlo supports the security review processes common in enterprise procurement for hiring technology.",
      },
    ],
  },
  {
    id: "pricing",
    navLabel: "Pricing & Implementation",
    title: "Pricing & Getting Started",
    items: [
      {
        question: "How much does Huntlo cost?",
        answer:
          "Huntlo offers a 7-day free trial with 3 active roles and 30 candidate searches. Paid plans start at $99 per seat per month (₹8,999/month in India) on the Starter plan. Enterprise pricing is available for high-volume teams with custom requirements. Visit the pricing page or book a demo for a tailored quote.",
      },
      {
        question: "How quickly can teams get started?",
        answer:
          "Most teams are live within one business day. Sign up for the free trial, connect your email or WhatsApp account, describe your first role in natural language, and launch your first sourcing session. The Huntlo onboarding team provides setup guidance, and most recruiters send their first outreach campaign within the first week.",
      },
      {
        question: "Is onboarding included?",
        answer:
          "Yes. All Huntlo plans include onboarding guidance and implementation support. The team helps you configure sourcing workflows, set up outreach templates, connect integrations, and train recruiters on the platform. Enterprise customers receive dedicated onboarding with custom workflow design.",
      },
      {
        question: "Can I request a demo?",
        answer:
          "Absolutely. Book a personalized 15-minute demo to see how Huntlo's agentic AI recruiting infrastructure can improve your team's sourcing, outreach, screening, and hiring operations. Demos are tailored to your hiring model — staffing agency, enterprise TA, GCC, or startup.",
      },
    ],
  },
];

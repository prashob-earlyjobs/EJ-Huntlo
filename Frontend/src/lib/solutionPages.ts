import { SOLUTIONS_NAV_ITEMS, type SolutionsNavItem } from "@/lib/solutionsNav";

export type SolutionMetric = {
  value: string;
  label: string;
};

export type SolutionWorkflowStep = {
  title: string;
  description: string;
};

export type SolutionHeroPreviewItem = {
  icon: string;
  text: string;
};

export type SolutionHeroPreview = {
  label: string;
  icon: string;
  title: string;
  items: SolutionHeroPreviewItem[];
  activeCampaigns: string;
};

export type SolutionPageData = SolutionsNavItem & {
  /** SEO H1 — defaults to `title` when omitted. */
  h1?: string;
  metaTitle: string;
  metaDescription: string;
  heroAccent: string;
  heroLead: string;
  heroSupport: string;
  heroPills: string[];
  heroPreview: SolutionHeroPreview;
  overviewTitle: string;
  intro: string;
  highlights: string[];
  metrics: SolutionMetric[];
  workflowSteps: SolutionWorkflowStep[];
  challenges: string[];
  capabilities: string[];
  outcomes: string[];
};

export const SOLUTION_PAGE_SLUGS = SOLUTIONS_NAV_ITEMS.map((item) => item.id);

const SOLUTION_PAGES: Record<string, SolutionPageData> = {
  "staffing-agencies": {
    id: "staffing-agencies",
    title: "For Staffing Agencies",
    description:
      "Manage multiple client mandates, source candidates faster, and automate recruiter workflows.",
    href: "/solutions/staffing-agencies",
    h1: "Agentic AI Recruiting Infrastructure Built for Staffing Agencies",
    metaTitle: "AI Recruiting Infrastructure for Staffing Agencies | Huntlo",
    metaDescription:
      "Huntlo helps staffing agencies fill every client mandate faster with agentic AI sourcing, autonomous outreach & real-time pipeline tracking. Start free.",
    heroAccent: "Fill every client mandate faster—with one recruiting workspace.",
    heroLead:
      "Staffing agencies run on speed. New reqs land daily, clients expect pipeline within hours, and recruiters can't afford to jump between LinkedIn, spreadsheets, and outreach tools. Huntlo unifies AI sourcing, contact reveal, and multi-channel campaigns so your desk stays ahead of SLAs.",
    heroSupport:
      "Whether you run contingent staffing or retained search, every mandate gets its own campaign workspace—sourcing sessions, outreach sequences, reply tracking, and manager visibility in one place.",
    heroPills: [
      "Multi-mandate campaigns",
      "Email + WhatsApp outreach",
      "Contact reveal & enrichment",
      "Pipeline per client req",
    ],
    heroPreview: {
      label: "Staffing workspace",
      icon: "groups",
      title: "Acme Corp · Senior React roles",
      items: [
        { icon: "travel_explore", text: "42 candidates sourced for 3 open mandates today" },
        { icon: "mark_email_read", text: "18 replies across email and WhatsApp follow-ups" },
        { icon: "visibility", text: "Manager view: activity and pipeline per client req" },
      ],
      activeCampaigns: "12 open",
    },
    overviewTitle: "Run every client mandate from one recruiting workspace",
    intro:
      "Staffing agencies juggle dozens of open roles, client SLAs, and recruiter bandwidth at once. Huntlo gives your team one workspace to source across mandates, run outbound campaigns, and keep every client pipeline moving—without adding headcount.",
    highlights: [
      "Spin up sourcing for a new client req in minutes with natural-language search",
      "Run Email and WhatsApp sequences with automated no-reply follow-ups",
      "Reveal contacts and enrich profiles without switching tools",
      "Give managers visibility into activity, replies, and pipeline per mandate",
    ],
    metrics: [
      { value: "72%", label: "Avg. reply rate" },
      { value: "3x", label: "Faster req turnaround" },
      { value: "50+", label: "Mandates per team" },
    ],
    workflowSteps: [
      {
        title: "Describe the client role",
        description: "Use AI search to build a qualified shortlist for each open mandate.",
      },
      {
        title: "Launch multi-channel outreach",
        description: "Enroll candidates into campaigns with role-specific messaging and follow-ups.",
      },
      {
        title: "Track pipeline and placements",
        description: "Monitor replies, move talent forward, and report progress to clients.",
      },
    ],
    challenges: [
      "Switching between client reqs slows sourcing and outreach",
      "Recruiters spend hours on manual LinkedIn search and list building",
      "Follow-ups slip when teams manage high candidate volume across roles",
      "Hard to show clients consistent pipeline activity and response rates",
    ],
    capabilities: [
      "AI candidate search with natural-language prompts per client role",
      "Campaign-based outreach across Email and WhatsApp with follow-up sequences",
      "Contact reveal and enrichment to reach candidates faster",
      "Shared candidate pools and session history across your recruiting team",
      "Job-specific messaging with role titles and descriptions merged automatically",
      "Pipeline visibility so managers can see activity across mandates",
    ],
    outcomes: [
      "Fill more reqs per recruiter without expanding the team",
      "Respond to new client mandates in hours, not days",
      "Keep candidates warm with automated no-reply follow-ups",
      "Present a modern, proactive recruiting motion to clients",
    ],
  },
  "recruitment-firms": {
    id: "recruitment-firms",
    title: "For Recruitment Firms",
    description:
      "Scale candidate sourcing, outreach, and placements without growing your recruiting team.",
    href: "/solutions/recruitment-firms",
    h1: "Agentic AI Recruiting for Recruitment Firms — Scale Without Scaling Headcount",
    metaTitle: "Agentic AI Recruiting for Recruitment Firms — Scale Placements | Huntlo",
    metaDescription:
      "Scale candidate sourcing, outreach, and placements without growing your team. Huntlo's agentic AI recruiting infrastructure runs the workflow for you.",
    heroAccent: "Scale placements without scaling headcount.",
    heroLead:
      "Growth-stage recruitment firms face a familiar tension: revenue targets climb faster than you can hire sourcers and coordinators. Huntlo automates discovery, first touch, follow-ups, and screening prep so consultants spend time on conversations that close—not list building and admin.",
    heroSupport:
      "Clone winning sourcing sessions, standardize outreach across junior and senior recruiters, and measure volume, replies, and conversion from a single campaign operations layer.",
    heroPills: [
      "Repeatable sourcing playbooks",
      "Standardized outreach quality",
      "Campaign per open role",
      "Team analytics & quotas",
    ],
    heroPreview: {
      label: "Firm operations",
      icon: "trending_up",
      title: "Q2 placement drive · 8 active roles",
      items: [
        { icon: "content_copy", text: "Sourcing session cloned for 3 similar engineering reqs" },
        { icon: "campaign", text: "240 first-touch messages sent with auto follow-ups" },
        { icon: "leaderboard", text: "Consultant leaderboard: replies and pipeline conversion" },
      ],
      activeCampaigns: "8 open",
    },
    overviewTitle: "Scale placements without scaling headcount",
    intro:
      "Growth-stage recruitment firms need throughput without proportional hiring of sourcers and coordinators. Huntlo automates the repetitive work—discovery, first touch, follow-ups, and screening prep—so consultants focus on closing roles and building relationships.",
    highlights: [
      "Clone winning sourcing sessions for similar roles and verticals",
      "Standardize outreach quality across junior and senior consultants",
      "Keep every open role in a dedicated campaign workspace",
      "Measure outreach volume, replies, and conversion in one place",
    ],
    metrics: [
      { value: "10x", label: "More outreach capacity" },
      { value: "75%", label: "More qualified candidates" },
      { value: "30%", label: "Lower cost per hire" },
    ],
    workflowSteps: [
      {
        title: "Open a campaign per role",
        description: "Add contacts, set job context, and align messaging to the search brief.",
      },
      {
        title: "Automate first touch and follow-up",
        description: "Run approved templates across email and WhatsApp with AI reply handling.",
      },
      {
        title: "Focus consultants on closing",
        description: "Spend time on conversations that convert—not list building and admin.",
      },
    ],
    challenges: [
      "Revenue goals outpace recruiter capacity",
      "Outbound quality drops when teams rush to hit activity targets",
      "Sourcing and outreach live in disconnected tools and spreadsheets",
      "Difficult to standardize process across junior and senior recruiters",
    ],
    capabilities: [
      "Repeatable sourcing sessions you can clone for similar roles",
      "WhatsApp and email sequences with approved templates and AI reply flows",
      "Chrome extension and integrations to work where recruiters already operate",
      "Quota-aware workflows aligned to your plan and team size",
      "Campaign workspaces for each open role with contacts, outreach, and status",
      "Analytics on outreach volume, replies, and pipeline progression",
    ],
    outcomes: [
      "Increase placements per recruiter with the same team size",
      "Launch outbound for new roles on day one",
      "Improve reply rates with personalized, multi-step sequences",
      "Onboard new recruiters faster with a consistent playbook",
    ],
  },
  "executive-search": {
    id: "executive-search",
    title: "For Executive Search",
    description:
      "Identify niche talent, build targeted pipelines, and engage passive candidates effectively.",
    href: "/solutions/executive-search",
    h1: "Agentic AI Executive Search Infrastructure — Source Niche Talent at Speed",
    metaTitle: "AI Recruiting Infrastructure for Executive Search | Huntlo",
    metaDescription:
      "Huntlo helps executive search firms source niche talent, build pipelines, and engage passive candidates with agentic AI. No manual sourcing required.",
    heroAccent: "Find niche leaders and start thoughtful conversations at scale.",
    heroLead:
      "Executive search lives on precision—narrow markets, passive talent, and brand-sensitive outreach. Researchers need more than job boards: semantic filters, verified contact data, and messaging that respects senior audiences. Huntlo helps you build qualified longlists and engage executives with discretion.",
    heroSupport:
      "Every search assignment stays confidential with full activity history, senior-appropriate templates, and reply-driven qualification before partners get involved.",
    heroPills: [
      "Semantic executive search",
      "Verified email & phone reveal",
      "Discreet multi-step outreach",
      "Confidential search pipelines",
    ],
    heroPreview: {
      label: "Executive search",
      icon: "person_search",
      title: "CFO search · Fintech · APAC",
      items: [
        { icon: "filter_alt", text: "Longlist narrowed to 28 leaders by tenure and industry" },
        { icon: "contact_mail", text: "Direct lines revealed for 19 passive executives" },
        { icon: "forum", text: "4 qualified replies routed for partner follow-up" },
      ],
      activeCampaigns: "3 retained",
    },
    overviewTitle: "Precision sourcing for passive executive talent",
    intro:
      "Executive search depends on precision—finding the right leader in a narrow market and starting a thoughtful conversation. Huntlo helps researchers build highly targeted longlists, enrich contact details, and run respectful outreach at scale while keeping every touchpoint on-brand.",
    highlights: [
      "Filter leaders by title, industry, tenure, and geography with semantic search",
      "Reveal verified email and phone for hard-to-reach executives",
      "Use senior-appropriate templates that protect your firm's brand",
      "Maintain confidential pipelines with full activity history per search",
    ],
    metrics: [
      { value: "92%", label: "Match accuracy" },
      { value: "2x", label: "Faster longlist builds" },
      { value: "48h", label: "To first outreach" },
    ],
    workflowSteps: [
      {
        title: "Build a targeted longlist",
        description: "Surface niche leaders who fit mandate criteria—not generic job board profiles.",
      },
      {
        title: "Enrich and verify contacts",
        description: "Unlock direct lines and personalize outreach for passive senior talent.",
      },
      {
        title: "Engage with discretion",
        description: "Run thoughtful sequences and qualify interest before partner involvement.",
      },
    ],
    challenges: [
      "Niche searches require deep filtering beyond generic job boards",
      "Passive executives rarely respond to generic InMails or blasts",
      "Researchers lose time hunting for emails and direct lines",
      "Confidential searches need controlled, professional communication",
    ],
    capabilities: [
      "Semantic search to surface leaders by title, industry, tenure, and geography",
      "Verified email and phone reveal for hard-to-reach executives",
      "Template-based WhatsApp and email openers tailored to senior audiences",
      "Reply-driven qualification flows that feel conversational, not automated",
      "Role and mandate context stored per campaign for consistent messaging",
      "Private pipelines per search assignment with full activity history",
    ],
    outcomes: [
      "Build qualified longlists faster for retained and contingency searches",
      "Increase response rates from passive senior talent",
      "Reduce researcher time on admin and list hygiene",
      "Deliver a polished candidate experience that protects your brand",
    ],
  },
  startups: {
    id: "startups",
    title: "For Startups",
    description:
      "Build your first hiring engine and attract top talent without a large recruiting team.",
    href: "/solutions/startups",
    h1: "Agentic AI Hiring Infrastructure for Startups — Build Your First Recruiting Engine",
    metaTitle: "Agentic AI Hiring Infrastructure for Startups | Huntlo",
    metaDescription:
      "Huntlo gives startups a full agentic AI hiring engine — source, outreach, screen, and schedule interviews without a large recruiting team. Start free.",
    heroAccent: "Hire critical roles before you hire a recruiting team.",
    heroLead:
      "Early-stage teams rarely have dedicated recruiters—but every hire shapes the company. Founders and hiring managers need to source builders, operators, and leaders while shipping product. Huntlo gives you a professional outbound hiring motion from day one, without agency fees or enterprise tool sprawl.",
    heroSupport:
      "Describe your ideal hire in plain English, reach strong candidates proactively, and book interviews faster with integrated workflows—then reuse what works as you scale each new role.",
    heroPills: [
      "Natural-language AI search",
      "Trial plans for lean teams",
      "Email + WhatsApp sequences",
      "Calendly & interview booking",
    ],
    heroPreview: {
      label: "Startup hiring",
      icon: "rocket_launch",
      title: "Head of Engineering · Series A",
      items: [
        { icon: "search", text: "Shortlist of 15 senior engineers built in one session" },
        { icon: "send", text: "Personalized outreach sent before job post went live" },
        { icon: "event_available", text: "3 intro calls booked via Calendly this week" },
      ],
      activeCampaigns: "2 active",
    },
    overviewTitle: "Your first hiring engine—without hiring recruiters first",
    intro:
      "Early-stage teams rarely have dedicated recruiters—but every hire shapes the company. Huntlo lets founders and hiring managers run a professional outbound hiring motion from day one: source builders, operators, and leaders, then engage them before competitors do.",
    highlights: [
      "Describe your ideal hire in plain English—no Boolean strings required",
      "Start on a trial plan sized for lean teams and first critical hires",
      "Run polished outreach that competes with larger employers",
      "Book interviews faster with Calendly and integrated workflows",
    ],
    metrics: [
      { value: "Day 1", label: "Go-live speed" },
      { value: "72%", label: "Candidate reply rate" },
      { value: "5x", label: "Faster shortlists" },
    ],
    workflowSteps: [
      {
        title: "Search in natural language",
        description: "Describe the builder, operator, or leader you need—Huntlo finds the fit.",
      },
      {
        title: "Reach out proactively",
        description: "Contact strong candidates before they see your job post elsewhere.",
      },
      {
        title: "Build a repeatable playbook",
        description: "Reuse sessions, templates, and pools as you scale each new hire.",
      },
    ],
    challenges: [
      "Founders and hiring managers source between product and ops work",
      "Limited budget for agencies and premium tools",
      "Hard to compete with larger employers for the same talent",
      "No structured process for outreach, follow-up, or pipeline tracking",
    ],
    capabilities: [
      "Natural-language search to describe the ideal hire in plain English",
      "Affordable trial and starter plans sized for lean teams",
      "Email and WhatsApp outreach without a separate sequencing tool",
      "Job title and description fields for consistent candidate communication",
      "Campaign view to track who was contacted, replied, and moved forward",
      "Integrations and Calendly scheduling to book interviews faster",
    ],
    outcomes: [
      "Hire critical roles without hiring a recruiter first",
      "Reach candidates proactively instead of waiting on applications",
      "Look credible to senior hires with polished, personalized outreach",
      "Build a repeatable hiring playbook as you scale headcount",
    ],
  },
  "enterprise-hiring": {
    id: "enterprise-hiring",
    title: "For Enterprise Hiring",
    description:
      "Streamline sourcing, screening, and hiring operations across growing teams.",
    href: "/solutions/enterprise-hiring",
    h1: "Agentic AI Recruiting Infrastructure for Enterprise Hiring Teams",
    metaTitle: "Enterprise AI Recruiting Infrastructure — Automate Hiring at Scale | Huntlo",
    metaDescription:
      "Huntlo's agentic AI recruiting infrastructure streamlines enterprise sourcing, screening, and hiring operations across growing teams. Book a demo.",
    heroAccent: "Standardize TA operations across business units and regions.",
    heroLead:
      "Enterprise talent acquisition coordinates across business units, regions, and hiring managers—while time-to-fill pressure never eases. Distributed recruiters often source and outreach differently, creating bottlenecks and inconsistent candidate experience. Huntlo centralizes AI sourcing, governed outreach, and campaign execution in one platform.",
    heroSupport:
      "Give TA leadership reporting on outreach activity and pipeline health, enforce approved templates across teams, and manage high-volume reqs with bulk contact and reveal workflows.",
    heroPills: [
      "Team workspaces & sub-users",
      "Governed WhatsApp templates",
      "Bulk reveal & enrollment",
      "TA leadership reporting",
    ],
    heroPreview: {
      label: "Enterprise TA",
      icon: "corporate_fare",
      title: "EMEA engineering hiring · Q3",
      items: [
        { icon: "groups", text: "14 recruiters on a shared sourcing and outreach playbook" },
        { icon: "verified", text: "Approved templates enforced across all regions" },
        { icon: "monitoring", text: "Leadership dashboard: outreach volume and reply rates" },
      ],
      activeCampaigns: "47 open",
    },
    overviewTitle: "Enterprise-grade TA operations in one platform",
    intro:
      "Enterprise TA teams coordinate across business units, regions, and hiring managers—while pressure to reduce time-to-fill never lets up. Huntlo centralizes AI sourcing, recruiter-led outreach, and campaign execution so talent acquisition scales with organizational complexity.",
    highlights: [
      "Give distributed recruiters a consistent sourcing and outreach playbook",
      "Enforce approved WhatsApp and email templates across regions",
      "Manage high-volume reqs with bulk contact and reveal workflows",
      "Give TA leadership reporting on outreach activity and pipeline health",
    ],
    metrics: [
      { value: "40%", label: "Shorter time-to-shortlist" },
      { value: "5+", label: "Team seats on Growth" },
      { value: "1K+", label: "Outreach credits / mo" },
    ],
    workflowSteps: [
      {
        title: "Standardize how teams source",
        description: "Shared workflows, templates, and campaign structure across business units.",
      },
      {
        title: "Run governed outreach at scale",
        description: "Approved messaging, sub-user access, and quota-aware operations.",
      },
      {
        title: "Report to hiring leadership",
        description: "Track campaign activity, replies, and recruiter productivity centrally.",
      },
    ],
    challenges: [
      "Distributed recruiters use inconsistent sourcing and outreach methods",
      "High requisition volume creates bottlenecks in sourcing and scheduling",
      "Hard to enforce messaging standards across regions and brands",
      "Legacy tools don't connect sourcing, outreach, and pipeline in one flow",
    ],
    capabilities: [
      "Team workspaces with sub-users and role-based access on higher tiers",
      "Standardized outreach sequences with approved WhatsApp templates",
      "Campaign-level job titles and descriptions for accurate role branding",
      "High-volume contact management with reveal jobs and sync workflows",
      "Email campaign reporting and activity tracking for TA leadership",
      "ATS-friendly workflows and integrations for enterprise stacks",
    ],
    outcomes: [
      "Reduce time-to-shortlist across high-volume requisitions",
      "Give TA leaders visibility into team outreach and pipeline health",
      "Improve candidate experience with timely, relevant follow-ups",
      "Scale hiring operations without proportional tool sprawl",
    ],
  },
  gccs: {
    id: "gccs",
    title: "For GCCs",
    description:
      "Accelerate high-volume hiring with AI-powered sourcing, outreach, and talent intelligence.",
    href: "/solutions/gccs",
    h1: "Agentic AI Recruiting Infrastructure for Global Capability Centers",
    metaTitle: "AI Recruiting Infrastructure for GCCs — High-Volume Hiring | Huntlo",
    metaDescription:
      "Accelerate GCC hiring with agentic AI sourcing, autonomous multi-channel outreach, and talent intelligence built for high-volume teams. Book a demo.",
    heroAccent: "Hit aggressive hiring targets with WhatsApp-first automation.",
    heroLead:
      "Global Capability Centers hire at scale across engineering, operations, finance, and shared services—often under monthly targets that manual sourcing can't sustain. Huntlo is built for volume: discover talent in bulk, operationalize WhatsApp with compliant templates, and keep thousands of candidates moving through structured campaigns.",
    heroSupport:
      "Run repeatable playbooks across role families, bulk add and reveal contacts, and track reply rates and pipeline health across parallel hiring drives from one operations hub.",
    heroPills: [
      "High-volume AI sourcing",
      "WhatsApp at scale",
      "Bulk contact workflows",
      "Parallel hiring campaigns",
    ],
    heroPreview: {
      label: "GCC operations",
      icon: "hub",
      title: "Engineering batch · Bangalore hub",
      items: [
        { icon: "group_add", text: "1,200 candidates loaded across 6 parallel role families" },
        { icon: "chat", text: "WhatsApp sequences running with template follow-ups" },
        { icon: "speed", text: "Pipeline moving 3x faster vs. manual outreach desk" },
      ],
      activeCampaigns: "24 drives",
    },
    overviewTitle: "High-volume hiring built for GCC scale",
    intro:
      "Global Capability Centers hire at scale across engineering, operations, finance, and shared services—often under aggressive timelines. Huntlo is built for volume: discover talent in bulk, automate first-touch outreach, and keep thousands of candidates moving through structured campaigns.",
    highlights: [
      "Source large candidate pools with skills, location, and experience filters",
      "Operationalize WhatsApp at scale with compliant, template-based sequences",
      "Bulk add, reveal, and enroll contacts into parallel hiring campaigns",
      "Run repeatable playbooks across engineering, ops, and shared services",
    ],
    metrics: [
      { value: "1000+", label: "Candidates per campaign" },
      { value: "500+", label: "WhatsApp outreaches / mo" },
      { value: "30%", label: "Lower cost per hire" },
    ],
    workflowSteps: [
      {
        title: "Discover talent at volume",
        description: "Load large shortlists per role family with AI-powered filtering.",
      },
      {
        title: "Automate WhatsApp-first outreach",
        description: "Run template sequences with follow-ups tuned for high-volume programs.",
      },
      {
        title: "Move thousands through pipeline",
        description: "Track replies, qualification, and handoff across parallel hiring drives.",
      },
    ],
    challenges: [
      "Mass hiring targets require more throughput than manual sourcing allows",
      "WhatsApp is critical in many GCC markets but hard to operationalize at scale",
      "Recruiter teams need repeatable playbooks across similar role families",
      "Talent intelligence and pipeline data scattered across tools",
    ],
    capabilities: [
      "Large session results with filters for skills, location, and experience",
      "WhatsApp campaign sequences with no-reply follow-ups and reply qualification",
      "Bulk contact add, reveal, and campaign enrollment workflows",
      "Minutes-to-days wait options for testing and production outreach timing",
      "Multi-role campaign management for parallel hiring drives",
      "Analytics to monitor outreach performance across high-volume programs",
    ],
    outcomes: [
      "Hit monthly hiring targets with fewer recruiters per requisition",
      "Run compliant, template-based WhatsApp outreach at scale",
      "Shorten time from req open to engaged candidate pipeline",
      "Standardize hiring motion across GCC locations and functions",
    ],
  },
};

export function getSolutionPage(slug: string): SolutionPageData | null {
  const key = String(slug || "").trim().toLowerCase();
  return SOLUTION_PAGES[key] ?? null;
}

export function listSolutionPages(): SolutionPageData[] {
  return SOLUTION_PAGE_SLUGS.map((slug) => SOLUTION_PAGES[slug]).filter(Boolean);
}

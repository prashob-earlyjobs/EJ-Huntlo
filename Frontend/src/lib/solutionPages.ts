import { SOLUTIONS_NAV_ITEMS, type SolutionsNavItem } from "@/lib/solutionsNav";

export type SolutionPageData = SolutionsNavItem & {
  metaTitle: string;
  metaDescription: string;
  intro: string;
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
    metaTitle: "Staffing Agency Recruiting Software | Huntlo",
    metaDescription:
      "Manage multiple client mandates with AI sourcing, automated outreach, and recruiter workflows built for staffing agencies.",
    intro:
      "Staffing agencies juggle dozens of open roles, client SLAs, and recruiter bandwidth at once. Huntlo gives your team one workspace to source across mandates, run outbound campaigns, and keep every client pipeline moving—without adding headcount.",
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
    metaTitle: "Recruitment Firm Automation Platform | Huntlo",
    metaDescription:
      "Scale sourcing, outreach, and placements for recruitment firms with AI-powered workflows and multi-channel engagement.",
    intro:
      "Growth-stage recruitment firms need throughput without proportional hiring of sourcers and coordinators. Huntlo automates the repetitive work—discovery, first touch, follow-ups, and screening prep—so consultants focus on closing roles and building relationships.",
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
    metaTitle: "Executive Search & Passive Talent Outreach | Huntlo",
    metaDescription:
      "Build targeted executive pipelines, engage passive candidates, and run discreet outreach with Huntlo's AI recruiting OS.",
    intro:
      "Executive search depends on precision—finding the right leader in a narrow market and starting a thoughtful conversation. Huntlo helps researchers build highly targeted longlists, enrich contact details, and run respectful outreach at scale while keeping every touchpoint on-brand.",
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
    metaTitle: "Startup Hiring & AI Recruiting | Huntlo",
    metaDescription:
      "Build your first hiring engine with AI sourcing and outreach. Attract top startup talent without a large in-house recruiting team.",
    intro:
      "Early-stage teams rarely have dedicated recruiters—but every hire shapes the company. Huntlo lets founders and hiring managers run a professional outbound hiring motion from day one: source builders, operators, and leaders, then engage them before competitors do.",
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
    metaTitle: "Enterprise Talent Acquisition Platform | Huntlo",
    metaDescription:
      "Streamline enterprise sourcing, screening, and hiring operations with AI workflows, team collaboration, and multi-channel outreach.",
    intro:
      "Enterprise TA teams coordinate across business units, regions, and hiring managers—while pressure to reduce time-to-fill never lets up. Huntlo centralizes AI sourcing, recruiter-led outreach, and campaign execution so talent acquisition scales with organizational complexity.",
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
    metaTitle: "GCC High-Volume Hiring Software | Huntlo",
    metaDescription:
      "Accelerate GCC hiring with AI sourcing, WhatsApp outreach, talent intelligence, and workflows built for high-volume recruiting teams.",
    intro:
      "Global Capability Centers hire at scale across engineering, operations, finance, and shared services—often under aggressive timelines. Huntlo is built for volume: discover talent in bulk, automate first-touch outreach, and keep thousands of candidates moving through structured campaigns.",
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

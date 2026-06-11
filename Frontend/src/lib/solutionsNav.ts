export type SolutionsNavItem = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export const SOLUTIONS_NAV_COLUMNS: SolutionsNavItem[][] = [
  [
    {
      id: "staffing-agencies",
      title: "For Staffing Agencies",
      description:
        "Manage multiple client mandates, source candidates faster, and automate recruiter workflows.",
      href: "/solutions/staffing-agencies",
    },
    {
      id: "recruitment-firms",
      title: "For Recruitment Firms",
      description:
        "Scale candidate sourcing, outreach, and placements without growing your recruiting team.",
      href: "/solutions/recruitment-firms",
    },
    {
      id: "executive-search",
      title: "For Executive Search",
      description:
        "Identify niche talent, build targeted pipelines, and engage passive candidates effectively.",
      href: "/solutions/executive-search",
    },
  ],
  [
    {
      id: "startups",
      title: "For Startups",
      description:
        "Build your first hiring engine and attract top talent without a large recruiting team.",
      href: "/solutions/startups",
    },
    {
      id: "enterprise-hiring",
      title: "For Enterprise Hiring",
      description:
        "Streamline sourcing, screening, and hiring operations across growing teams.",
      href: "/solutions/enterprise-hiring",
    },
    {
      id: "gccs",
      title: "For GCCs",
      description:
        "Accelerate high-volume hiring with AI-powered sourcing, outreach, and talent intelligence.",
      href: "/solutions/gccs",
    },
  ],
];

export const SOLUTIONS_NAV_ITEMS = SOLUTIONS_NAV_COLUMNS.flat();

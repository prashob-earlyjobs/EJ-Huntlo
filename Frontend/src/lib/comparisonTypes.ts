export type ComparisonFeatureValue = "yes" | "partial" | "limited" | "no" | string;

export type DetailedComparisonPage = {
  slug: string;
  name: string;
  shortName: string;
  metaTitle: string;
  metaDescription: string;
  headline: string;
  intro: string[];
  quickComparisonRows: {
    feature: string;
    huntlo: ComparisonFeatureValue;
    competitor: ComparisonFeatureValue;
  }[];
  bestFor: { huntlo: string; competitor: string };
  chooseHuntlo: string[];
  chooseCompetitor: string[];
  whatIsHuntlo: {
    lead: string;
    bullets: string[];
    philosophy: string;
    closing: string;
  };
  whatIsCompetitor: {
    lead: string;
    bullets: string[];
    closing: string;
  };
  featureComparison: { capability: string; huntlo: string; competitor: string }[];
  biggestDifference: string;
  workflowHuntlo: string[];
  workflowCompetitor: string[];
  workflowNote: string;
  useCases: { useCase: string; recommended: string }[];
  prosHuntlo: string[];
  considerationHuntlo: string;
  prosCompetitor: string[];
  considerationCompetitor: string;
  faq: { question: string; answer: string }[];
  finalVerdict: string[];
};

export function comparisonPage(
  partial: Omit<DetailedComparisonPage, "slug" | "shortName"> & {
    slug: string;
    shortName?: string;
  }
): DetailedComparisonPage {
  return {
    ...partial,
    shortName: partial.shortName ?? partial.name,
  };
}

const DEFAULT_WORKFLOW_HUNTLO = [
  "Source",
  "Enrich",
  "Outreach",
  "AI Interview",
  "Candidate Engagement",
  "Optimization",
];

const DEFAULT_WHAT_IS_HUNTLO = {
  lead: "Huntlo is an AI recruiting infrastructure platform built for modern hiring teams.",
  bullets: [
    "AI sourcing workflows",
    "Recruiter outbound infrastructure",
    "AI communication systems",
    "AI interview workflows",
    "Candidate engagement automation",
  ],
  philosophy: "Recruiter owns communication. AI assists.",
  closing:
    "Instead of functioning as a traditional ATS, Huntlo focuses on becoming the AI operating layer for recruiting workflows.",
};

const DEFAULT_CHOOSE_HUNTLO = [
  "Need sourcing + outreach + AI interviews",
  "Need recruiter workflow infrastructure",
  "Need multi-channel communication",
  "Need candidate engagement systems",
];

const DEFAULT_PROS_HUNTLO = [
  "Multi-channel recruiting workflows",
  "AI communication infrastructure",
  "Recruiter workflow ownership",
  "Candidate engagement systems",
];

const DEFAULT_CONSIDERATION_HUNTLO = "Broader platform scope may require implementation planning.";

export type InfrastructureComparisonInput = {
  slug: string;
  name: string;
  shortName?: string;
  metaTitle: string;
  metaDescription: string;
  headline: string;
  intro: string[];
  quickComparisonRows: DetailedComparisonPage["quickComparisonRows"];
  bestFor: DetailedComparisonPage["bestFor"];
  chooseHuntlo?: string[];
  chooseCompetitor: string[];
  whatIsCompetitor: DetailedComparisonPage["whatIsCompetitor"];
  featureComparison: DetailedComparisonPage["featureComparison"];
  biggestDifference: string;
  workflowCompetitor: string[];
  workflowNote: string;
  useCases: DetailedComparisonPage["useCases"];
  prosCompetitor: string[];
  considerationCompetitor: string;
  faq: DetailedComparisonPage["faq"];
  finalVerdict: string[];
  whatIsHuntlo?: Partial<DetailedComparisonPage["whatIsHuntlo"]>;
  prosHuntlo?: string[];
  considerationHuntlo?: string;
};

export function buildInfrastructureComparison(
  input: InfrastructureComparisonInput
): DetailedComparisonPage {
  return comparisonPage({
    slug: input.slug,
    name: input.name,
    shortName: input.shortName,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    headline: input.headline,
    intro: input.intro,
    quickComparisonRows: input.quickComparisonRows,
    bestFor: input.bestFor,
    chooseHuntlo: input.chooseHuntlo ?? DEFAULT_CHOOSE_HUNTLO,
    chooseCompetitor: input.chooseCompetitor,
    whatIsHuntlo: { ...DEFAULT_WHAT_IS_HUNTLO, ...input.whatIsHuntlo },
    whatIsCompetitor: input.whatIsCompetitor,
    featureComparison: input.featureComparison,
    biggestDifference: input.biggestDifference,
    workflowHuntlo: DEFAULT_WORKFLOW_HUNTLO,
    workflowCompetitor: input.workflowCompetitor,
    workflowNote: input.workflowNote,
    useCases: input.useCases,
    prosHuntlo: input.prosHuntlo ?? DEFAULT_PROS_HUNTLO,
    considerationHuntlo: input.considerationHuntlo ?? DEFAULT_CONSIDERATION_HUNTLO,
    prosCompetitor: input.prosCompetitor,
    considerationCompetitor: input.considerationCompetitor,
    faq: input.faq,
    finalVerdict: input.finalVerdict,
  });
}

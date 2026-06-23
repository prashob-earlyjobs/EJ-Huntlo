export type { ComparisonFeatureValue, DetailedComparisonPage } from "./comparisonTypes";
import { comparisonPage as page, type DetailedComparisonPage } from "./comparisonTypes";
import { EXTENDED_COMPARISON_PAGES } from "./comparisonPagesExtended";

const LEGACY_COMPARISON_PAGES = [
  page({
    slug: "prism",
    name: "Prism",
    metaTitle: "Huntlo vs Prism (2026): AI Recruiting Infrastructure Comparison",
    metaDescription:
      "Compare Huntlo vs Prism across agentic sourcing, outreach automation, AI screening, and hiring workflow management. Which platform is right for you?",
    headline: "Huntlo vs Prism: Agentic AI Recruiting Infrastructure vs Talent Intelligence (2026)",
    intro: [
      "Recruiting teams today need more than candidate sourcing.",
      "They need talent discovery, candidate engagement, recruiter communication workflows, interview automation, and hiring infrastructure that improves recruiting outcomes.",
      "Huntlo and Prism both help recruiters identify talent, but they solve different parts of the recruiting workflow.",
      "This guide compares capabilities, workflows, and use cases to help recruiting teams choose the right platform.",
    ],
    quickComparisonRows: [
      { feature: "Candidate Sourcing", huntlo: "yes", competitor: "yes" },
      { feature: "AI Candidate Discovery", huntlo: "yes", competitor: "yes" },
      { feature: "Candidate Enrichment", huntlo: "yes", competitor: "yes" },
      { feature: "Recruiter Outreach", huntlo: "yes", competitor: "partial" },
      { feature: "Email Workflows", huntlo: "yes", competitor: "partial" },
      { feature: "WhatsApp Recruiting", huntlo: "yes", competitor: "no" },
      { feature: "AI Voice Workflows", huntlo: "yes", competitor: "no" },
      { feature: "AI Interview Workflows", huntlo: "yes", competitor: "no" },
      { feature: "Candidate Engagement", huntlo: "yes", competitor: "limited" },
      { feature: "Workflow Builder", huntlo: "yes", competitor: "limited" },
      { feature: "Multi-channel Communication", huntlo: "yes", competitor: "no" },
      { feature: "Recruiting Infrastructure", huntlo: "yes", competitor: "partial" },
    ],
    bestFor: {
      huntlo: "End-to-End Recruiting Workflows",
      competitor: "AI Candidate Discovery",
    },
    chooseHuntlo: [
      "Need sourcing plus candidate engagement",
      "Need recruiter communication workflows",
      "Need WhatsApp recruiting",
      "Need AI interview workflows",
      "Need multi-channel recruiting operations",
      "Need one system from sourcing to hiring",
    ],
    chooseCompetitor: [
      "Primary focus is candidate discovery",
      "Need AI-powered sourcing assistance",
      "Already have communication systems in place",
      "Already use separate interview and engagement tools",
    ],
    whatIsHuntlo: {
      lead: "Huntlo is an AI-native recruiting platform designed to help modern hiring teams source talent, engage candidates, automate recruiter workflows, and manage hiring operations.",
      bullets: [
        "AI sourcing workflows",
        "Recruiter outbound infrastructure",
        "Multi-channel communication",
        "AI interview workflows",
        "Candidate engagement automation",
        "Recruiting workflow orchestration",
      ],
      philosophy: "Recruiters own communication. AI assists.",
      closing:
        "Instead of operating as a traditional ATS, Huntlo functions as a recruiting operating system built around sourcing, engagement, and hiring momentum.",
    },
    whatIsCompetitor: {
      lead: "Prism is an AI-powered sourcing platform focused on helping recruiters discover and identify talent faster.",
      bullets: [
        "Candidate discovery",
        "AI sourcing",
        "Talent search",
        "Recruiter productivity",
        "Candidate identification",
      ],
      closing: "Prism is most relevant for teams looking to improve sourcing efficiency.",
    },
    featureComparison: [
      { capability: "AI Sourcing", huntlo: "Yes", competitor: "Yes" },
      { capability: "Candidate Discovery", huntlo: "Yes", competitor: "Yes" },
      { capability: "Candidate Enrichment", huntlo: "Yes", competitor: "Yes" },
      { capability: "Recruiter Outreach", huntlo: "Yes", competitor: "Partial" },
      { capability: "Email Automation", huntlo: "Yes", competitor: "Limited" },
      { capability: "WhatsApp Recruiting", huntlo: "Yes", competitor: "No" },
      { capability: "AI Voice Outreach", huntlo: "Yes", competitor: "No" },
      { capability: "AI Interview Automation", huntlo: "Yes", competitor: "No" },
      { capability: "Candidate Engagement", huntlo: "Yes", competitor: "Limited" },
      { capability: "Workflow Builder", huntlo: "Yes", competitor: "Limited" },
      { capability: "Multi-channel Communication", huntlo: "Yes", competitor: "No" },
      { capability: "Recruiting Analytics", huntlo: "Yes", competitor: "Partial" },
    ],
    biggestDifference:
      "Prism focuses primarily on helping recruiters discover talent. Huntlo extends beyond sourcing into communication, engagement, interviewing, and recruiting workflow orchestration.",
    workflowHuntlo: [
      "Source Talent",
      "Enrich Candidate",
      "Launch Outreach",
      "AI Interview",
      "Candidate Engagement",
      "Hiring Workflow",
      "Placement",
    ],
    workflowCompetitor: [
      "Source Talent",
      "Discover Candidates",
      "Export Candidate",
      "Recruiter Workflow",
      "Communication Tool",
      "Hiring Process",
    ],
    workflowNote:
      "Organizations looking for a complete recruiting workflow may prefer Huntlo. Teams focused primarily on candidate discovery may prefer Prism.",
    useCases: [
      { useCase: "Candidate Discovery", recommended: "Prism" },
      { useCase: "AI Sourcing", recommended: "Both" },
      { useCase: "Candidate Engagement", recommended: "Huntlo" },
      { useCase: "Recruiter Outreach", recommended: "Huntlo" },
      { useCase: "WhatsApp Recruiting", recommended: "Huntlo" },
      { useCase: "Recruiting Infrastructure", recommended: "Huntlo" },
      { useCase: "End-to-End Hiring Workflow", recommended: "Huntlo" },
    ],
    prosHuntlo: [
      "Candidate sourcing",
      "Multi-channel communication",
      "AI interview workflows",
      "Candidate engagement infrastructure",
      "Workflow automation",
      "Recruiting operating system approach",
    ],
    considerationHuntlo: "Broader workflow scope than sourcing-focused platforms.",
    prosCompetitor: [
      "AI sourcing",
      "Candidate discovery",
      "Recruiter productivity",
      "Talent identification",
    ],
    considerationCompetitor:
      "Primarily focused on sourcing rather than full recruiting workflow ownership.",
    faq: [
      {
        question: "Is Huntlo a sourcing platform?",
        answer:
          "Huntlo includes sourcing but also supports candidate engagement, recruiter communication, interviews, and workflow automation.",
      },
      {
        question: "Does Prism support candidate sourcing?",
        answer:
          "Yes. Prism focuses heavily on AI-powered talent discovery and sourcing workflows.",
      },
      {
        question: "Which platform is better for staffing firms?",
        answer:
          "Teams needing sourcing plus communication and engagement workflows may prefer Huntlo. Teams focused mainly on candidate discovery may find Prism suitable.",
      },
    ],
    finalVerdict: [
      "Prism is a strong option for recruiters focused on sourcing and talent discovery.",
      "Huntlo takes a broader recruiting infrastructure approach by combining sourcing, candidate engagement, recruiter communication, AI workflows, interviewing, and hiring operations into a single recruiting operating system.",
      "For teams looking to move beyond sourcing and build complete recruiting workflows, Huntlo offers a more comprehensive platform.",
    ],
  }),
  page({
    slug: "contrario",
    name: "Contrario",
    metaTitle: "Huntlo vs Contrario (2026): Agentic AI Recruiting Infrastructure Compared",
    metaDescription:
      "Compare Huntlo vs Contrario on agentic sourcing, autonomous outreach, AI screening, and end-to-end recruiting workflow capabilities.",
    headline: "Huntlo vs Contrario: Agentic AI Recruiting Infrastructure vs Sourcing Tool (2026)",
    intro: [
      "Recruiting teams today need more than candidate sourcing.",
      "They need candidate discovery, recruiter communication, engagement workflows, interview systems, and hiring infrastructure that helps recruiters move candidates from discovery to placement.",
      "Huntlo and Contrario both help hiring teams discover talent, but they focus on different parts of the recruiting process.",
      "This guide compares features, workflows, and use cases to help recruiting teams choose the right platform.",
    ],
    quickComparisonRows: [
      { feature: "Candidate Sourcing", huntlo: "yes", competitor: "yes" },
      { feature: "AI Candidate Discovery", huntlo: "yes", competitor: "yes" },
      { feature: "Candidate Enrichment", huntlo: "yes", competitor: "partial" },
      { feature: "Recruiter Outreach", huntlo: "yes", competitor: "limited" },
      { feature: "Email Workflows", huntlo: "yes", competitor: "limited" },
      { feature: "WhatsApp Recruiting", huntlo: "yes", competitor: "no" },
      { feature: "AI Voice Workflows", huntlo: "yes", competitor: "no" },
      { feature: "AI Interview Workflows", huntlo: "yes", competitor: "no" },
      { feature: "Candidate Engagement", huntlo: "yes", competitor: "limited" },
      { feature: "Workflow Builder", huntlo: "yes", competitor: "no" },
      { feature: "Multi-channel Communication", huntlo: "yes", competitor: "no" },
      { feature: "Recruiting Infrastructure", huntlo: "yes", competitor: "partial" },
    ],
    bestFor: { huntlo: "Recruiting Operations", competitor: "Talent Discovery" },
    chooseHuntlo: [
      "Need sourcing plus candidate engagement",
      "Need recruiter communication workflows",
      "Need outreach automation",
      "Need WhatsApp recruiting",
      "Need AI interview workflows",
      "Need hiring workflow ownership",
      "Need one platform from sourcing to hiring",
    ],
    chooseCompetitor: [
      "Primary focus is talent discovery",
      "Need AI-powered candidate identification",
      "Already have communication systems",
      "Already use external hiring workflows",
    ],
    whatIsHuntlo: {
      lead: "Huntlo is an AI-native recruiting platform designed for modern recruiting teams.",
      bullets: [
        "AI sourcing workflows",
        "Candidate enrichment",
        "Recruiter outbound workflows",
        "Multi-channel communication",
        "AI interview workflows",
        "Candidate engagement infrastructure",
        "Recruiting workflow orchestration",
      ],
      philosophy: "Recruiters own communication. AI assists.",
      closing: "Huntlo focuses on helping recruiting teams move candidates through the entire hiring lifecycle.",
    },
    whatIsCompetitor: {
      lead: "Contrario is an AI-powered talent discovery platform focused on helping organizations identify and discover relevant candidates.",
      bullets: [
        "Talent discovery",
        "AI candidate matching",
        "Candidate search",
        "Recruiter productivity",
      ],
      closing:
        "Contrario is most useful for organizations looking to improve sourcing efficiency and candidate identification.",
    },
    featureComparison: [
      { capability: "Candidate Discovery", huntlo: "Yes", competitor: "Yes" },
      { capability: "AI Matching", huntlo: "Yes", competitor: "Yes" },
      { capability: "Candidate Enrichment", huntlo: "Yes", competitor: "Partial" },
      { capability: "Recruiter Outreach", huntlo: "Yes", competitor: "Limited" },
      { capability: "Email Automation", huntlo: "Yes", competitor: "Limited" },
      { capability: "WhatsApp Recruiting", huntlo: "Yes", competitor: "No" },
      { capability: "AI Voice Outreach", huntlo: "Yes", competitor: "No" },
      { capability: "AI Interviews", huntlo: "Yes", competitor: "No" },
      { capability: "Candidate Engagement", huntlo: "Yes", competitor: "Limited" },
      { capability: "Workflow Automation", huntlo: "Yes", competitor: "No" },
      { capability: "Recruiting Analytics", huntlo: "Yes", competitor: "Partial" },
      { capability: "Multi-channel Communication", huntlo: "Yes", competitor: "No" },
    ],
    biggestDifference:
      "Contrario focuses on helping recruiters discover talent. Huntlo extends beyond sourcing into candidate engagement, recruiter communication, workflow automation, interviewing, and hiring operations.",
    workflowHuntlo: [
      "Source Talent",
      "Enrich Candidate",
      "Launch Outreach",
      "AI Interview",
      "Candidate Engagement",
      "Hiring Workflow",
      "Placement",
    ],
    workflowCompetitor: [
      "Discover Candidate",
      "Evaluate Match",
      "Export Candidate",
      "Recruiter Workflow",
      "Communication Tool",
      "Hiring Process",
    ],
    workflowNote:
      "Organizations seeking end-to-end recruiting workflows may prefer Huntlo. Organizations focused primarily on talent discovery may prefer Contrario.",
    useCases: [
      { useCase: "Talent Discovery", recommended: "Contrario" },
      { useCase: "Candidate Search", recommended: "Contrario" },
      { useCase: "Candidate Engagement", recommended: "Huntlo" },
      { useCase: "Recruiter Outreach", recommended: "Huntlo" },
      { useCase: "WhatsApp Recruiting", recommended: "Huntlo" },
      { useCase: "Recruiting Infrastructure", recommended: "Huntlo" },
      { useCase: "Hiring Workflow Automation", recommended: "Huntlo" },
      { useCase: "End-to-End Recruiting", recommended: "Huntlo" },
    ],
    prosHuntlo: [
      "Talent discovery",
      "Candidate engagement",
      "Multi-channel outreach",
      "AI interview workflows",
      "Recruiter workflow automation",
      "Recruiting operating system approach",
    ],
    considerationHuntlo: "Broader operational scope than sourcing-focused platforms.",
    prosCompetitor: [
      "AI talent discovery",
      "Candidate search",
      "Recruiter productivity",
      "Talent matching",
    ],
    considerationCompetitor:
      "Focused more on discovery than communication and hiring workflow ownership.",
    faq: [
      {
        question: "Is Huntlo only a sourcing platform?",
        answer:
          "No. Huntlo combines sourcing, outreach, communication, candidate engagement, interviewing, and workflow automation.",
      },
      {
        question: "Does Contrario support talent discovery?",
        answer:
          "Yes. Contrario focuses heavily on AI-powered candidate discovery and matching.",
      },
      {
        question: "Which platform is better for recruiting agencies?",
        answer:
          "Teams needing sourcing plus outreach, engagement, and workflow automation may prefer Huntlo. Teams focused mainly on candidate discovery may find Contrario suitable.",
      },
    ],
    finalVerdict: [
      "Contrario is a strong option for organizations focused on talent discovery and candidate matching.",
      "Huntlo takes a broader recruiting infrastructure approach by combining sourcing, candidate engagement, recruiter communication, AI workflows, interviewing, and workflow automation into one recruiting operating system.",
      "For teams looking to own the entire recruiting workflow—not just sourcing—Huntlo offers a more complete solution.",
    ],
  }),
  page({
    slug: "juicebox",
    name: "Juicebox",
    metaTitle: "Huntlo vs Juicebox (2026): Agentic AI Recruiting vs Talent Search",
    metaDescription:
      "Compare Huntlo vs Juicebox: Huntlo is end-to-end agentic AI recruiting infrastructure. Juicebox focuses on talent search. See which fits your workflow.",
    headline: "Huntlo vs Juicebox: End-to-End Recruiting Infrastructure vs AI Talent Search (2026)",
    intro: [
      "Recruiting teams today need more than candidate search.",
      "They need sourcing, communication workflows, candidate engagement, outreach automation, interview systems, and hiring infrastructure that helps recruiters move candidates through the hiring funnel.",
      "Huntlo and Juicebox both use AI to help recruiters discover talent, but they focus on different parts of the recruiting workflow.",
      "This guide compares capabilities, workflows, and use cases to help recruiting teams choose the right platform.",
    ],
    quickComparisonRows: [
      { feature: "AI Candidate Discovery", huntlo: "yes", competitor: "yes" },
      { feature: "Natural Language Search", huntlo: "yes", competitor: "yes" },
      { feature: "Candidate Sourcing", huntlo: "yes", competitor: "yes" },
      { feature: "Candidate Enrichment", huntlo: "yes", competitor: "partial" },
      { feature: "Recruiter Outreach", huntlo: "yes", competitor: "no" },
      { feature: "Email Workflows", huntlo: "yes", competitor: "no" },
      { feature: "WhatsApp Recruiting", huntlo: "yes", competitor: "no" },
      { feature: "AI Voice Workflows", huntlo: "yes", competitor: "no" },
      { feature: "AI Interview Workflows", huntlo: "yes", competitor: "no" },
      { feature: "Candidate Engagement", huntlo: "yes", competitor: "no" },
      { feature: "Workflow Builder", huntlo: "yes", competitor: "no" },
      { feature: "Multi-channel Communication", huntlo: "yes", competitor: "no" },
    ],
    bestFor: { huntlo: "Recruiting Infrastructure", competitor: "AI Talent Search" },
    chooseHuntlo: [
      "Need sourcing plus recruiter outreach",
      "Need candidate engagement workflows",
      "Need communication automation",
      "Need WhatsApp recruiting",
      "Need AI interview workflows",
      "Need hiring workflow ownership",
      "Need one platform from sourcing to hiring",
    ],
    chooseCompetitor: [
      "Primary focus is AI-powered candidate search",
      "Need natural language talent discovery",
      "Already use communication tools",
      "Already have recruiting workflows in place",
    ],
    whatIsHuntlo: {
      lead: "Huntlo is an AI-native recruiting platform built for modern recruiting teams.",
      bullets: [
        "AI sourcing workflows",
        "Candidate enrichment",
        "Recruiter outbound infrastructure",
        "Multi-channel communication",
        "AI interview workflows",
        "Candidate engagement automation",
        "Recruiting workflow orchestration",
      ],
      philosophy: "Recruiters own communication. AI assists.",
      closing:
        "Instead of stopping at candidate discovery, Huntlo focuses on helping recruiting teams move candidates from sourcing to placement.",
    },
    whatIsCompetitor: {
      lead: "Juicebox is an AI-powered recruiting search platform focused on helping recruiters discover candidates using natural language search.",
      bullets: [
        "AI sourcing",
        "Candidate discovery",
        "Natural language talent search",
        "Recruiter productivity",
      ],
      closing: "Juicebox is particularly useful for recruiters looking to simplify sourcing workflows.",
    },
    featureComparison: [
      { capability: "AI Candidate Search", huntlo: "Yes", competitor: "Yes" },
      { capability: "Natural Language Search", huntlo: "Yes", competitor: "Yes" },
      { capability: "Candidate Discovery", huntlo: "Yes", competitor: "Yes" },
      { capability: "Candidate Enrichment", huntlo: "Yes", competitor: "Partial" },
      { capability: "Recruiter Outreach", huntlo: "Yes", competitor: "No" },
      { capability: "Email Automation", huntlo: "Yes", competitor: "No" },
      { capability: "WhatsApp Recruiting", huntlo: "Yes", competitor: "No" },
      { capability: "AI Voice Outreach", huntlo: "Yes", competitor: "No" },
      { capability: "AI Interview Automation", huntlo: "Yes", competitor: "No" },
      { capability: "Candidate Engagement", huntlo: "Yes", competitor: "No" },
      { capability: "Workflow Automation", huntlo: "Yes", competitor: "No" },
      { capability: "Recruiting Analytics", huntlo: "Yes", competitor: "Limited" },
      { capability: "Multi-channel Communication", huntlo: "Yes", competitor: "No" },
    ],
    biggestDifference:
      "Juicebox focuses primarily on helping recruiters find candidates faster. Huntlo extends beyond sourcing into candidate engagement, recruiter communication, outreach automation, interviewing, and hiring workflow orchestration.",
    workflowHuntlo: [
      "Source Talent",
      "Enrich Candidate",
      "Launch Outreach",
      "Candidate Engagement",
      "AI Interview",
      "Hiring Workflow",
      "Placement",
    ],
    workflowCompetitor: [
      "Search Talent",
      "Discover Candidates",
      "Export Candidate",
      "Recruiter Workflow",
      "Communication Tool",
      "Hiring Process",
    ],
    workflowNote:
      "Organizations seeking end-to-end recruiting workflows may prefer Huntlo. Organizations focused primarily on candidate search may prefer Juicebox.",
    useCases: [
      { useCase: "AI Talent Search", recommended: "Juicebox" },
      { useCase: "Natural Language Recruiting Search", recommended: "Juicebox" },
      { useCase: "Candidate Engagement", recommended: "Huntlo" },
      { useCase: "Recruiter Outreach", recommended: "Huntlo" },
      { useCase: "WhatsApp Recruiting", recommended: "Huntlo" },
      { useCase: "Recruiting Infrastructure", recommended: "Huntlo" },
      { useCase: "Hiring Workflow Automation", recommended: "Huntlo" },
      { useCase: "End-to-End Recruiting", recommended: "Huntlo" },
    ],
    prosHuntlo: [
      "AI sourcing",
      "Candidate engagement",
      "Multi-channel outreach",
      "Recruiter workflow automation",
      "AI interview workflows",
      "Recruiting operating system approach",
    ],
    considerationHuntlo: "Broader operational scope than sourcing-focused platforms.",
    prosCompetitor: [
      "Natural language search",
      "Candidate discovery",
      "Recruiter productivity",
      "AI-powered sourcing",
    ],
    considerationCompetitor:
      "Focused primarily on talent discovery rather than communication and hiring workflow ownership.",
    faq: [
      {
        question: "Does Huntlo support AI sourcing?",
        answer:
          "Yes. Huntlo includes AI-powered sourcing, enrichment, outreach, engagement, and hiring workflows.",
      },
      {
        question: "What is Juicebox best known for?",
        answer:
          "Juicebox is known for natural language recruiting search and AI-powered candidate discovery.",
      },
      {
        question: "Which platform is better for staffing firms?",
        answer:
          "Teams needing sourcing plus outreach and engagement workflows may prefer Huntlo. Teams focused mainly on candidate discovery may find Juicebox suitable.",
      },
    ],
    finalVerdict: [
      "Juicebox is a strong option for recruiters focused on AI-powered sourcing and natural language candidate search.",
      "Huntlo takes a broader recruiting infrastructure approach by combining sourcing, candidate engagement, recruiter communication, AI workflows, interviewing, and workflow automation into a single recruiting operating system.",
      "For teams looking to move beyond candidate search and build complete recruiting workflows, Huntlo offers a more comprehensive platform.",
    ],
  }),
  page({
    slug: "qureos",
    name: "Qureos",
    metaTitle: "Huntlo vs Qureos (2026): AI Recruiting Infrastructure vs Hiring Platform",
    metaDescription:
      "Compare Huntlo vs Qureos on candidate sourcing, agentic outreach, AI voice screening, and end-to-end recruiting workflows. Full comparison inside.",
    headline: "Huntlo vs Qureos: Agentic AI Recruiting Infrastructure vs Hiring Platform (2026)",
    intro: [
      "AI is transforming how recruiting teams discover talent, engage candidates, and manage hiring workflows.",
      "Both Huntlo and Qureos help organizations improve recruiting efficiency using automation and AI. However, they focus on different areas of the hiring process.",
      "This guide compares capabilities, workflows, and use cases to help recruiting teams choose the right platform.",
    ],
    quickComparisonRows: [
      { feature: "AI Candidate Discovery", huntlo: "yes", competitor: "yes" },
      { feature: "Candidate Sourcing", huntlo: "yes", competitor: "yes" },
      { feature: "Candidate Enrichment", huntlo: "yes", competitor: "partial" },
      { feature: "Recruiter Outreach", huntlo: "yes", competitor: "partial" },
      { feature: "Email Workflows", huntlo: "yes", competitor: "partial" },
      { feature: "WhatsApp Recruiting", huntlo: "yes", competitor: "no" },
      { feature: "AI Voice Workflows", huntlo: "yes", competitor: "no" },
      { feature: "AI Interview Workflows", huntlo: "yes", competitor: "yes" },
      { feature: "Candidate Engagement", huntlo: "yes", competitor: "partial" },
      { feature: "Workflow Builder", huntlo: "yes", competitor: "limited" },
      { feature: "Multi-channel Communication", huntlo: "yes", competitor: "no" },
      { feature: "Recruiting Infrastructure", huntlo: "yes", competitor: "partial" },
    ],
    bestFor: { huntlo: "End-to-End Recruiting Operations", competitor: "AI Hiring Automation" },
    chooseHuntlo: [
      "Need sourcing plus outreach automation",
      "Need candidate engagement workflows",
      "Need recruiter communication infrastructure",
      "Need WhatsApp recruiting",
      "Need hiring workflow orchestration",
      "Need one platform from sourcing to hiring",
      "Need recruiter-owned communication workflows",
    ],
    chooseCompetitor: [
      "Need AI-powered hiring automation",
      "Focus is interview automation and hiring efficiency",
      "Already use communication tools",
      "Already have sourcing workflows in place",
    ],
    whatIsHuntlo: {
      lead: "Huntlo is an AI-native recruiting platform built for modern recruiting teams.",
      bullets: [
        "AI sourcing workflows",
        "Candidate enrichment",
        "Recruiter outbound infrastructure",
        "Multi-channel communication",
        "AI interview workflows",
        "Candidate engagement automation",
        "Recruiting workflow orchestration",
      ],
      philosophy: "Recruiters own communication. AI assists.",
      closing:
        "Huntlo is designed to help recruiters move candidates through the entire hiring lifecycle—from discovery to placement.",
    },
    whatIsCompetitor: {
      lead: "Qureos is an AI hiring platform focused on helping organizations automate recruiting workflows and improve hiring efficiency.",
      bullets: [
        "AI hiring automation",
        "Candidate sourcing",
        "Screening workflows",
        "Interview automation",
        "Hiring productivity",
      ],
      closing:
        "Qureos is particularly relevant for organizations looking to automate parts of the hiring process using AI.",
    },
    featureComparison: [
      { capability: "AI Candidate Discovery", huntlo: "Yes", competitor: "Yes" },
      { capability: "Candidate Sourcing", huntlo: "Yes", competitor: "Yes" },
      { capability: "Candidate Enrichment", huntlo: "Yes", competitor: "Partial" },
      { capability: "Recruiter Outreach", huntlo: "Yes", competitor: "Partial" },
      { capability: "Email Automation", huntlo: "Yes", competitor: "Partial" },
      { capability: "WhatsApp Recruiting", huntlo: "Yes", competitor: "No" },
      { capability: "AI Voice Outreach", huntlo: "Yes", competitor: "No" },
      { capability: "AI Interview Automation", huntlo: "Yes", competitor: "Yes" },
      { capability: "Candidate Engagement", huntlo: "Yes", competitor: "Partial" },
      { capability: "Workflow Automation", huntlo: "Yes", competitor: "Limited" },
      { capability: "Recruiting Analytics", huntlo: "Yes", competitor: "Partial" },
      { capability: "Multi-channel Communication", huntlo: "Yes", competitor: "No" },
    ],
    biggestDifference:
      "Qureos focuses on AI hiring automation and interview-driven recruiting workflows. Huntlo extends beyond hiring automation by combining sourcing, recruiter communication, candidate engagement, outreach automation, AI interviews, and workflow orchestration into one recruiting platform.",
    workflowHuntlo: [
      "Source Talent",
      "Enrich Candidate",
      "Launch Outreach",
      "Candidate Engagement",
      "AI Interview",
      "Hiring Workflow",
      "Placement",
    ],
    workflowCompetitor: [
      "Source Candidate",
      "AI Screening",
      "Interview Workflow",
      "Hiring Evaluation",
      "Selection",
    ],
    workflowNote:
      "Organizations seeking communication and engagement infrastructure may prefer Huntlo. Organizations focused primarily on hiring automation may prefer Qureos.",
    useCases: [
      { useCase: "AI Hiring Automation", recommended: "Qureos" },
      { useCase: "Interview Automation", recommended: "Qureos" },
      { useCase: "Candidate Engagement", recommended: "Huntlo" },
      { useCase: "Recruiter Outreach", recommended: "Huntlo" },
      { useCase: "WhatsApp Recruiting", recommended: "Huntlo" },
      { useCase: "Recruiting Infrastructure", recommended: "Huntlo" },
      { useCase: "Hiring Workflow Automation", recommended: "Both" },
      { useCase: "End-to-End Recruiting Operations", recommended: "Huntlo" },
    ],
    prosHuntlo: [
      "AI sourcing workflows",
      "Multi-channel communication",
      "Candidate engagement infrastructure",
      "Recruiter workflow ownership",
      "AI interview workflows",
      "Recruiting operating system approach",
    ],
    considerationHuntlo: "Broader operational scope than hiring automation-focused platforms.",
    prosCompetitor: [
      "AI hiring automation",
      "Screening workflows",
      "Interview automation",
      "Hiring productivity",
    ],
    considerationCompetitor:
      "Focused more on hiring automation than recruiting communication infrastructure.",
    faq: [
      {
        question: "Does Huntlo support AI interviews?",
        answer:
          "Yes. Huntlo includes AI interview workflows as part of its broader recruiting infrastructure.",
      },
      {
        question: "What is Qureos best known for?",
        answer:
          "Qureos is known for AI hiring automation, screening workflows, and interview-driven recruiting processes.",
      },
      {
        question: "Which platform is better for recruiting agencies?",
        answer:
          "Teams needing sourcing, outreach, engagement, and workflow ownership may prefer Huntlo. Teams focused mainly on hiring automation may find Qureos suitable.",
      },
    ],
    finalVerdict: [
      "Qureos is a strong option for organizations focused on AI hiring automation and interview workflows.",
      "Huntlo takes a broader recruiting infrastructure approach by combining sourcing, candidate engagement, recruiter communication, outreach automation, AI interviews, and workflow orchestration into a single recruiting operating system.",
      "For teams looking to own the entire recruiting workflow—not just hiring automation—Huntlo offers a more comprehensive solution.",
    ],
  }),
];

export const DETAILED_COMPARISON_PAGES = [
  ...LEGACY_COMPARISON_PAGES,
  ...EXTENDED_COMPARISON_PAGES,
];

export function detailedComparisonBySlug(slug: string): DetailedComparisonPage | undefined {
  return DETAILED_COMPARISON_PAGES.find((c) => c.slug === slug.trim());
}

export const DETAILED_COMPARISON_SLUGS = DETAILED_COMPARISON_PAGES.map((c) => c.slug);

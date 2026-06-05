const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const BlogPost = require("../models/BlogPost");

dotenv.config();

const SEED_POSTS = [
  {
    title: "How AI candidate search works on Huntlo",
    slug: "how-ai-candidate-search-works",
    excerpt:
      "Describe who you want to hire in plain English — Huntlo turns your prompt into skills, location, and experience filters, then surfaces matching candidates in seconds.",
    category: "ai-sourcing",
    tags: ["ai sourcing", "candidate search", "recruiting automation"],
    featured: true,
    status: "published",
    publishedAt: new Date("2026-03-01"),
    content: `<p>Traditional job boards wait for applicants. Huntlo flips the model: you describe the hire you need, and AI finds people who match — before you ever post a role.</p>
<h2>Natural-language search</h2>
<p>Type a query like <em>senior backend engineer in Berlin with 5+ years of Node.js</em>. Huntlo extracts roles, skills, location, and experience from your prompt — the same filters recruiters would set manually, without the manual work.</p>
<h2>Preview before you commit</h2>
<p>On the public site you can preview matching candidates instantly. Sign up to unlock contacts, save the search to your dashboard, and run outreach from the same session.</p>
<h2>Built for outbound recruiting</h2>
<p>Search is the first step in Huntlo's hiring OS: source → screen → reach out. Every search becomes a session you can revisit, refine, and turn into a campaign.</p>
<p><strong>Try it:</strong> start from the homepage search bar and see matches in under a minute.</p>`,
  },
  {
    title: "From preview to pipeline: saving your first search after signup",
    slug: "save-search-after-signup",
    excerpt:
      "Searched on the landing page before creating an account? Your results follow you — claim the session after signup and pick up exactly where you left off.",
    category: "product-updates",
    tags: ["signup", "candidate preview", "search history"],
    status: "published",
    publishedAt: new Date("2026-03-05"),
    content: `<p>Many recruiters discover Huntlo through a quick candidate preview on the marketing site. We built a seamless handoff so that work is not lost when you create an account.</p>
<h2>What gets saved</h2>
<p>When you run a public search, Huntlo stores the Future Jobs session id, your prompt, and filter metadata locally. After signup or login, we claim that session and attach it to your user account.</p>
<h2>Where to find it</h2>
<p>Your search appears in <strong>Search history</strong> and opens in <strong>Session Results</strong> with full candidate profiles. Unlock email and phone from there — the same candidates you previewed on the landing page.</p>
<h2>New user onboarding</h2>
<p>If onboarding is required, we still claim the search in the background. When you finish onboarding, you land directly on your session results.</p>`,
  },
  {
    title: "Outbound recruiting with email and WhatsApp campaigns",
    slug: "email-whatsapp-outbound-campaigns",
    excerpt:
      "Turn sourced candidates into conversations. Build multi-step sequences, launch campaigns, and track replies — without leaving Huntlo.",
    category: "outbound-recruiting",
    tags: ["email outreach", "whatsapp", "campaigns"],
    status: "published",
    publishedAt: new Date("2026-03-10"),
    content: `<p>Sourcing alone does not fill roles. Huntlo connects search results to outbound campaigns so recruiters can reach candidates at scale.</p>
<h2>Email sequences</h2>
<p>Attach a Gmail outreach plan to a campaign, add candidates from session results or your pool, and schedule personalized sequences. Track sends, opens, and replies in one workspace.</p>
<h2>WhatsApp outreach</h2>
<p>For markets where WhatsApp drives response rates, switch the campaign channel and use dedicated WhatsApp templates. Interested and not-interested dispositions feed back into your pipeline metrics.</p>
<h2>Credits and quotas</h2>
<p>Outreach uses plan credits transparently — searches, unlocks, and messages are metered so teams can forecast spend. Upgrade when volume grows.</p>`,
  },
  {
    title: "People Scout: find anyone beyond your search session",
    slug: "people-scout-guide",
    excerpt:
      "Already have a LinkedIn profile in mind? People Scout looks up individuals directly and reveals contact details when you are ready to reach out.",
    category: "people-scout",
    tags: ["people scout", "linkedin", "contact reveal"],
    status: "published",
    publishedAt: new Date("2026-03-12"),
    content: `<p>Not every great hire comes from a broad search. Recruiters often start with one name — a referral, a conference speaker, or a competitor's engineering lead.</p>
<h2>Direct lookup</h2>
<p>People Scout accepts a LinkedIn URL and returns structured profile data inside Huntlo. No tab-hopping or copy-paste into spreadsheets.</p>
<h2>Reveal on demand</h2>
<p>Email and phone unlock when you need them, using the same credit model as session candidates. Revealed contacts are cached for your workspace.</p>
<h2>Fits the same workflow</h2>
<p>Add scouted profiles to campaigns, save lists, or compare alongside AI-sourced matches. One platform for proactive and reactive recruiting.</p>`,
  },
  {
    title: "AI recruiting software for staffing firms vs in-house teams",
    slug: "ai-recruiting-staffing-vs-inhouse",
    excerpt:
      "Agencies and internal talent teams share the same sourcing problem — but volume, compliance, and workflow differ. Here is how Huntlo adapts to both.",
    category: "playbooks",
    tags: ["staffing", "in-house recruiting", "ai recruiting"],
    status: "published",
    publishedAt: new Date("2026-03-15"),
    content: `<p>Staffing firms run dozens of reqs in parallel; in-house teams optimize for fewer, deeper searches. Both need speed and quality — with different constraints.</p>
<h2>Staffing firms</h2>
<p>High search volume, multi-client campaigns, and sub-user seats for researchers. Huntlo's plans scale searches and outreach credits; team members share an organization workspace.</p>
<h2>In-house talent teams</h2>
<p>Fewer reqs but stricter employer branding. Use AI search for hard-to-fill roles, then tailored email sequences that sound human — not bulk blasts.</p>
<h2>Shared foundation</h2>
<p>Whether agency or employer, the loop is the same: find → unlock → outreach → track. Huntlo replaces the patchwork of boards, LinkedIn tabs, and spreadsheets with one hiring OS.</p>`,
  },
];

const run = async () => {
  try {
    await connectDB();
    let created = 0;
    let skipped = 0;

    for (const raw of SEED_POSTS) {
      const exists = await BlogPost.exists({ slug: raw.slug });
      if (exists) {
        skipped += 1;
        continue;
      }
      const wordCount = String(raw.content)
        .replace(/<[^>]+>/g, " ")
        .split(/\s+/)
        .filter(Boolean).length;
      await BlogPost.create({
        ...raw,
        authorName: "Huntlo Team",
        readTimeMinutes: Math.max(1, Math.ceil(wordCount / 200)),
        seoTitle: raw.title,
        seoDescription: raw.excerpt,
      });
      created += 1;
    }

    console.log(`Blog posts seeded: ${created} created, ${skipped} skipped (already exist).`);
  } catch (error) {
    console.error("Failed to seed blog posts:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();

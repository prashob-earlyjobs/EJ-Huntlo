const DELIVERS = [
  "Agentic AI candidate sourcing across millions of profiles",
  "Automated outreach via Email, WhatsApp, and LinkedIn workflows",
  "AI Voice Recruiter for candidate screening and qualification",
  "Automated interview scheduling and follow-ups",
  "Candidate enrichment and contact discovery",
  "Collaborative hiring workflows for recruiters and hiring managers",
  "Recruiter network access through EarlyJobs",
  "Analytics, pipeline tracking, and hiring performance insights",
];

const WHO_USES = [
  "Staffing & Recruitment Agencies",
  "Executive Search Firms",
  "RPO Companies",
  "Startups and Scale-ups",
  "Enterprise Talent Acquisition Teams",
  "Global Capability Centers (GCCs)",
  "High-Volume Hiring Organizations",
];

export function AboutPageContent() {
  return (
    <div className="landing-legal-body mt-8">
      <p>
        Built to automate the entire recruitment lifecycle, Huntlo combines Agentic AI candidate
        sourcing, multi-channel outreach, AI-powered screening, interview scheduling, and recruiter
        collaboration into a single platform.
      </p>
      <p>
        Instead of relying on job postings and manual sourcing, Huntlo proactively discovers,
        engages, and qualifies talent through intelligent workflows. Recruiters can source
        candidates using natural language, automate personalized outreach across Email and
        WhatsApp, conduct AI voice screenings, schedule interviews automatically, and manage hiring
        pipelines from one unified system. Huntlo also provides access to the EarlyJobs recruiter
        network, enabling organizations to scale hiring faster across India, the US, the UK, the
        Middle East, and global markets.
      </p>

      <section className="landing-legal-section">
        <h2>What Huntlo Delivers</h2>
        <ul>
          {DELIVERS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="landing-legal-section">
        <h2>Who Uses Huntlo</h2>
        <ul>
          {WHO_USES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="landing-legal-section">
        <h2>Our Mission</h2>
        <p>
          To help organizations hire faster, reduce recruitment costs, and eliminate repetitive
          recruiting tasks through autonomous AI agents—allowing recruiters and hiring managers to
          focus on building relationships and making better hiring decisions.
        </p>
        <p>
          Huntlo is building the future of recruiting where sourcing, outreach, screening, and
          scheduling happen automatically, while humans focus on hiring the right talent.
        </p>
      </section>
    </div>
  );
}

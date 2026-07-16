# Huntlo

Huntlo is an agentic AI recruiting platform that supports the complete hiring workflow:

1. Source candidates using natural-language search and structured filters.
2. Enrich profiles and reveal verified email addresses and phone numbers.
3. Organize candidates into reusable talent pools and lists.
4. Run email, WhatsApp, and AI voice outreach campaigns.
5. Qualify replies and screen candidates with AI.
6. Send Calendly links and manage scheduled interviews.

The repository contains a public marketing website, an authenticated recruiter dashboard, an administration console, and the backend services that execute these workflows.

## Product flow

```text
Marketing site / public candidate search
                  |
                  v
          Signup and onboarding
                  |
                  v
       AI candidate sourcing and filters
                  |
                  v
      Profile enrichment and contact reveal
                  |
                  v
         Candidate pool and saved lists
                  |
        +---------+----------+
        |                    |
        v                    v
 Outreach campaigns     AI screening
 Email / WhatsApp /     Hunar voice calls,
 AI voice sequences     transcripts and results
        |                    |
        +---------+----------+
                  |
                  v
       Qualification and shortlisting
                  |
                  v
      Calendly scheduling and reminders
```

## Main capabilities

### Candidate sourcing

Recruiters can describe an ideal candidate in natural language and refine the search with filters such as:

- Current and previous job titles
- Skills, functions, seniority, and industries
- Country, region, location, and radius
- Current and previous employers
- Experience and tenure
- Education, schools, degrees, and certifications
- Company size, type, funding stage, revenue, and growth
- Languages and open-to-work status
- Employment gaps, frequent job changes, and other profile signals

Candidate search is powered by the Future Jobs API. Huntlo stores each search as a sourcing session and caches candidate details for later use.

The public `/candidates` flow provides a limited candidate preview before signup. After authentication, the pending search can be claimed into the user's dashboard.

### Profile enrichment and contact reveal

Candidate profiles can be enriched with employment history, education, skills, analytics, LinkedIn data, email addresses, and phone numbers.

Contact reveal uses a cache and unlock ledger:

1. If the current user already revealed the contact, it is returned without another charge.
2. If the contact exists in the shared workspace cache, Huntlo records the user's unlock without calling the external provider again.
3. Otherwise, Huntlo requests the contact from Future Jobs and saves it in the shared cache.

Searches and reveals consume plan quotas owned by the workspace billing user.

### Candidate pool

Recruiters can:

- Save candidates from sourcing sessions
- Create named candidate lists
- Search and filter the workspace candidate pool
- Review full candidate profiles
- Reveal contact information
- Move candidates into outreach or screening workflows
- Import candidates from CSV or Excel where supported

### People Scout

People Scout performs direct profile lookup using a LinkedIn URL, LinkedIn username, or email address. The resulting profile can be enriched, revealed, saved, or moved into an outreach campaign.

### Outreach

Huntlo supports email, WhatsApp, and AI voice outreach.

Campaign builders support:

- Single-channel and multi-channel campaigns
- Job and campaign context
- AI-generated or manually written messages
- Opening messages and no-reply follow-ups
- Reply-driven qualification questions
- Configurable wait intervals
- Candidate selection from Huntlo or file imports
- Draft save and resume
- Launch, pause, and resume controls
- Funnel, conversation, interaction, and delivery tracking

Email can be sent through Gmail, Outlook, Zoho Mail, or custom SMTP. WhatsApp can use Meta or Gupshup infrastructure.

### Huntlo 360

Huntlo 360 combines outreach, qualification, screening, and scheduling:

1. Contact candidates by email or WhatsApp.
2. Read and classify candidate replies.
3. Continue qualification using AI-generated responses.
4. Optionally start an AI voice screening call.
5. Send a Calendly link to qualified or interested candidates.
6. Track replies, screening outcomes, and scheduled interviews in one workflow.

### AI voice screening

Voice screening is integrated with Hunar. Recruiters can configure:

- Job description and screening objective
- Call script and questions
- Language and voice tone
- Number of attempts
- Gap between attempts
- Result fields and evaluation criteria

Huntlo creates or updates the Hunar voice agent, starts bulk calls, and receives call status and result webhooks. Screening results can include transcripts, recordings, summaries, scores, extracted variables, and recruiter actions such as shortlist, reject, or schedule.

Video screening UI exists, but voice screening is the fully integrated workflow.

### Interview scheduling

Calendly integration supports:

- Selecting an event or meeting type
- Sending scheduling links by email or WhatsApp
- Automatically sending links after qualification
- Synchronizing campaign and direct-scheduling bookings
- Viewing upcoming interviews
- Configuring interview reminders
- Tracking scheduled candidates and booking status

### Teams and organizations

Account owners can create an organization and invite or create team members. Team members share the owner's plan and quotas. Owners can manage member access, status, permissions, and passwords.

### Plans, quotas, and billing

Pricing plans can control:

- Candidate searches
- Email and mobile reveals
- LinkedIn lookups
- Email and WhatsApp outreach
- AI voice calls
- Maximum sub-users
- Access to product modules

Usage is recorded in user counters and detailed usage/history collections. Billing supports Razorpay and Dodo Payments.

### Admin console

The admin dashboard provides:

- User creation and management
- Plan assignment
- Password reset
- Search and usage analytics
- Quota and plan history
- Global candidate and sourcing visibility
- Outreach trigger monitoring
- Pricing-plan administration
- Blog publishing
- Platform and messaging-channel settings

## Frontend routes

### Public website

- `/` — Main landing page
- `/platform` — Platform overview
- `/pricing` — Pricing plans
- `/sourcing` — Candidate sourcing product page
- `/candidate-pool` — Candidate pool product page
- `/people-scout` — Direct profile lookup product page
- `/screening` — AI screening product page
- `/assessments` — Assessment product page
- `/interview` — Interview management product page
- `/integrations` — Public integrations catalog
- `/candidates` — Public candidate-search preview
- `/solutions/[slug]` — Industry and use-case pages
- `/compare/[slug]` — Product comparison pages
- `/blog` and `/blog/[slug]` — Blog
- `/about`, `/contact`, `/faqs`, `/demo`, `/book-a-demo`
- `/privacy`, `/terms`, `/cookies`, `/security`

### Account

- `/login`
- `/signup`
- `/onboarding`
- `/integrations/outlook/callback`
- `/integrations/zoho/callback`

### Recruiter dashboard

- `/dashboard` — Overview
- `/dashboard/search` — Candidate search
- `/dashboard/search/history` — Search history
- `/dashboard/sessions/:id` — Search results
- `/dashboard/candidates` — Candidate pool
- `/dashboard/saved` — Saved candidates and lists
- `/dashboard/people-scout` — Direct person lookup
- `/dashboard/outreach/...` — Outreach campaigns
- `/dashboard/huntlo-360/...` — Outreach-to-interview workflows
- `/dashboard/screening/...` — Screening
- `/dashboard/schedule/...` — Interview scheduling
- `/dashboard/campaigns/...` — Campaign operations
- `/dashboard/integrations` — Connected services
- `/dashboard/plans` — Plans and usage
- `/dashboard/team` — Team management
- `/dashboard/profile` — Profile and password settings

### Administration

- `/admin/dashboard`

## Backend API areas

All backend APIs are mounted under `/api`.

- `/api/health` — Health check
- `/api/users` — Authentication, profiles, teams, plans, quotas, and admin user management
- `/api/candidates` — Authenticated sourcing, details, reveals, saved candidates, and People Scout
- `/api/public-candidates` — Rate-limited public candidate search
- `/api/campaigns` — Legacy campaign execution and reporting
- `/api/outreach` — Outreach plans, templates, and sequence generation
- `/api/outreach-campaigns` — New outreach module and Huntlo 360 campaigns
- `/api/screenings` — AI screening drafts, launches, results, and actions
- `/api/schedule` — Scheduling, bookings, candidates, and reminders
- `/api/integrations` — Email, WhatsApp, Calendly, and voice integrations
- `/api/pricing-plans` — Public pricing and admin configuration
- `/api/billing` — Razorpay and Dodo checkout flows
- `/api/blog` — Public blog and admin content management
- `/api/platform-settings` — Admin platform settings

## Campaign architecture

Two campaign systems currently coexist.

### Legacy campaign system

The legacy system uses:

- `Campaign`
- `CampaignContact`
- `OutreachPlan`
- `WhatsAppOutreachPlan`
- `CampaignSequenceEnrollment`
- `CampaignOutreachReply`
- `CampaignWhatsAppMessage`
- `CampaignVoiceCall`

It remains active for channel-specific campaign workspaces and execution.

### Outreach module

The newer system uses:

- `OutreachModuleCampaign`
- `OutreachModuleEnrollment`

It powers modern outreach builders, Huntlo 360, and screening. The `sourceModule` value identifies whether a campaign belongs to `outreach`, `screening`, or `huntlo360`.

Both systems are processed by the outreach scheduler.

## Core data model

### Identity and workspace

- `User` — Recruiter/admin account, plan, usage, profile, and organization membership
- `Organization` — Shared recruiting workspace
- `UserSession` — JWT session and revocation record
- `UserIntegration` — Connected email, WhatsApp, and Calendly accounts

### Sourcing and candidates

- `SourcingSession` — Persisted candidate search
- `SourcedCandidateDetail` — Cached candidate profile
- `SavedCandidate` — Saved candidate record
- `SavedCandidateList` — Named candidate list
- `PeopleScoutLookup` — Direct lookup history
- `PeopleScoutRevealedContact` — People Scout contact unlock
- `RevealedContact` — Per-user contact unlock ledger
- `CandidateContactCache` — Shared contact cache

### Campaigns and communication

- `Campaign` and `CampaignContact`
- `OutreachModuleCampaign` and `OutreachModuleEnrollment`
- `CampaignSequenceEnrollment`
- `CampaignOutreachReply`
- `CampaignWhatsAppMessage`
- `CampaignVoiceCall`
- `CampaignCalendlyBooking`

### Plans and analytics

- `PricingPlan` — Plan limits and feature availability
- `UsageHistory` — Metered quota actions
- `UsageEvent` — Detailed sourcing/reveal analytics
- `CreditHistory` — Legacy credit changes
- `PlanHistory` — Plan changes
- `PlanPaymentOrder` — Payment checkout record

## Integrations

Huntlo integrates with:

- Future Jobs — Candidate search, profile details, and contact reveal
- Google Gemini — Prompt annotation, JD extraction, sequence generation, qualification, and AI replies
- Hunar — AI voice agents and bulk screening calls
- Gmail — OAuth email sending and reply synchronization
- Microsoft Outlook / Microsoft 365 — Graph OAuth email
- Zoho Mail — OAuth/SMTP email
- Custom SMTP/IMAP — Custom mailbox support
- Meta WhatsApp Cloud API — WhatsApp sending and inbound webhooks
- Gupshup — Alternative WhatsApp provider
- Calendly — Meeting links, booking synchronization, and webhooks
- Razorpay and Dodo Payments — Plan checkout

## Realtime behavior

The backend attaches a WebSocket server to the HTTP server. The frontend authenticates with its JWT and automatically reconnects when needed.

Important realtime events include:

- `candidates.search.poll` — Progressive candidate-search updates
- `campaign.thread.updated` — Campaign conversation updates

## Technology stack

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Custom dashboard CSS
- TipTap rich-text editor
- Native WebSocket client

### Backend

- Node.js
- Express 5
- MongoDB
- Mongoose 9
- JWT authentication
- bcrypt password hashing
- WebSocket server
- Google Gemini SDK

## Repository structure

```text
.
├── Backend/
│   ├── scripts/
│   ├── src/
│   │   ├── config/
│   │   ├── constants/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── realtime/
│   │   ├── routes/
│   │   ├── seeds/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── Frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
└── README.md
```

## Local development

### Backend

```bash
cd Backend
npm install
cp .env.example .env
npm run dev
```

The API defaults to `http://localhost:5001`.

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Configure `NEXT_PUBLIC_API_URL` in `Frontend/.env` to point to the backend.

## Environment notes

- `APP_ENV` supports `production`, `QA`, and `dev`.
- QA and development allow sub-hour outreach wait intervals for testing.
- WebSocket behavior is controlled through `REALTIME_*` backend variables and `NEXT_PUBLIC_REALTIME_*` frontend variables.
- Do not commit real credentials, API keys, OAuth secrets, JWT secrets, or production database URLs.

## Current implementation notes

- Voice screening is fully integrated; video screening is currently incomplete.
- The legacy campaign system and newer outreach module both remain active.
- Frontend route protection is client-driven, while backend APIs enforce JWT authentication and admin authorization.

# Backend Deep Dive

This document explains the backend architecture of the `Backend` app in depth: runtime bootstrap, module boundaries, business flows, persistence, schedulers, realtime behavior, and all external APIs/services used.

The goal is to make the codebase understandable for:

- new developers onboarding to the project
- maintainers debugging production/QA issues
- engineers extending existing modules
- reviewers who need a system-level view before changing flows

---

## 1. High-Level Overview

The backend is an **Express + MongoDB + WebSocket** application focused on recruiter workflows. At a product level, it supports:

- user auth, workspaces, plans, credits, and billing
- AI-assisted candidate sourcing using Future Jobs
- candidate save/reveal/lookup workflows
- campaign-based outreach across **email**, **WhatsApp**, and **voice**
- recruiter scheduling and Calendly synchronization
- AI-assisted screening and follow-up workflows
- admin-managed pricing, platform settings, and blog content

At a technical level, the backend follows a mostly conventional layering pattern:

- **`routes/`**: HTTP endpoint definitions
- **`controllers/`**: request validation, response formatting, auth/session-aware branching
- **`services/`**: business logic, orchestration, provider adapters, async tasks
- **`models/`**: Mongoose schemas and persistence contracts
- **`middleware/`**: auth, rate-limiting, timing/logging
- **`config/`**: environment-aware bootstrapping and shared runtime configuration
- **`realtime/`**: WebSocket attach/auth/hub/notifications
- **`seeds/` and `scripts/`**: operational and data bootstrap utilities

This is not a microservices architecture. It is a **single deployable Node.js process** that performs:

- HTTP request handling
- realtime websocket communication
- background scheduling via in-process intervals
- third-party webhook handling

Because schedulers and async jobs run **inside the same Node process**, runtime stability of the backend instance matters a lot. There is no separate worker tier, queue processor, or cron service in this repository.

---

## 2. Runtime Bootstrap Flow

The main entrypoint is `src/server.js`.

Actual startup order:

1. `dotenv.config()` loads environment variables.
2. `require("./config/performanceLogging")` patches Mongoose query execution for DB timing.
3. Express app is created by importing `src/app.js`.
4. MongoDB is connected through `src/config/db.js`.
5. global outreach templates are seeded through `seedGlobalTemplates()`.
6. three schedulers are started:
   - campaign outreach scheduler
   - Gmail daily usage reset scheduler
   - schedule reminder scheduler
7. HTTP server is created from Express.
8. WebSocket server is attached to the same HTTP server.
9. server starts listening on `PORT`.

### Why this startup order matters

- **DB before listen**: the app does not accept traffic until MongoDB is ready.
- **instrumentation before imports**: query timing patching happens early so later Mongoose operations are measured.
- **template seeding before normal use**: the app ensures baseline outreach templates exist at startup.
- **schedulers on same runtime**: any deployment restart also restarts all recurring background loops.

---

## 3. Express App Construction

The HTTP app is composed in `src/app.js`.

### Middleware order

The order is important:

1. `morgan("dev")`
2. `requestTiming`
3. `cors(...)`
4. raw-body webhook endpoints
5. `express.json()`
6. `express.urlencoded(...)`
7. static `/uploads`
8. root route
9. `/api` route mounting

### Why raw-body endpoints are mounted early

Two webhook endpoints are mounted **before** JSON parsing:

- `/api/billing/dodo/webhook`
- `/api/integrations/calendly/webhook`

This is necessary because signed webhook verification often requires the **exact raw request body**. If the JSON parser mutates the payload first, signature checks can fail.

### CORS strategy

CORS is driven by `CORS_ORIGINS`, with sensible defaults for:

- localhost
- `dev.huntlo.online`
- `huntlo.online`
- `www.huntlo.online`
- `huntlo.ai`
- `www.huntlo.ai`

This indicates the backend is intended to support both local development and one or more hosted frontend environments.

---

## 4. API Surface and Route Families

All API routes are mounted from `src/routes/index.js` under `/api`.

### Health and basic status

- `GET /api/health`

### Route groups

- `/api/users`
- `/api/candidates`
- `/api/pricing-plans`
- `/api/integrations`
- `/api/outreach`
- `/api/outreach-campaigns`
- `/api/campaigns`
- `/api/platform-settings`
- `/api/billing`
- `/api/public-candidates`
- `/api/blog`
- `/api/screenings`
- `/api/schedule`

This tells us the backend is organized around product capabilities, not around technical abstractions.

---

## 5. Core Architectural Pattern

Most flows follow this shape:

1. **Route** receives the HTTP method/path.
2. **Controller** parses request data and user identity.
3. **Controller** calls one or more **services**.
4. **Service** loads/saves **Mongoose models** and may also call an external provider.
5. **Service** returns domain-level result data.
6. **Controller** converts that result into API JSON.

### Example shape

For a campaign action, the rough path is:

- `routes/campaigns.js`
- `controllers/campaignController.js`
- `services/campaignService.js`
- possibly `campaignOutreachSendService.js`, `campaignReplySyncService.js`, `campaignVoiceLaunchService.js`, etc.
- `models/Campaign.js`, `CampaignSequenceEnrollment.js`, `CampaignContact.js`, `CampaignOutreachReply.js`, and related models

This keeps controllers thinner than the underlying feature complexity, while services hold the orchestration rules.

---

## 6. Authentication, Authorization, and Workspace Scope

Auth is handled by middleware in `src/middleware/auth.js`.

### Authentication flow

- Expects `Authorization: Bearer <jwt>`
- Verifies token using `JWT_SECRET`
- Populates `req.auth`
- Loads additional user/org context for non-admins
- Blocks users whose `memberStatus` is `blocked`

### Authorization patterns in the codebase

The backend appears to use multiple layers of access control:

- **JWT auth** for most private routes
- **role-based admin checks** using `requireAdmin`
- **organization or owner scoping** inside service/controller logic
- **public-only endpoints** for landing page candidate preview/search

### Important implication

Many business rules are not enforced only at the route level. They are also enforced inside services by:

- checking owner or org scope
- checking plan or credit availability
- checking integration ownership
- checking campaign ownership

This is a common and sensible pattern because many actions are multi-step and cross-document.

---

## 7. Data Layer and Persistence Model

MongoDB is accessed through Mongoose. The schema layer is rich and domain-oriented.

The backend is not using a relational-style service boundary. Instead, flows are centered on **document aggregates** such as:

- user/workspace
- sourcing session
- campaign
- outreach campaign
- integration
- schedule candidate

### Data modeling style

There are two recurring patterns:

- **document-centric aggregates** for unified feature objects
- **normalized supporting collections** for scale-sensitive sub-entities

#### Examples

- `Campaign` contains campaign-level metadata
- `CampaignContact` stores contacts separately instead of keeping all contacts embedded
- `CampaignSequenceEnrollment` stores per-contact sequence progress separately
- `OutreachModuleCampaign` acts like a large aggregate document for newer outreach workflows

This shows the codebase has evolved over time:

- some older modules began with embedded data patterns
- newer flows moved toward separate collections for scale, pagination, and job processing

---

## 8. Major Domain Areas

The backend is easiest to understand as a collection of major product domains.

### 8.1 Users, Sessions, Organizations, Plans, and Usage

Relevant models:

- `User`
- `UserSession`
- `Organization`
- `CreditHistory`
- `UsageHistory`
- `UsageEvent`
- `PlanHistory`
- `PlanPaymentOrder`

Relevant controllers/services:

- `controllers/userController.js`
- `services/organizationService.js`
- `services/planQuotas.js`
- `services/planSubscriptionService.js`
- `services/outreachCreditsService.js`
- `services/voiceCallCreditsService.js`

#### Primary responsibilities

- register/login users
- issue JWTs
- persist user sessions
- support team/workspace behavior
- manage plans, credits, and plan-change history
- enforce usage limits on paid and quota-based features

#### Observed architecture insight

Plans and credits are not a cosmetic layer; they are woven into core execution paths:

- candidate reveal limits
- outreach eligibility
- voice or AI feature usage
- billing fulfillment

This means any future feature likely needs quota/plan integration to stay consistent with the rest of the platform.

---

### 8.2 Candidate Sourcing and Search

Relevant routes/controllers/services:

- `routes/candidates.js`
- `controllers/candidateController.js`
- `services/futureJobs/*`
- `services/publicCandidateSearchService.js`
- `services/heroPromptCheckService.js`

Relevant models:

- `SourcingSession`
- `SourcedCandidateDetail`
- `SavedCandidate`
- `SavedCandidateList`

#### What this domain does

This domain powers recruiter search and sourcing. It appears to use **Future Jobs** as the primary external candidate sourcing/search provider.

#### Core private search flow

1. authenticated user submits search inputs
2. backend shapes payload for Future Jobs
3. backend creates or continues a sourcing session against Future Jobs
4. backend polls or retrieves candidate data
5. mapped candidate data is persisted locally in `SourcingSession` and related records
6. realtime progress can be emitted to the frontend
7. final results are returned and optionally saved/claimed/listed

#### Why `SourcingSession` matters

`SourcingSession` is an important bridge model because it stores:

- the input/filter context
- external provider session linkage
- returned candidate previews
- internal traceability for later actions

It acts like a backend memory object for a sourcing workflow.

#### Public search flow

There is a separate public-facing flow under `/api/public-candidates`.

This flow differs from the private one in a few important ways:

- no account auth requirement
- rate limiting is enforced in memory
- response is limited to preview-oriented behavior
- likely used for the marketing/landing experience

That means the product has two sourcing modes:

- **product usage mode** for authenticated recruiters
- **acquisition/demo mode** for unauthenticated visitors

---

### 8.3 Candidate Save, Reveal, and People Scout

Relevant services/models:

- `contactRevealService.js`
- `bulkRevealService.js`
- `peopleScoutLookupService.js`
- `RevealedContact`
- `CandidateContactCache`
- `PeopleScoutLookup`
- `PeopleScoutRevealedContact`

#### Functional purpose

Once candidates are sourced, users need:

- contact reveal
- contact caching
- repeated lookups without duplicate cost
- list persistence

#### Reveal flow

At a high level:

1. user requests reveal for a candidate/contact
2. backend checks plan/quota constraints
3. backend looks for cached or previously revealed data
4. backend may call external provider if needed
5. backend persists reveal result
6. usage event/history is recorded

#### People Scout flow

People Scout appears to be a more specialized lookup/reveal path with cache-first behavior:

- same-user cache
- shared cache clone or reuse
- external lookup only if cache miss
- usage charging only when appropriate

This is a good sign architecturally because it attempts to reduce:

- repeated provider cost
- duplicate latency
- unnecessary user charges

---

### 8.4 Legacy Campaigns

Relevant routes/controllers/services:

- `routes/campaigns.js`
- `controllers/campaignController.js`
- `services/campaignService.js`
- `services/campaignOutreachSendService.js`
- `services/campaignReplySyncService.js`
- `services/campaignAutoReplyService.js`
- `services/campaignRevealJobService.js`
- `services/campaignVoiceLaunchService.js`
- `services/campaignVoiceCommsService.js`
- `services/campaignCalendlyBookingService.js`

Relevant models:

- `Campaign`
- `CampaignContact`
- `CampaignSequenceEnrollment`
- `CampaignOutreachReply`
- `CampaignWhatsAppMessage`
- `CampaignWhatsAppThreadRead`
- `CampaignRevealJob`
- `CampaignCalendlyBooking`
- `CampaignVoiceCall`

#### Why this is called “legacy” here

The codebase clearly has two outreach/campaign systems:

- `campaigns`
- `outreach-campaigns`

The `campaigns` module appears to be the older, highly capable outreach engine, with normalized side collections around it.

#### Main responsibilities

- campaign CRUD
- campaign contact management
- reveal jobs for campaign candidates
- launch/pause/resume outreach
- sync replies
- AI reply automation
- WhatsApp thread management
- voice call activity
- Calendly-linked booking behavior

#### Contact design evolution

There is a strong signal of architectural evolution here:

- old version stored campaign contacts embedded on the campaign document
- new version uses `CampaignContact`
- there is even a smoke test for migration/behavior in `scripts/test-campaign-contacts.js`

This means maintainers should treat campaign contact storage as a **migrated/compatibility-aware area**.

#### Sequence enrollment model

`CampaignSequenceEnrollment` is a crucial workflow model. It likely tracks:

- which candidate is in which campaign
- which step is due or completed
- whether a reply was received
- whether sending should continue
- scheduling details for the next send

This collection is the real operational state machine for outreach progression.

---

### 8.5 Newer Outreach Module Campaigns

Relevant routes/controllers/services:

- `routes/outreachModuleCampaigns.js`
- `controllers/outreachModuleCampaignController.js`
- `services/outreachModuleCampaignService.js`
- `services/outreachModuleSendService.js`
- `services/outreachModuleCandidatePoolService.js`
- `services/outreachModuleAutoReplyService.js`
- `services/outreachModuleVoiceService.js`

Relevant models:

- `OutreachModuleCampaign`
- `OutreachModuleEnrollment`

#### Design difference from legacy campaigns

This newer system appears to move toward a more unified product model where a single large campaign document contains:

- builder state
- candidates or candidate mappings
- channel configuration
- sequence step definitions
- stats/tracking fields
- post-qualification configuration

Compared with legacy campaigns, this feels more like a **product workflow builder** than a thin shell around several separate collections.

#### Likely product intent

This module appears designed for:

- richer frontend campaign-building UX
- unified tracking
- cross-channel interaction models
- modern campaign lifecycle operations

#### Interaction types

The system supports more than just send events. It models interactions such as:

- email
- WhatsApp
- voice
- note
- action

This suggests the outreach module is trying to be the system of record for recruiter-candidate engagement state.

---

### 8.6 Outreach Plans, Templates, and AI Generation

Relevant routes/services:

- `routes/outreach.js`
- `outreachPlanService.js`
- `whatsappOutreachPlanService.js`
- `savedOutreachPlanService.js`
- `outreachTemplateService.js`
- `outreachAiService.js`
- `geminiService.js`

Relevant models:

- `OutreachPlan`
- `WhatsAppOutreachPlan`
- `OutreachTemplate`

#### What this layer does

This domain handles the reusable configuration side of outreach:

- multi-step plans
- WhatsApp-specific plans
- template storage
- AI-generated sequence content

#### Architectural role

This is a **configuration and generation layer** that feeds operational campaign systems.

In other words:

- outreach plans define *what should be sent*
- campaign enrollments define *who gets what and when*
- send services define *how the message is actually delivered*

That separation is useful and should be preserved.

---

### 8.7 Integrations

Relevant route/controller/service:

- `routes/integrations.js`
- `controllers/integrationController.js`
- `services/integrationService.js`

Key supporting services:

- Gmail OAuth/send/read services
- Outlook OAuth/send/read services
- Zoho OAuth/send/read/SMTP services
- custom SMTP/IMAP services
- WhatsApp config/send/webhook services
- Calendly client/service

Relevant model:

- `UserIntegration`

#### Why `UserIntegration` is central

This model appears to be the canonical persistence layer for external connectivity. It likely stores:

- provider type
- tokens or credentials
- account identifiers
- sender identity
- connection status
- usage counters for Gmail send limits

#### Supported mail providers

- Gmail
- Outlook / Microsoft 365
- Zoho Mail
- custom SMTP

#### Supported messaging/scheduling providers

- Meta WhatsApp Cloud API
- Gupshup
- Huntlo-managed WhatsApp mode
- Calendly

#### Important design insight

The backend does not appear to expose a single abstract “mail provider” with zero provider differences. Instead, it uses:

- shared orchestration patterns
- provider-specific adapters
- provider-specific config and auth services

That is practical because send/read/auth behavior differs significantly across these providers.

---

### 8.8 Screening

Relevant route/controller/services:

- `routes/screenings.js`
- `controllers/screeningController.js`
- `services/screeningService.js`
- `services/voiceJdExtractService.js`
- `services/voiceAgentPromptService.js`

#### Functional purpose

Screening is built on top of campaign/voice infrastructure rather than being a totally separate platform subsystem.

The backend appears to support:

- screening drafts
- AI-generated question or variable preparation
- launch/pause workflow
- candidate result tracking
- outcome-based recommendations

#### Architectural significance

This is a good example of **capability composition**:

- outreach/campaign data structures
- voice provider integration
- AI prompt generation
- candidate action tracking

are combined into a specialized recruiter workflow called screening.

---

### 8.9 Scheduling and Calendly

Relevant route/controller/services:

- `routes/schedule.js`
- `controllers/scheduleController.js`
- `services/scheduleService.js`
- `services/scheduleLinkDeliveryService.js`
- `services/scheduleReminderService.js`
- `services/campaignCalendlyBookingService.js`

Relevant models:

- `ScheduleCandidate`
- `CampaignCalendlyBooking`
- `ScheduleReminderSettings`
- `ScheduleReminderLog`

#### What this domain covers

- scheduling overview
- sync of bookings/events
- scheduling candidate records
- send-link flows
- reminder settings and reminder logs

#### Main business pattern

This module bridges:

- recruiter-managed scheduling workflows
- campaign-linked booking flows
- external Calendly state

It is not just “call Calendly and display bookings.” It maintains local state for recruiter actions and reminders.

---

### 8.10 Billing, Pricing, Platform Settings, and Blog

Relevant routes/services/models:

- `routes/billing.js`
- `billingController.js`
- `planPaymentService.js`
- `razorpayService.js`
- `dodoPaymentsService.js`
- `dodoWebhookService.js`
- `PricingPlan`
- `PlanPaymentOrder`
- `PlanHistory`
- `PlatformSettings`
- `BlogPost`

#### Billing purpose

This domain monetizes plan upgrades and keeps plan/payment state consistent after provider events.

#### Pricing behavior

There is evidence of:

- admin-configurable pricing plan records
- fallback constants for legacy pricing behavior
- currency-aware plan purchase checks

That means pricing is partially data-driven but still preserves legacy fallback logic.

#### Platform settings purpose

`PlatformSettings` appears to hold admin-managed switches or values that affect runtime behavior elsewhere, especially messaging/provider choices.

#### Blog module purpose

The blog module is comparatively simple:

- public content read
- admin CRUD
- seed support for initial content

It is a content management slice inside the same backend.

---

## 9. External APIs and Services Used

This backend integrates with several external systems. Each one has a distinct product role.

### 9.1 Future Jobs

Used for:

- candidate sourcing/search
- sourcing sessions
- profile retrieval
- candidate reveal or lookup related operations
- People Scout-related flows
- autocomplete/search assistance

This is one of the most foundational external dependencies in the system.

### 9.2 Google Gemini / Vertex-style AI integration

Used for:

- outreach AI generation
- hero prompt validation
- JD extraction
- screening/voice prompt generation
- candidate-response or qualification intelligence
- possibly auto-reply assistance

The package dependency has moved to `@google/genai`, which suggests the codebase is standardizing on Google’s newer SDK surface.

### 9.3 Gmail

Used for:

- OAuth account connection
- sending recruiter outreach email
- reading inbox replies for reply sync
- tracking daily send usage

This integration is central for email campaign functionality.

### 9.4 Outlook / Microsoft Graph

Used for:

- OAuth account connection
- sending mail
- reading replies/inbox state

### 9.5 Zoho Mail

Used for:

- OAuth-based connection
- SMTP/app-password-based sending
- reading or syncing mailbox data

### 9.6 Custom SMTP + IMAP

Used for:

- generic mailbox sending
- generic mailbox reading via IMAP

The presence of `imapflow` indicates the backend now supports deeper read/sync behavior for custom mailboxes.

### 9.7 Meta WhatsApp Cloud API

Used for:

- template and message sending
- inbound webhook handling
- delivery/status tracking

### 9.8 Gupshup

Used for:

- alternative WhatsApp sending
- inbound and delivery webhook handling

### 9.9 Huntlo-managed WhatsApp mode

Used when the platform provides a server-side WhatsApp account rather than relying only on user-owned provider credentials.

### 9.10 Calendly

Used for:

- event type access
- booking sync
- recruiter scheduling workflows
- signed webhook-based booking updates

### 9.11 Hunar AI Voice

Used for:

- outbound AI voice calls
- voice screening
- call result/status updates via webhook

### 9.12 Razorpay

Used for:

- INR plan checkout/payment flows

### 9.13 Dodo Payments

Used for:

- USD/global checkout
- webhook-driven payment fulfillment

---

## 10. Email Delivery and Reply Architecture

Email is not implemented as a single file or single provider. It is a subsystem.

### Main email layers

- provider auth/config services
- provider send services
- provider read services
- orchestration services that choose the right provider
- campaign reply sync services
- AI auto-reply services

### Conceptual send flow

1. campaign or outreach module decides a send is due
2. orchestration resolves sender integration for the user/org
3. provider-specific send service is selected
4. outbound message is sent
5. send metadata is saved to campaign or interaction state
6. scheduler later syncs replies
7. reply may pause further sequence steps
8. optional AI auto-reply may run

### Why reply sync matters

Outbound automation without reply awareness is dangerous. The backend handles this by storing and syncing replies so it can:

- stop or pause messaging after candidate reply
- update the recruiter UI
- trigger AI follow-up logic
- keep thread state accurate

---

## 11. WhatsApp Architecture

WhatsApp support spans multiple services and provider modes.

### Supported operating modes

- Meta Cloud API
- Gupshup
- Huntlo-managed account mode

### WhatsApp lifecycle in the backend

1. campaign decides a WhatsApp touchpoint is due
2. send service resolves which provider/account mode to use
3. message or template is sent
4. outbound message is recorded
5. provider webhook receives inbound replies and status callbacks
6. backend updates thread state and delivery state
7. optional AI qualification logic may process candidate responses

### Design observation

The backend treats WhatsApp as more than a send-only feature. It has conversation-thread and qualification semantics, which makes it closer to a mini CRM interaction channel.

---

## 12. Voice Call Architecture

Voice functionality is implemented around Hunar AI.

### Main responsibilities

- preparing or launching outbound calls
- storing call context and status
- receiving webhook updates
- connecting call results back into campaign/screening state

### Voice as part of larger recruiter workflow

Voice is not isolated. It participates in:

- campaign outreach
- screening workflows
- post-call qualification or recommendation logic

That means voice changes should be reviewed for downstream impact on campaign tracking and screening outcomes.

---

## 13. Scheduling, Reminder, and Booking Flow

Scheduling has both direct and campaign-linked behavior.

### Common flow

1. candidate or campaign reaches scheduling stage
2. recruiter sends or exposes Calendly scheduling link
3. candidate books meeting in Calendly
4. backend syncs or receives webhook event
5. local booking record is updated
6. reminder settings determine whether reminders should be sent
7. reminder logs are stored for traceability

### Why local persistence matters

Calendly is the external booking authority, but the product still needs local state for:

- recruiter dashboard display
- reminder execution
- campaign attribution
- historical logs

---

## 14. Realtime / WebSocket System

Realtime is implemented using `ws`, not Socket.IO.

### Key characteristics

- attached to the same HTTP server
- JWT-based auth through query parameters
- user-centric connection registry
- heartbeat/ping-pong support
- event push to one or more sockets per user

### Known realtime event families

- `realtime.connected`
- `campaign.thread.updated`
- `candidates.search.poll`

### Where realtime is used

- candidate sourcing poll/progress updates
- campaign reply/thread updates
- WhatsApp inbound activity
- AI reply or comms-related updates
- voice communication status changes

### Architectural implication

Realtime is used selectively for **progressive UX** on high-latency or conversation-heavy workflows. It is not a universal event bus for the whole app.

---

## 15. Background Jobs and Scheduler Design

The backend uses **in-process schedulers**, not a dedicated queue or job framework.

### Startup schedulers

- campaign outreach scheduler
- Gmail daily usage reset scheduler
- schedule reminder scheduler

### Additional async behavior

The codebase also uses `setImmediate` for certain follow-up work such as:

- reveal jobs
- deferred syncs
- campaign tracking tasks

### Strengths of this design

- simple deployment model
- no extra infra like Redis required
- easy local development

### Trade-offs of this design

- jobs stop when the app process stops
- multiple replicas could create duplicated scheduler behavior unless guarded carefully
- long-running job reliability is lower than a proper queue/worker architecture
- operational observability depends heavily on logs and DB state

### Practical maintenance advice

If the app scales to multiple instances or needs stronger job guarantees, this is the area most likely to need architectural evolution first.

---

## 16. Performance Logging and Observability

The backend has built-in request and DB timing instrumentation.

### Request timing

`requestTiming` middleware appears to collect:

- request duration
- possibly request id
- accumulated DB query count/time per request

### DB timing

`src/config/performanceLogging.js` patches:

- `mongoose.Query.prototype.exec`
- `mongoose.Aggregate.prototype.exec`
- schema `save` hooks

This records:

- collection
- operation
- duration
- slow-query detection
- request correlation where available

### Why this matters

This is a valuable feature because major product flows involve:

- provider calls
- many DB lookups
- async state updates
- campaign/scheduler loops

When performance issues appear, these timing logs are a first-class diagnostic tool.

---

## 17. Environment Variables and Configuration Groups

The `.env.example` file shows the major configuration domains.

### Core runtime

- `PORT`
- `MONGODB_URI`
- `CORS_ORIGINS`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `APP_ENV`

### Performance logging

- `API_TIMING_LOG`
- `DB_QUERY_LOG`
- `DB_SLOW_QUERY_MS`

### Realtime

- `REALTIME_ENABLED`
- `REALTIME_WS_PATH`
- `REALTIME_PING_MS`

### Future Jobs

- `FUTURE_JOBS_API_URL`
- `FUTURE_JOBS_API_KEY`
- `FUTURE_JOBS_AUTH_STYLE`

### Google / AI

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GCP_CREDENTIALS_JSON`
- optional Gemini model/location/project overrides

### Calendly

- `CALENDLY_WEBHOOK_SIGNING_KEY`

### Zoho

- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_OAUTH_REDIRECT_URI`

### Microsoft / Outlook

- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_OAUTH_REDIRECT_URI`
- `MICROSOFT_TENANT_ID`

### WhatsApp / Meta / platform messaging

- `META_GRAPH_API_VERSION`
- `META_WHATSAPP_TEMPLATE_LANGUAGE`
- `META_WEBHOOK_VERIFY_TOKEN`
- `DEFAULT_PHONE_COUNTRY_CODE`
- `PUBLIC_API_BASE_URL`
- Huntlo-managed WhatsApp creds
- Gupshup creds

### Voice

- `HUNAR_VOICE_API_KEY`
- `HUNAR_VOICE_PERSONA`
- `HUNAR_VOICE_LANGUAGE`

### Billing

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `DODO_PAYMENTS_API_KEY`
- `DODO_PAYMENTS_WEBHOOK_KEY`
- `DODO_PAYMENTS_ENVIRONMENT`
- Dodo product ids
- `FRONTEND_URL`

### Outreach automation toggles

- `OUTREACH_AUTO_REPLY_ENABLED`
- `OUTREACH_AUTO_REPLY_MAX`
- `OUTREACH_WHATSAPP_AI_ENABLED`

### Operational significance

The environment surface is large, which is expected for a backend that integrates many providers. This also means configuration drift can easily become a production issue. Strong environment management is essential.

---

## 18. Webhook Architecture

Several critical flows depend on inbound webhooks.

### Billing webhooks

- Dodo payment completion/verification path

### Scheduling webhooks

- Calendly booking events

### Messaging webhooks

- Meta WhatsApp verify/inbound/status
- Gupshup inbound/status/delivery

### Voice webhooks

- Hunar voice result/status callbacks

### Why webhooks are central

These flows allow the backend to keep local state aligned with provider state without constant polling. They are especially important for:

- delivery status
- inbound messages
- bookings
- voice outcomes
- payment completion

---

## 19. Seeds, Startup Data, and Operational Scripts

The backend includes lightweight data bootstrap and operational scripts.

### Seed commands

- `npm run seed:users`
- `npm run seed:outreach-templates`
- `npm run seed:blog-posts`

### Startup data behavior

Outreach templates are also seeded on server startup, which means the system expects a baseline catalog to exist for normal operation.

### Operational smoke test

There is a notable script:

- `scripts/test-campaign-contacts.js`

This validates:

- adding contacts to normalized `CampaignContact`
- duplicate skipping
- pagination/counting
- migration from embedded contacts to separate collection

This script is especially useful because it documents an important historical transition in the campaign subsystem.

---

## 20. Architectural Strengths

The current backend has several strong qualities.

### Good domain separation

Even though it is one deployable service, features are grouped into understandable route/controller/service/model families.

### Real product depth

The backend is not a thin CRUD app. It models real recruiter workflows across sourcing, outreach, scheduling, payments, and AI.

### Practical provider abstraction

Different mail and messaging providers are handled with shared orchestration plus provider-specific adapters, which is more realistic than forcing everything through an oversimplified abstraction.

### Strong workflow state modeling

Collections like `CampaignSequenceEnrollment`, `CampaignContact`, `CampaignOutreachReply`, `OutreachModuleEnrollment`, and `CampaignCalendlyBooking` indicate the system keeps real operational state rather than treating integrations as stateless passthroughs.

### Built-in observability hooks

Request/DB timing instrumentation is already present, which is a meaningful operational advantage.

---

## 21. Architectural Risks and Maintenance Hotspots

These are the areas most likely to need extra care.

### Single-process scheduler model

As traffic and background work grow, in-process scheduling can become fragile.

### Dual campaign systems

There are both:

- legacy `campaigns`
- newer `outreach-campaigns`

This creates product and maintenance complexity. Developers must be careful to understand which campaign system a feature belongs to before editing it.

### Large services/controllers

Some modules, especially candidate and campaign areas, are broad orchestration zones. Changes there may have side effects across:

- quota usage
- realtime notifications
- provider sends
- sequence state
- analytics/history

### Broad env surface

Many providers and toggles mean environment configuration can be a failure source almost as often as code changes.

### Provider-coupled business logic

The code correctly integrates deeply with providers, but that also means provider behavior changes can ripple through business workflows.

---

## 22. Recommended Mental Model for New Developers

If you are new to this backend, the best mental model is:

- **users and plans** decide who can do what
- **integrations** decide through which external accounts actions happen
- **sourcing** finds candidates
- **reveal/lookup** enriches candidate contactability
- **campaigns/outreach** operationalize communication
- **schedule/calendly** operationalize interviews
- **billing/pricing** governs monetization and access
- **AI services** improve generation, validation, and qualification quality
- **realtime** improves UX for long-running and conversation-heavy flows
- **schedulers** keep asynchronous automation moving

---

## 23. Suggested Reading Order in the Codebase

For anyone trying to understand the backend by code, this is the most useful reading sequence:

1. `src/server.js`
2. `src/app.js`
3. `src/routes/index.js`
4. `src/middleware/auth.js`
5. `src/config/db.js`
6. `src/models/UserIntegration.js`
7. `src/controllers/candidateController.js`
8. `src/controllers/campaignController.js`
9. `src/controllers/outreachModuleCampaignController.js`
10. `src/controllers/integrationController.js`
11. `src/services/campaignOutreachSendService.js`
12. `src/services/campaignReplySyncService.js`
13. `src/services/outreachModuleSendService.js`
14. `src/services/integrationService.js`
15. `src/services/futureJobs/*`
16. `src/services/scheduleService.js`
17. `src/realtime/*`

That path moves from infrastructure to user-facing core workflows.

---

## 24. Final Summary

This backend is a **workflow-heavy recruiter operations platform backend** built as a single Node.js service.

Its defining characteristics are:

- MongoDB-backed domain state
- provider-rich integration surface
- two generations of outreach/campaign systems
- strong reliance on async workflow state
- in-process schedulers instead of external workers
- selective realtime UX for long-running and thread-based flows
- AI features woven into sourcing, outreach, and screening

If you are extending the backend, the most important rule is:

**Always trace a feature across route -> controller -> service -> model -> external provider -> scheduler/realtime side effects before making changes.**

In this codebase, most important product features are not implemented in one place; they are implemented as coordinated flows across several layers.

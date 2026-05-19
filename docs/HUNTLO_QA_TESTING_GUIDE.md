# Huntlo — QA Testing Guide

**Product:** Huntlo (recruitment / talent sourcing platform)  
**Audience:** Manual testers, QA engineers  
**Last updated:** May 2026

This document describes end-to-end flows, expected behaviour, test accounts, and edge cases. Use it as the primary reference for functional testing.

---

## Table of contents

1. [Environment setup](#1-environment-setup)
2. [Test accounts](#2-test-accounts)
3. [Application map](#3-application-map)
4. [Authentication & roles](#4-authentication--roles)
5. [Onboarding (new users)](#5-onboarding-new-users)
6. [User dashboard — overview](#6-user-dashboard--overview)
7. [Search Candidates (sourcing)](#7-search-candidates-sourcing)
8. [Session results](#8-session-results)
9. [Search history](#9-search-history)
10. [Candidate pool](#10-candidate-pool)
11. [Saved candidates](#11-saved-candidates)
12. [People Scout](#12-people-scout)
13. [Contact reveal (email & phone)](#13-contact-reveal-email--phone)
14. [Plans, pricing & quotas](#14-plans-pricing--quotas)
15. [My Profile](#15-my-profile)
16. [Integrations](#16-integrations)
17. [Admin panel](#17-admin-panel)
18. [Analytics (admin)](#18-analytics-admin)
19. [API reference (quick)](#19-api-reference-quick)
20. [Test scenarios checklist](#20-test-scenarios-checklist)
21. [Known limitations](#21-known-limitations)

---

## 1. Environment setup

### Prerequisites

| Component | Requirement |
|-----------|-------------|
| MongoDB | Running locally or remote URI in backend `.env` |
| Node.js | LTS recommended |
| Future Jobs API | Valid `FUTURE_JOBS_API_KEY` in backend `.env` (required for real searches, lookups, and contact reveal) |

### Default URLs

| Service | URL |
|---------|-----|
| Frontend (dev) | `http://localhost:3000` |
| Backend API | `http://localhost:5001` |
| API base path | `/api` |

### Start locally

```bash
# Terminal 1 — Backend
cd Backend
cp .env.example .env   # if not already done
# Set MONGODB_URI, JWT_SECRET, FUTURE_JOBS_API_KEY
npm install
npm run dev

# Terminal 2 — Frontend
cd Frontend
# Optional: NEXT_PUBLIC_API_URL=http://localhost:5001
npm install
npm run dev

# Optional — seed test users
cd Backend
npm run seed:users
```

### Frontend environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend URL (defaults to `http://localhost:5001`) |

### Backend environment (key variables)

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `5001`) |
| `MONGODB_URI` | Database connection |
| `JWT_SECRET` | Auth token signing |
| `CORS_ORIGINS` | Allowed browser origins |
| `FUTURE_JOBS_API_URL` | Upstream sourcing API |
| `FUTURE_JOBS_API_KEY` | Upstream API key |

### Health check

- Open `http://localhost:5001/` — should return JSON welcome message.
- Log in on the frontend — network calls should go to `{API_URL}/api/...`.

---

## 2. Test accounts

After running `npm run seed:users` in `Backend`:

| Email | Password | Role | Notes |
|-------|----------|------|-------|
| `rahul.verma@ejhunter.com` | `Password@123` | **Admin** | Admin panel access; skips onboarding |
| `ananya.iyer@ejhunter.com` | `Password@123` | **User** | Standard recruiter flow |
| `vikram.sinha@ejhunter.com` | `Password@123` | **User** | Second user for cross-user cache tests |

Admins can also **create users** from Admin → Users → Create User.

For **cross-user contact cache** tests, use two different user accounts on the same machine (or incognito + normal window).

---

## 3. Application map

### Public pages

| Route | Description |
|-------|-------------|
| `/` | Marketing landing page, pricing tiers, signup/login links |
| `/login` | Email + password login |
| `/signup` | Self-service registration |

### Authenticated — regular user

| Route | Description |
|-------|-------------|
| `/onboarding` | First-time setup wizard (users only, until completed) |
| `/dashboard` | Main workspace (all recruiter features) |
| `/dashboard/results/[sessionId]` | Alternate session results URL (main flow uses in-dashboard tab) |

### Authenticated — admin

| Route | Description |
|-------|-------------|
| `/admin/dashboard` | Admin workspace |

### Redirect rules

| Situation | Redirect |
|-----------|----------|
| Not logged in → protected page | `/login` |
| User logged in, onboarding incomplete | `/onboarding` |
| User logged in, onboarding complete | `/dashboard` |
| Admin logged in | `/admin/dashboard` |
| Non-admin opens admin URL | `/dashboard` |

---

## 4. Authentication & roles

### Registration (`/signup`)

**Steps:**

1. Open `/signup`.
2. Fill: full name, company name, mobile, email, password, confirm password.
3. Submit.

**Expected:**

- Success → logged in (token in browser storage) → redirect to onboarding (user) or admin dashboard (admin if created as admin).
- Validation errors for missing fields, password mismatch, weak password, duplicate email.

### Login (`/login`)

**Steps:**

1. Open `/login`.
2. Enter email and password.
3. Submit.

**Expected:**

- Success → session stored → redirect per role/onboarding state.
- Wrong password → error message, stay on login.

### Logout

**Steps:** Dashboard or Admin → **Logout**.

**Expected:** Session cleared; redirect to login; protected routes require login again.

### Roles

| Role | Capabilities |
|------|----------------|
| **user** | Full recruiter dashboard; must complete onboarding once |
| **admin** | Admin panel + can open user dashboard via link; skips onboarding |

### Session storage

- Auth is stored in browser `localStorage` under key `authUser` (includes JWT).
- Clearing site data logs the user out.

---

## 5. Onboarding (new users)

**Who:** Users with `onboardingCompleted: false` (not admins).

**Route:** `/onboarding`

| Step | Content | Validation |
|------|---------|------------|
| 1 | Welcome | Continue |
| 2 | Company type (single select) | Agency, Startup, Enterprise/GCC, Staffing, Executive search |
| 3 | Hiring challenges (multi-select) | At least one recommended |
| 4 | Outreach channels (multi-select) | WhatsApp, Email, LinkedIn, Calls, SMS |
| 5 | Hiring volume (single select) | e.g. 1–5, 5–20, 20–100, 100+ roles |

**Expected on completion:**

- Redirect to `/dashboard`.
- User does not see onboarding again on next login.

**Test:** Register a new user → complete all steps → land on dashboard.

---

## 6. User dashboard — overview

**Route:** `/dashboard`  
**Sidebar sections:**

| Tab | Status | Purpose |
|-----|--------|---------|
| **Dashboard** | Live | Plan summary, quota meters, quick stats, recent searches |
| **Search Candidates** | Live | AI-powered candidate search (sourcing sessions) |
| **Search history** | Live | List and reopen past sourcing sessions |
| **Candidate pool** | Live | All sourced profiles across sessions |
| **Saved** | Live | Shortlisted candidates and custom lists |
| **People Scout** | Live | Single-profile lookup by email or LinkedIn |
| **Integrations** | UI mock | Gmail, WhatsApp, Calendar (Enterprise-gated UI) |
| **Plans and pricing** | Live | Current plan, limits, usage history |
| **My Profile** | Live | Profile, photo, password (footer nav) |

**Session Results** opens automatically after a search; it is not a permanent sidebar item.

---

## 7. Search Candidates (sourcing)

Primary flow for finding multiple candidates via natural language + filters.

### Flow A — Main path (annotate → apply)

| Step | User action | Quota impact |
|------|-------------|--------------|
| 1 | Go to **Search Candidates** | — |
| 2 | Enter a search prompt (e.g. “Senior React developer in Bangalore, 5+ years”) | — |
| 3 | Submit / search | Opens **filter drawer** |
| 4 | Backend annotates prompt → prefills filters | **No quota** |
| 5 | Review/adjust filters (job title, skills, location, experience, etc.) | — |
| 6 | Click **Apply** | **−1 search** (`candidateSearches`) |
| 7 | Wait for session creation + profile fetch (~30s delay before first batch) | — |
| 8 | View results in **Session Results** tab | — |

### Filter drawer (high level)

Testers should verify:

- **Search type** defaults to **Flexible** (no empty “—” option).
- Skills can be mandatory / core / secondary.
- Job titles, location, company, education, seniority, industry, red-flag toggles.
- Applying with empty optional fields should not cause server **422** errors.

### Flow B — Reopen from history

1. **Search history** → click a session.  
2. **Expected:** Session Results loads with stored profiles (no new search quota if only reopening).

### What consumes search quota

| Action | Consumes search? |
|--------|------------------|
| Annotate only | No |
| Apply filters (create session + fetch) | Yes |
| Reopen existing session from history | No (typically) |

### Errors to verify

| Case | Expected |
|------|----------|
| Quota exhausted | Message / 403 `QUOTA_EXCEEDED` |
| Invalid filters | Clear validation error (not generic 500) |
| Future Jobs API down / invalid key | Error message; no silent success |

---

## 8. Session results

Opened after **Apply** on Search Candidates or from **Search history**.

### Per candidate card

| Action | Description | Quota |
|--------|-------------|-------|
| Open detail | Drawer with full profile, highlights, score | — |
| **Save** | Add to Saved / list | **−1 candidate unlock** |
| **Reveal email** | Show verified email | See [§13](#13-contact-reveal-email--phone) |
| **Reveal phone** | Show mobile number | See [§13](#13-contact-reveal-email--phone) |
| **View more** | Load additional profiles for session | — |

### Save behaviour

- Saving the same candidate twice should not double-charge unlock quota (idempotent where implemented).
- Saved candidates appear under **Saved** tab.

### Reveal behaviour

- Email and phone start hidden until reveal succeeds.
- Failed reveal (not found) → error message; **no quota** for not found.
- Same user revealing again → no second charge.

---

## 9. Search history

**Tab:** Search history

**Expected:**

- Lists past sourcing sessions (prompt, date, status, candidate count).
- Clicking a row reopens **Session Results** for that session.
- Recent searches may also appear on the Dashboard / Search Candidates entry area.

---

## 10. Candidate pool

**Tab:** Candidate pool (sidebar label)

**Expected:**

- Paginated table of **all** candidates the user has sourced (all sessions).
- Text search and optional **session filter**.
- Columns: name, role, location, skills, contact state, etc.
- Reveal email/phone from pool where supported (same rules as session results).

**Admin equivalent:** Admin → **Candidate pool** — same data **across all users**, with user and session filters.

---

## 11. Saved candidates

**Tab:** Saved

### Features

| Feature | Steps | Quota |
|---------|-------|-------|
| View saved list | Open Saved tab | — |
| Filter by list | Select a custom list or “general” | — |
| Create list | Add new save list | — |
| Save from results | Save on session card → pick list | **−1 candidate unlock** (first save) |
| Unsave | Remove from saved | — |

**Test:**

1. Save a candidate from Session Results.
2. Confirm appearance under Saved.
3. Assign to a custom list and filter by that list.

---

## 12. People Scout

**Tab:** People Scout  
**Purpose:** Look up **one** person by email **or** LinkedIn URL.

### Lookup flow

| Step | Action | Quota |
|------|--------|-------|
| 1 | Enter email **or** LinkedIn URL in the search field | — |
| 2 | Submit | See lookup rules below |
| 3 | Profile drawer opens with summary (name, title, company, LinkedIn, etc.) | — |
| 4 | Reveal email / Reveal phone | See [§13](#13-contact-reveal-email--phone) |

### Input validation

| Input | Rule |
|-------|------|
| Email | Valid email format |
| LinkedIn | URL contains `linkedin.com` or `lnkd.in` |
| Both at once | Not allowed in one request |

### Lookup quota rules (`linkedinLookups` — shares **searches** plan limit)

| Source | Future Jobs called? | Charged? |
|--------|---------------------|----------|
| Same user looked up this query before (valid profile in DB) | No | No |
| Another user’s cached lookup | No | **Yes** |
| Not in DB → Future Jobs | Yes | **Yes** only if profile found |
| Profile not found | Yes (attempted) | **No** |

### Recent lookups

- Recent cards shown on People Scout tab.
- Click to reopen profile without a new lookup (same user cache).

### Error cases

| Case | Expected |
|------|----------|
| Not found | 404-style message; no search quota consumed |
| Reveal without lookup | UI should require lookup first |
| Quota exceeded | Block with clear message |

---

## 13. Contact reveal (email & phone)

Applies to **Search Candidates / Session Results / Candidate pool** and **People Scout**.

### Resolution order (backend)

1. **Same user (user cache)** — User already unlocked this LinkedIn + type → show contact, **no charge**, no Future Jobs call.
2. **Shared DB (shared cache)** — Another user unlocked it before → show contact, **charge this user**, no Future Jobs call.
3. **Future Jobs** — Call upstream → if found: store + **charge**; if not found: **no charge**.

### API response fields (for API testers)

```json
{
  "success": true,
  "source": "user_cache | shared_cache | futurejobs",
  "charged": true,
  "found": true,
  "revealType": "EMAIL | PHONE",
  "values": ["..."],
  "value": "..."
}
```

Not found example:

```json
{
  "success": false,
  "found": false,
  "charged": false,
  "source": "futurejobs",
  "message": "Contact not found"
}
```

### Quota keys

| Reveal type | Plan quota field |
|-------------|------------------|
| Email | `emailUnveils` |
| Phone | `mobileUnveils` |

### Cross-user test script

1. **User A** reveals email for candidate X → charged, contact visible.
2. **User B** reveals same LinkedIn email → **shared_cache**, charged, contact visible.
3. **User A** reveals again → **user_cache**, **not** charged.

### Sourcing-specific

- Requires valid `sourcingSessionId` owned by the user.
- Wrong session → 403.

---

## 14. Plans, pricing & quotas

### Plan tiers (default limits — admin can edit)

| Plan | Searches* | Candidate unlocks | Verified emails | Phone numbers |
|------|-----------|-------------------|-----------------|---------------|
| Starter | 300 | 100 | 100 | 100 |
| Growth | 1500 | 700 | 350 | 120 |
| Enterprise | 10000 | 4000 | 2000 | 800 |

\***Searches** = candidate sourcing searches **+** People Scout lookups (combined).

### What consumes plan quota

| User action | Quota counter |
|-------------|---------------|
| Apply search / create sourcing session | `candidateSearches` |
| People Scout lookup (when charged) | `linkedinLookups` |
| Save candidate | `candidateUnveils` |
| Reveal email (when charged) | `emailUnveils` |
| Reveal phone (when charged) | `mobileUnveils` |

### What does NOT consume quota

- Filter annotation only
- Same-user cache hit (lookup or reveal)
- Lookup/reveal when profile or contact **not found**
- Re-opening session from history (no new apply)

### Quota exceeded

- HTTP **403**, code `QUOTA_EXCEEDED`
- UI should show a clear message naming the limit type

### Plans and pricing tab (user)

- Current plan name and limits
- Remaining / used meters per activity type
- Paginated **plan quota usage history** (charged events only)

### Landing page pricing

- Public tiers from `GET /api/pricing-plans` (no login required)

---

## 15. My Profile

**Access:** Footer nav → **My Profile**

| Feature | Test steps | Expected |
|---------|------------|----------|
| View profile | Open tab | Name, email, company, phone, location |
| Edit profile | Change fields → save | Persists after refresh |
| Profile photo | Upload image | Photo displays in header/profile |
| Remove photo | Delete photo | Reverts to default/initials |
| Change password | Current + new + confirm | Success; other sessions may be revoked |
| Wrong current password | Submit | Error, no change |

---

## 16. Integrations

**Tab:** Integrations  
**Status:** **UI mock** — not connected to real Gmail/WhatsApp/Calendar APIs.

**Expected:**

- Visible on **Enterprise** plan (or locked on lower plans with upgrade messaging).
- Toggling “connect” may persist in `localStorage` only (`ejhunter_integrations_connected`).
- No backend integration sync to verify.

**Tester note:** Do not file bugs for missing real email/WhatsApp send — out of scope unless marked live in release notes.

---

## 17. Admin panel

**Route:** `/admin/dashboard`  
**Access:** `role: admin` only

### Sidebar

| Tab | Status |
|-----|--------|
| Overview | Placeholder |
| **Users** | Live |
| **Analytics** | Live |
| **Candidate pool** | Live (all users) |
| **Plans & pricing** | Live |
| Settings | Placeholder |

### Users tab

| Action | Steps | Expected |
|--------|-------|----------|
| List users | Open Users | Table: name, email, role, plan |
| Create user | + Create User → fill form → submit | New user can log in |
| Manage user | Manage on a row | Modal: change plan, quotas, per-user analytics, histories |

**Create user fields:** full name, company, mobile, email, password, role (user/admin), plan.

**Manage user modal includes:**

- Plan assignment (dropdown → Save plan)
- Plan quota remaining / limit table
- Usage analytics by source (per user)
- Plan quota usage history
- Plan assignment history

### Candidate pool (admin)

- All candidates across **all users**
- Filter by user, sourcing session, search text
- Pagination

### Plans & pricing (admin)

- Edit marketing intro and tier cards (prices, quotas, feature bullets, “popular” badge)
- Save → changes reflect on landing page and user Plans tab

---

## 18. Analytics (admin)

**Tab:** Analytics

### Section 1 — Usage analytics by source

Breakdown for:

- People Scout lookup
- Email unveil
- Phone unveil

Columns:

| Column | Meaning |
|--------|---------|
| Same user (DB) | Served from this user’s prior unlock/lookup — typically free |
| Shared DB | Served from another user’s cached data — credit charged |
| Future Jobs | Live upstream call — credit if found |
| Not found | Attempted but no profile/contact — no credit |
| Total | Event count |
| Credits | Count of **charged** events |

Filter: **All users** or a specific user.

> **Note:** Analytics events are recorded from deployment of the UsageEvent feature onward. Older activity may not appear.

### Section 2 — Plan quota usage history

- Chronological log when users **consume plan quota** (searches, unveils, saves).
- Filter by user.
- Each row: timestamp, user, activity type, units (−1).

---

## 19. API reference (quick)

**Base:** `{API_URL}/api`  
**Auth header:** `Authorization: Bearer <token>`

### Auth

| Method | Path | Auth |
|--------|------|------|
| POST | `/users/register` | No |
| POST | `/users/login` | No |
| POST | `/users/logout` | Yes |
| GET | `/users/me` | Yes |
| PATCH | `/users/me/onboarding` | Yes |

### Sourcing

| Method | Path |
|--------|------|
| POST | `/candidates/search/annotate` |
| POST | `/candidates/search/apply` |
| GET | `/candidates/sessions` |
| GET | `/candidates/session/:sessionId/profiles` |
| GET | `/candidates/all` |
| POST | `/candidates/reveal-contact` |

### People Scout

| Method | Path |
|--------|------|
| POST | `/candidates/scout-people/lookup` |
| POST | `/candidates/scout-people/reveal-contact` |
| GET | `/candidates/scout-people/recent` |

### Saved

| Method | Path |
|--------|------|
| GET/POST | `/candidates/saved` |
| DELETE | `/candidates/saved` |
| GET/POST | `/candidates/save-lists` |

### Admin

| Method | Path |
|--------|------|
| GET | `/users/` |
| POST | `/users/admin/create` |
| PATCH | `/users/:id/plan` |
| GET | `/users/admin/usage-analytics/summary` |
| GET | `/users/admin/utilisation/history` |
| GET | `/candidates/admin/all` |
| PUT | `/pricing-plans` |

---

## 20. Test scenarios checklist

### Smoke — new user

- [ ] Register → onboarding (5 steps) → dashboard
- [ ] Search Candidates: prompt → annotate → apply → see results
- [ ] Save one candidate → appears in Saved
- [ ] Reveal email on one candidate
- [ ] People Scout lookup by LinkedIn → reveal phone
- [ ] Plans tab shows updated usage

### Smoke — admin

- [ ] Login as admin → admin dashboard
- [ ] Create a new user with Growth plan
- [ ] Analytics: summary loads; filter by user
- [ ] Edit a pricing tier → visible on landing page
- [ ] Candidate pool: filter by user

### Quota

- [ ] Exhaust searches on Starter → next apply blocked with clear error
- [ ] Annotate still works when searches exhausted (if UI allows opening drawer)
- [ ] People Scout not-found does not reduce search quota

### Contact cache (two users)

- [ ] User A reveals email → charged
- [ ] User B same LinkedIn → charged, contact shown
- [ ] User A again → not charged

### People Scout cache

- [ ] User A lookup by email → charged (if new)
- [ ] User A same email again → not charged
- [ ] User B same email → charged (shared cache)

### Regression — filters

- [ ] Apply with minimal filters (no skills) → no 422
- [ ] Search type defaults to Flexible
- [ ] Comma-separated job titles handled

### Security / access

- [ ] Non-admin cannot access `/admin/dashboard`
- [ ] Logged-out user redirected from `/dashboard`
- [ ] User cannot reveal contact on another user’s sourcing session

---

## 21. Known limitations

| Item | Detail |
|------|--------|
| Future Jobs dependency | Searches, profiles, and contact reveal require valid API key and upstream availability |
| Session create delay | ~30 seconds wait after session create before first profile batch |
| Analytics history | Only events after UsageEvent logging was deployed |
| Integrations tab | Mock UI only |
| Overview / Settings (admin) | Placeholder screens |
| Legacy `User.credits` field | Not used for plan quota enforcement; plan utilisation counters are authoritative |
| `User.credits` admin PATCH | Exists for legacy/admin balance; separate from plan quotas |

---

## Appendix — Browser storage keys

| Key | Purpose |
|-----|---------|
| `authUser` | Login session + JWT |
| `ejhunter_dashboard_sidebar_collapsed` | Sidebar UI state |
| `ejhunter_save_target_list_id` | Default list for saves |
| `ejhunter_integrations_connected` | Mock integration toggles |

---

## Appendix — Reporting bugs

Include when filing issues:

1. **Environment** (local / dev / prod URL)
2. **Account** (email, role, plan)
3. **Steps to reproduce**
4. **Expected vs actual**
5. **Screenshot or network tab** (API status + response body for `/api/...` calls)
6. **Timestamp** (for analytics / usage history correlation)

---

*End of document*

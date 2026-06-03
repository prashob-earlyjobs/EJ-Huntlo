# Email campaign flow — simple guide

This guide explains how **email (Gmail) campaigns** work in Huntlo: adding people, limits, launch, and daily sending.  
**WhatsApp campaigns are different** — they do not use email reveal or the 200-emails-per-day rule.

---

## Quick summary

| Step | What happens |
|------|----------------|
| 1. Add candidates | Up to **200 per campaign** (portal or CSV). **No emails revealed yet.** |
| 2. Launch campaign | Emails/phones are **revealed**, then people **with email** join the sequence. |
| 3. Sending | Gmail sends from your connected account, within **200 emails per day** (shared across all your running email campaigns). |
| 4. Midnight | Daily send counter **resets**; you can launch or send again the next day. |

---

## Step 1 — Add candidates

You can add people in two ways (only **before** the campaign is launched).

### A. From the portal (Session Results)

1. Run a search and open **Session Results**.
2. Select one or more candidates (checkboxes).
3. Click **Add to campaign**.
4. Pick an existing campaign or **Create new campaign**.

### B. From CSV (Campaign workspace)

1. Open the campaign → **Contacts** (or empty state).
2. Click **Import CSV**.
3. Use the required columns from the sample file.
4. Click **Import**.

### Rules when adding (email campaigns)

- **Maximum 200 contacts per campaign** (total in that campaign, not per day).
- If the campaign already has contacts, you can only add as many as **fit in the remaining slots**  
  (example: 180 already in the campaign → only **20** more allowed).
- If you try to add too many at once (e.g. CSV with 250 rows into an empty campaign), the import is **blocked** with:  
  **“Maximum 200 contacts per campaign.”**
- Adding contacts does **not**:
  - Reveal email or phone
  - Use your **200 emails/day** Gmail limit
  - Start sending emails

> **After launch:** you cannot add more contacts to that campaign.

---

## Step 2 — Launch campaign

When you click **Launch campaign** (email sequence / Gmail):

### What runs automatically

1. **Reveal** — The system tries to find **email and phone** for contacts that are still missing them (using LinkedIn + session data where available).
2. **Daily limit check** — Counts how many contacts have a **valid email** and checks your **Gmail daily budget** (see below).
3. **Enroll** — Only contacts **with a valid email** are enrolled in the email sequence.
4. **Reserve daily slots** — Each enrolled contact uses **one slot** from today’s **200 emails/day** for your connected Gmail account.
5. **Sending starts** — Scheduled emails go out according to your sequence (subject to the daily cap).

### Contacts without email at launch

- They stay on the campaign list but are **not enrolled** (no emails sent to them).
- They **do not** count toward today’s **200/day** limit.
- Example: **200** in the campaign, **100** get email after reveal → **100** enrolled, **100** skipped for now.

### Per-campaign limit at launch

- You cannot launch if the campaign has **more than 200 contacts** in total.
- You cannot launch if **no contact has an email** after reveal (fix data or wait for reveal to finish).

---

## Step 3 — Daily Gmail limit (200 emails / day)

This applies to **email campaigns only**, per **connected Gmail account** (your integration).

### What “200 per day” means

- Your Gmail integration can drive up to **200 sequence emails per day**, **shared across all active email campaigns** you launched that day.
- The limit is based on contacts **enrolled with email at launch**, not the raw number you added.

### Examples

**One campaign**

| Added | After reveal (have email) | Reserved today | Can send today (approx.) |
|-------|---------------------------|----------------|---------------------------|
| 200 | 100 | 100 | Up to 100 from this campaign (+ room for others) |
| 150 | 150 | 150 | 150 |
| 200 | 200 | 200 | 200 (full day for this account) |

**Two campaigns (same Gmail, same day)**

| Campaign | Enrolled (have email) | Running total reserved |
|----------|------------------------|-------------------------|
| A | 100 | 100 |
| B | 100 | 200 ✅ (both can run) |
| A | 150 | 150 |
| B | 100 | Would need 250 ❌ **B cannot launch** until tomorrow or A uses fewer slots |

**Not launched yet**

| Campaign A | Campaign B | Uses daily 200? |
|------------|------------|-----------------|
| 196 added, not launched | 200 added, not launched | **No** — limit applies only when you **launch** |

### When the limit resets

- Counters reset at **midnight** (timezone: server setting, default UTC; can be configured).
- After reset, you get a fresh **200** for that Gmail account for the new day.

### If you hit the limit while sending

- Further Gmail sends for that day may stop until the reset.
- Already-launched campaigns are not “un-launched”; sending resumes after reset if enrollments are still active.

---

## Step 4 — Multiple email campaigns

- You **can** run **more than one email campaign at the same time**, as long as the **sum of enrolled emails (at launch)** for that day is **≤ 200**.
- You are **not** limited to “only one campaign at a time” for email (unlike an older rule).
- Each campaign still has its own **200 contacts max** on the list.

---

## Simple flow diagram

```
┌─────────────────────────────────────────────────────────────┐
│  ADD CANDIDATES (portal or CSV)                             │
│  • Max 200 per campaign                                     │
│  • No reveal, no daily 200 used yet                         │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  LAUNCH EMAIL CAMPAIGN                                        │
│  1. Reveal email/phone                                        │
│  2. Check: enrollable emails ≤ remaining daily 200            │
│  3. Enroll contacts WITH email only                           │
│  4. Reserve daily slots (= enrolled count)                    │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  SEND SEQUENCE (Gmail)                                        │
│  • Up to 200 sends/day per Gmail integration (all campaigns)  │
│  • Resets at midnight                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Common questions

**Q: I added 200 people but only 80 got email after launch. How much of my daily 200 is used?**  
**A:** **80** (only enrolled contacts with email count), not 200. The rest are on the list but not in the sequence until they have email (and you’d need a way to enroll them later — launch does not auto-re-enroll skipped contacts).

**Q: Can I launch two campaigns with 200 + 200 contacts the same day?**  
**A:** Only if **enrolled emails** total ≤ 200 (e.g. 100 + 100). Otherwise the second launch is blocked.

**Q: Does adding 196 to campaign A and 200 to campaign B use my daily 200?**  
**A:** **No**, until you **launch**. After launch, each uses slots based on **how many had email when launched**.

**Q: Is WhatsApp the same?**  
**A:** **No.** WhatsApp has the **200 contacts per campaign** cap when adding, but **no** email reveal on launch and **no** 200-emails-per-day Gmail limit.

---

## Requirements checklist (email)

- [ ] **Enterprise** plan (for campaigns)
- [ ] **Gmail** connected under Integrations
- [ ] Outreach **sequence** saved on the campaign
- [ ] Contacts added (≤ 200 per campaign)
- [ ] **Launch** when ready — reveal + enroll + daily check run here

---

## Related limits (reference)

| Limit | Value | When it applies |
|-------|--------|------------------|
| Contacts per campaign | 200 | Add / CSV / create |
| Gmail sends per day | 200 | Launch + sending (per Gmail integration) |
| Email reveal | On launch only | Email campaigns |
| Add contacts after launch | Not allowed | Email & WhatsApp |

---

*Last updated to match product behavior: email reveal on launch, shared 200/day Gmail cap, parallel email campaigns allowed within daily budget, WhatsApp excluded from email-specific rules.*

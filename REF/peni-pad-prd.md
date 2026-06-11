# Peni Pad — Product Requirements Document

| | |
|---|---|
| **Product** | Peni Pad (working title, pending trademark/store search) |
| **Version** | PRD v1.1 — all open questions resolved |
| **Author** | Jack (Product Owner) / drafted with Claude |
| **Date** | June 2026 |
| **Status** | Approved for Phase 1 planning |
| **Prototype** | Single-file HTML proof of concept (PDF render + ink layer) — validated |

**Brand note:** "Peni" honors Peniel, the founder's son and the inspiration for the product. The founding story — a developer-dad in Ghana building for his own child — is an asset for brand voice, store listing copy, and press. Action item before store submission: trademark and store-name availability search, plus a written-form readability check on the final mark.

---

## 1. Executive Summary

Peni Pad turns any printable worksheet PDF into a finger-paintable activity for children aged 3–8. A parent or teacher opens a worksheet — an addition sheet, a maze, a tracing page — and the child writes, draws, and colors directly on it with a crayon-like touch experience designed for small hands.

The product occupies a gap between three adjacent markets, none of which serves this use case. PDF annotation tools (Notability, Kami, PDF Expert) handle the document side but present adult-grade interfaces a preschooler cannot operate. Teacher worksheet platforms (Liveworksheets, TeacherMade, BookWidgets) digitize worksheets but replace handwriting with typed answers, drag-and-drop, and multiple choice inside an LMS-shaped experience. Kids' handwriting apps (Writing Wizard, Keiki) nail the child UX but are closed content libraries — users cannot bring their own material.

The wedge is **bring-your-own-worksheet + kid-grade ink**. The printable worksheet ecosystem (Teachers Pay Teachers, Twinkl, Learning Resources, school-issued packets) is enormous and currently dead-ends at a printer. Peni Pad makes that entire corpus interactive without the content owner, the teacher, or the parent doing any conversion work.

The product ships in four phases: an offline-first PWA MVP, cloud accounts and child profiles, an activity-intelligence layer (answer zones, auto-checking, path validation), and native distribution with monetization.

---

## 2. Problem Statement

Parents and teachers have unlimited access to high-quality printable activities but face three friction points. Printing is impractical (no printer at hand, cost, waste, travel situations). Paper is single-use, while the same maze or addition sheet could be replayed dozens of times digitally. Existing digital options force a bad trade: either an adult tool the child can't drive, or a closed app that ignores the worksheet the parent already has.

Children, meanwhile, are highly motivated by touch-screen drawing but most "educational" drawing apps are either content-locked or engagement-farms. There is no neutral canvas that makes *the adult's chosen content* the activity.

**Job to be done (parent):** "Keep my child productively engaged with the learning material I chose, on the tablet we already have, in under 30 seconds of setup."

**Job to be done (teacher):** "Reuse my existing worksheet library digitally without rebuilding it in an authoring tool."

**Job to be done (child):** "Color and scribble with something that feels like a real crayon, and feel proud of the result."

---

## 3. Goals and Non-Goals

### Goals

1. Sub-30-second path from "open app" to "child is drawing on a worksheet."
2. Ink that feels delightful to a 4-year-old: chunky, colorful, forgiving, zero-latency.
3. Work fully offline after first load (cars, flights, waiting rooms, low-connectivity regions).
4. Preserve children's work and let parents revisit and share it.
5. Strict child-safety posture: COPPA/GDPR-K compliant, no ads, no external links reachable by the child, no child PII collected.
6. A foundation (vector ink, zone model) that supports auto-checking and richer activity types in later phases without re-architecture.

### Non-Goals

- Not a worksheet *marketplace* or content library at launch (Phase 4 consideration only).
- Not an LMS: no assignments, grading workflows, or rosters before Phase 4 classroom mode.
- Not a general note-taking or adult annotation app.
- Not a handwriting *instruction* app (no enforced letter-tracing pedagogy); we host activities, we don't author curriculum.
- No social features of any kind for children.

---

## 4. Personas

**Ama, 34 — Parent (primary buyer).** Two kids (4 and 7), one shared Android tablet. Downloads free printables from Pinterest and Twinkl but rarely prints them. Wants screen time she doesn't feel guilty about. Pays for 2–3 kids' subscriptions already; churns fast when an app shows ads or nags.

**Kofi, 5 — Child (primary user).** Pre-reader. Navigates by icon, color, and habit. Rests his palm on the screen while drawing. Will tap everything once. Gets frustrated when an app "loses" his picture.

**Esi, 29 — Teacher (secondary, Phase 4 focus).** Teaches KG2 with a classroom tablet cart. Has a folder of hundreds of PDFs accumulated over years. School uses Google Classroom. Will not pay personally; her school might.

---

## 5. Competitive Landscape (summary)

| Category | Examples | What they have | What they lack |
|---|---|---|---|
| PDF annotation | Notability, Kami, PDF Expert, Xodo | Robust PDF + ink engines | Kid-operable UI; child safety posture; play feel |
| Worksheet converters | Liveworksheets, TeacherMade, BookWidgets | PDF upload, answer fields, auto-grading | Handwriting/coloring as the input; child-first UX; offline |
| Kids writing/drawing | Writing Wizard, Keiki, Drawing Pad | Excellent kid UX, rewards | Bring-your-own-content; PDF support |

**Positioning statement:** *For parents and teachers with their own worksheet PDFs, Peni Pad is the only kid-first app that turns any printable into a crayon-ready digital activity — no conversion, no content lock-in.*

---

## 6. Product Principles

1. **The worksheet is the hero.** UI recedes; the page fills the screen. No chrome competes with content.
2. **Crayon physics over feature count.** One delightful tool beats ten mediocre ones. Latency budget: ink must appear within one frame of touch.
3. **Two zones, two audiences.** Everything a child needs lives in the bottom tray with ≥56 px targets and no text dependence. Everything consequential (open, delete, settings, purchase) lives behind a parental gate.
4. **Never lose a drawing.** Autosave is continuous and invisible. There is no "save" concept for the child.
5. **Offline is the default, sync is the bonus.**
6. **Privacy by architecture.** Collect nothing about the child that the product doesn't strictly need — which is nothing.

---

## 7. Release Phases Overview

| Phase | Name | Theme | Target |
|---|---|---|---|
| 1 | MVP — "The Magic Crayon" | Offline PWA, local-only, core ink + PDF | 6–8 weeks |
| 2 | "The Fridge Door" | Accounts, sync, profiles, gallery, rewards | +6 weeks |
| 3 | "The Smart Worksheet" | Answer zones, auto-check, path validation, authoring | +8–10 weeks |
| 4 | "The Schoolbag" | Native wrap, stores, monetization, classroom, partnerships | +8 weeks |

Timelines assume a single senior full-stack developer (Jack) at meaningful but part-time capacity; compress accordingly if full-time.

---

## 8. Phase 1 — MVP: "The Magic Crayon"

**Objective:** Validate that real families repeatedly choose Peni Pad over printing. Ship the smallest product that a parent would describe to a friend.

**Release definition:** Installable PWA, fully offline-capable, local persistence. No accounts, no backend writes.

### 8.1 Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| F1.1 | Import PDF via file picker, drag-and-drop (desktop), and OS share-target (PWA share_target manifest) | Must |
| F1.2 | Import images (JPG/PNG) as single-page activities — many "worksheets" circulate as photos | Must |
| F1.3 | Render PDF pages via pdf.js at ≥2× devicePixelRatio with progressive loading; first page interactive < 2 s on a mid-range tablet | Must |
| F1.4 | Ink engine: crayon, marker, eraser tools; 8-color palette; 3 brush sizes; undo (≥50 steps); clear page with confirm | Must |
| F1.5 | Strokes stored as vectors in normalized page coordinates; survive resize, rotation, and app restart | Must |
| F1.6 | Continuous autosave of strokes + imported documents to IndexedDB; reopening the app restores the last activity exactly | Must |
| F1.7 | Library ("Shelf"): grid of imported activities with auto-generated cover thumbnails, kid-tappable to reopen | Must |
| F1.8 | Multi-page navigation with per-page ink state | Must |
| F1.9 | Export current page (worksheet + ink flattened) as PNG; export full activity as annotated PDF | Should |
| F1.10 | Parental gate (e.g., "hold for 3 seconds" + simple multiplication) protecting: import, delete, export, settings | Must |
| F1.11 | Palm rejection: track first active pointer only; ignore touch contacts above a radius threshold where the platform reports it; "wrist guard" toggle in settings | Must |
| F1.12 | Sticker reward moment on page completion (child taps a big "Done!" star → confetti + sticker added to the page corner) — manual, no correctness logic yet | Should |
| F1.13 | Built-in starter pack: 5–8 original activities (addition, maze, tracing, coloring) generated in-house so first-run works with zero content | Must |
| F1.14 | Fullscreen / kiosk feel: PWA display standalone, screen-wake lock while drawing, orientation support both ways | Should |
| F1.15 | Basic settings: left/right-handed tray flip, sound on/off, reduced motion | Could |

### 8.2 Non-Functional Requirements

| ID | Requirement |
|---|---|
| N1.1 | Ink latency ≤ 16 ms added over platform touch latency; use coalesced + predicted pointer events where available |
| N1.2 | Device strategy — **Hybrid (tablet-first, phone-supported)**: tablets are the flagship experience; phones get a fully functional simplified mode — landscape orientation encouraged on first open, drawing enabled, basic two-finger pan + pinch-zoom (one-finger input always inks, two-finger gestures always navigate; no mode switch a child must understand). Targets: iPad Safari (iOS 16+), Android Chrome (Android 10+) including low-RAM Android phones, desktop Chrome/Edge/Safari. Both layouts are first-class citizens of the device test matrix |
| N1.2a | Phone zoom UX is deliberately basic in Phase 1; the refined solution (tap-an-answer-zone to auto-zoom) is deferred to Phase 3 where zone geometry makes it free (see F3.9) |
| N1.3 | Offline: full functionality after first load via service worker precache; PDF worker bundled, no runtime CDN dependency |
| N1.4 | Storage: handle ≥200 MB of local documents gracefully; warn (parent zone) at quota pressure; never silently drop a child's work |
| N1.5 | No analytics SDK with child-directed data; privacy-respecting, COPPA-safe telemetry only (aggregate, no identifiers) or none in MVP |
| N1.6 | Accessibility: visible focus states, WCAG AA contrast in parent zones, reduced-motion respected, all child controls icon-first |
| N1.7 | All processing on-device in MVP: uploaded PDFs never leave the device |

### 8.3 Out of Scope for MVP

Accounts, sync, multiple child profiles, handwriting recognition, answer checking, in-app purchases, native store builds, sharing links.

### 8.4 MVP Success Criteria

- ≥40% of testing families use the app on 3+ distinct days in week one (replay behavior).
- Median time from app open to first stroke < 30 s on first run, < 10 s on return visits.
- ≥60% of imported activities are user-supplied PDFs (validates BYO-content thesis vs. starter pack reliance).
- Zero data-loss reports.

---

## 9. Phase 2 — "The Fridge Door"

**Objective:** Retention and multi-device life. Children's finished work becomes a durable, growing gallery parents are proud of — the digital fridge door.

### 9.1 Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| F2.1 | Parent accounts (email magic-link + OAuth) via Supabase Auth; account creation and login live strictly behind the parental gate | Must |
| F2.2 | Child profiles under one account: name/avatar only (avatar from built-in set; no photos). Per-profile shelf, ink, stickers | Must |
| F2.3 | Cloud sync of documents, strokes, and gallery via Supabase (Postgres + Storage); offline-first with background sync and conflict policy: last-writer-wins per page, never destructive merge of strokes | Must |
| F2.4 | Gallery: chronological wall of completed pages per child; parent can favorite, download, delete | Must |
| F2.5 | Share a finished page as image via OS share sheet (parent gate) — no public links in this phase | Should |
| F2.6 | Sticker book: stickers earned per completed page accumulate in a per-child collection. **Decision (Q3): purely cosmetic — nothing unlocks, ever.** No gated content, tools, or features behind sticker counts; the collection exists only as a keepsake. This is a deliberate anti-manipulation stance and a store-review asset | Should |
| F2.7 | Parent dashboard (web): activity history per child — pages completed, time spent ranges, most-used activities. Framed as celebration, not surveillance; no per-minute tracking | Should |
| F2.8 | Storage quotas per plan tier (groundwork for Phase 4 monetization), generous free tier | Must |
| F2.9 | Account deletion: one action erases all account + children data (server and instructs local wipe) within statutory windows | Must |

### 9.2 Non-Functional Requirements

| ID | Requirement |
|---|---|
| N2.1 | COPPA / GDPR-K review completed before launch: verifiable parental consent flow for account features; child data minimization documented; DPA with Supabase confirmed |
| N2.2 | Row-Level Security on every table; per-account storage isolation; signed URLs with short TTL for documents |
| N2.3 | Sync conflict tests across 3 devices; no stroke loss in airplane-mode round-trips |
| N2.4 | P95 sync round-trip < 5 s on 3G-class connections; uploads chunked and resumable |

### 9.3 Success Criteria

- ≥50% of weekly-active families create an account within 2 weeks of feature availability.
- Week-4 retention of account holders ≥ 2× anonymous users.
- Gallery viewed by parent ≥1×/week for ≥30% of accounts.

---

## 10. Phase 3 — "The Smart Worksheet"

**Objective:** Differentiation moat. The same PDF becomes a *self-aware* activity: it knows where answers go and can gently confirm them. This is the phase competitors can't cheaply copy.

### 10.1 Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| F3.1 | Zone authoring (parent/teacher mode): tap-and-drag to define answer zones on any page; zone types: *write-in* (expected text/number), *color-in* (region), *path* (ordered waypoints, e.g., mazes), *free* | Must |
| F3.2 | Write-in checking: on-device handwriting recognition of strokes within a zone (digits + basic letters first; evaluate ML Kit Digital Ink / on-device TFLite model; web fallback via lightweight stroke-matching model). Result drives a gentle reward, never a red X — incorrect = neutral "try again" wobble | Must |
| F3.3 | Path checking: validate that a drawn stroke passes through zone waypoints in order (solves the Math Maze case); tolerance tuned for small fingers | Must |
| F3.4 | Auto-zone suggestion: heuristic detection of blank circles/boxes/lines on the page (CV pass on the rendered page) proposing zones the author confirms — reduces authoring to seconds | Should |
| F3.5 | Activity templates: authors can save a zoned PDF as a reusable "activity"; duplication resets ink | Must |
| F3.6 | Completion logic: a page with zones shows progress (e.g., 2/3 berries filled) and triggers the celebration when all zones pass | Must |
| F3.7 | **AI activity generation — in-app (Decision Q4: Option 1).** "Create activity" in the parent zone: parent picks subject, difficulty, and theme (e.g., "addition up to 10, berry theme") → backend (Supabase Edge Function calling an LLM/generation API) returns an original worksheet rendered to the shelf as a ready-to-play activity. Generated activities are **born with answer zones attached** — the generator knows where every blank is, so auto-checking works with zero authoring. Constraints: online-only feature (graceful "needs internet" state in an otherwise offline app); paid-tier from launch to cover per-generation API cost; all generation server-side with output moderation before delivery (kids' product — no raw model output reaches a child); generated content is original, solving copyright-clean infinite replay | Should |
| F3.8 | Zone schema versioned and exportable (JSON sidecar to the PDF) — groundwork for sharing/marketplace; the AI generator (F3.7) emits this same schema | Must |
| F3.9 | Zone-aware phone zoom: on phones, tapping an answer zone smoothly zooms the viewport to that zone for comfortable finger writing, with a one-tap return to full page. Completes the hybrid device strategy deferred from Phase 1 (N1.2a) | Should |

### 10.2 Non-Functional Requirements

| ID | Requirement |
|---|---|
| N3.1 | All recognition on-device; stroke data never sent to third-party recognition APIs |
| N3.2 | Recognition latency < 500 ms per zone evaluation; zero impact on ink latency |
| N3.3 | False-positive bias: tuning prefers accepting a sloppy correct answer over rejecting it; target ≥90% acceptance of legible correct digits from 4–6-year-olds (build a small test corpus) |
| N3.4 | Zone format documented and stable (treat as public API from day one) |

### 10.3 Success Criteria

- ≥30% of active families use at least one zoned activity weekly.
- Zoned activities replayed ≥3× more than free-scribble activities.
- Authoring a 3-zone page takes < 60 s in usability tests.

---

## 11. Phase 4 — "The Schoolbag"

**Objective:** Distribution, revenue, and the classroom beachhead.

### 11.1 Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| F4.1 | Capacitor-wrapped builds for iOS App Store and Google Play, sharing the web codebase; native modules only where needed (file system, IAP, low-latency input if profiling demands) | Must |
| F4.2 | Monetization: free tier (limited shelf + starter pack) and family subscription (unlimited shelf, sync, smart zones, AI generation). Pricing localized; consider regional pricing for markets like Ghana/West Africa where USD pricing excludes most families | Must |
| F4.3 | Payments: store IAP on native; Paystack/Stripe on web. All purchase flows behind parental gate; comply with kids-category store policies (no ads, no external purchase links in child UI) | Must |
| F4.4 | Classroom mode: teacher account with class groups, device-passing flow (tap child name → their shelf), bulk activity push to a class, work review queue | Should |
| F4.5 | Google Classroom import (assignment PDFs → shelf) | Should |
| F4.6 | Content partnerships: pilot with 1–2 worksheet publishers (e.g., Twinkl-style licensing) for an in-app curated pack — legal review of redistribution rights required | Could |
| F4.8 | **Ghana / West Africa pilot (Decision Q5).** Structured school pilot in Kumasi leveraging existing local education contacts (e.g., AYED Ghana network): 2–5 schools, Android-phone-and-tablet mix, offline-first as the headline advantage, regional pricing (GHS via Paystack) and a teacher feedback loop feeding the classroom-mode backlog. Success bar: weekly active classroom use for 6+ weeks and a documented case study for broader African market entry | Must |
| F4.7 | Shared activity links: a zoned activity can be shared parent-to-parent as a link/file (content embedded only if rights allow; otherwise zone sidecar applies to receiver's own copy of the PDF) | Could |

### 11.2 Success Criteria

- Free→paid conversion ≥ 4% at 30 days.
- App Store kids-category approval on first or second submission.
- ≥5 classrooms in a structured pilot with weekly usage.

---

## 12. Technical Architecture

### 12.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Team strength; ecosystem; Capacitor-compatible |
| State | Zustand (UI) + custom ink store | Ink state is hot-path; keep it out of React render cycle |
| PDF | pdf.js, worker bundled locally | Battle-tested, offline-friendly |
| Ink | Custom engine on layered `<canvas>`; perfect-freehand for stroke geometry; OffscreenCanvas + worker rendering where supported | Latency control; vector-first |
| Local persistence | IndexedDB via Dexie | Structured, observable, quota-aware |
| Backend | Supabase: Auth, Postgres (RLS), Storage, Edge Functions | Minimal ops; aligns with Jack's roadmap; generous free tier |
| PWA | Workbox service worker; manifest with share_target | Offline precache + OS-level "open with" |
| Recognition (P3) | On-device: ML Kit Digital Ink (native) / TFLite-web or stroke-template matcher (web) | Privacy + offline |
| Native shell (P4) | Capacitor | One codebase to stores |
| CI/CD | GitHub Actions → Cloudflare Pages (web) / Fastlane (stores) | Matches existing workflow habits |

### 12.2 Core Data Model (Phase 2 onward)

```
accounts        (id, email, plan, consent_record, created_at)
children        (id, account_id, display_name, avatar_id)
documents       (id, account_id, title, page_count, storage_path, source_type, checksum)
activities      (id, document_id, child_id, created_from_template_id?)
pages           (activity_id, page_no) → ink_blobs (append-only stroke batches, versioned)
zones           (id, document_id, page_no, type, geometry, expected, tolerance, schema_version)
gallery_items   (id, child_id, activity_id, page_no, flattened_image_path, created_at)
stickers        (id, child_id, sticker_type, earned_at, source_page)
```

Strokes are append-only batches (not row-per-stroke) to keep sync cheap; a page's ink state is the ordered reduction of its batches, enabling undo history and conflict-free multi-device append in the common case.

### 12.3 Ink Engine Notes

Normalized coordinates (0–1 page space) are the system of record. Rendering pipeline: pointer events → coalesced/predicted points → smoothing (quadratic midpoints) → tool renderer (crayon dual-pass, marker single-alpha-pass, eraser destination-out) → committed layer snapshot model (as proven in prototype). Phase 3 zone evaluation consumes the same vector data — no re-architecture.

### 12.4 Security & Compliance Architecture

Parental gate is a UI control, not a security boundary; real boundaries are auth + RLS. Child profiles carry no PII beyond a display name chosen by the parent. No third-party trackers in any child-reachable surface. Data residency and DPIA documentation maintained from Phase 2. Kids-category store rules (Apple 1.3, Google Families) treated as requirements, not guidelines, from Phase 1 design onward to avoid Phase 4 rework.

---

## 13. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Web ink latency feels worse than native on low-end Androids | Medium | High | Prototype perf budget tests on a real low-end device early; OffscreenCanvas worker; Capacitor escape hatch with native ink view if needed |
| Copyright: users import commercial worksheets | High | Medium | Personal-use framing (like Kami); no redistribution features without rights; partnerships path in P4; AI-generated original content reduces dependence |
| COPPA/GDPR-K misstep | Low | Severe | Compliance review before any account feature ships; data minimization by design; counsel review of consent flow |
| Handwriting recognition frustrates kids (false negatives) | Medium | High | Accept-biased tuning; rewards never punish; "free" zone fallback; corpus testing with target age group |
| AI generation (F3.7): inappropriate or low-quality output reaching a child; per-generation API costs eroding margin | Medium | High | Server-side pipeline with template-constrained prompts and automated moderation pass before delivery; human-reviewed template library for layouts; paid-tier gating + generation quotas; cached/parameterized generation (same template, new numbers) to cut cost per activity |
| iOS PWA limitations (storage eviction, file handling) | Medium | Medium | Aggressive persistence requests (`navigator.storage.persist()`), export prompts, accelerate Capacitor wrap if eviction reports appear |
| Solo-builder bandwidth | High | Medium | Phases are independently shippable; MVP scope is ruthlessly small; defer classroom/marketplace until traction |

---

## 14. Metrics Framework

North star: **pages completed per family per week.**

Supporting: activation (first stroke < 30 s), replay rate (activities opened ≥2×), BYO-content ratio, week-4 family retention, data-loss incidents (target zero), and from Phase 4, free→paid conversion and churn. All measured with privacy-safe aggregate telemetry; child-level behavioral analytics are explicitly out of bounds.

---

## 15. Decision Log (resolved June 2026)

| # | Question | Decision | Notes |
|---|---|---|---|
| 1 | Product name | **Peni Pad** (working title) — named for Peniel, the founder's son | Trademark + App Store/Play name search and written-form readability check required before store submission; fallback variants identified (Peniel Pad, Penny Pad, PeniPlay, Peni's Pad) |
| 2 | Phone support depth | **Option C — Hybrid.** Tablet-first flagship; phones fully supported with a deliberately simple landscape + two-finger pan/pinch mode in Phase 1; zone-aware tap-to-zoom lands in Phase 3 (F3.9) | Keeps the door open for phone-dominant markets (incl. the Phase 4 Ghana pilot and Kumasi-based beta testers) without solving the hardest interaction problem during MVP |
| 3 | Sticker economy | **Cosmetic only — nothing unlocks, ever** | Anti-manipulation stance encoded in F2.6 |
| 4 | AI worksheet generation | **Option 1 — In-app generation** (F3.7): parent-zone "Create activity," server-side generation with moderation, paid-tier, online-only, activities born with answer zones | The companion web-generator funnel idea is parked, not killed — revisit post-Phase 3 as a marketing channel if acquisition needs it |
| 5 | West Africa go-to-market | **Yes — Phase 4** structured Kumasi school pilot (F4.8) with regional pricing | Offline-first and Android phone support (Q2) are the enabling prerequisites, both already in scope |

---

## 16. Appendix: Phase 1 Build Sequence (engineering order)

1. Project scaffold (Vite + React + TS), CI, Cloudflare Pages deploy.
2. Ink engine extraction from prototype into a framework-agnostic module + test harness.
3. pdf.js integration, page virtualization, thumbnailing.
4. IndexedDB persistence layer (Dexie schemas for documents/pages/strokes) + autosave.
5. Shelf UI, import flows (picker, drag-drop, share_target).
6. Parental gate, settings, export (PNG, flattened PDF).
7. Starter pack content production (original).
8. PWA hardening: service worker, wake lock, storage persistence, install prompts.
9. Device test matrix pass (iPad Safari, mid/low Android Chrome) + latency profiling.
10. Closed family beta (5–10 households), success-criteria instrumentation, iterate.

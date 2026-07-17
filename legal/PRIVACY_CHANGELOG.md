# TMG Privacy Policy Changelog

This changelog records all material and non-material changes to the Triple Moon Goddess Privacy Policy. Maintained by Claude (Anthropic) on behalf of TMG. Each entry references the policy version, the sections affected, and the nature of the change.

---

## v2026-07 — July 16, 2026

**Reviewed:** July 16, 2026
**Reviewed by:** Lisa Hagan + Claude (Anthropic)
**Context:** Reflects the privacy-architecture changes shipped since the June review — the PII vault migration (email and birth data moved to server-side, KMS-encrypted vaults keyed by a one-way email hash / anonymous access code), the retirement of the passphrase-based in-browser encryption scheme in favour of managed-key Cloud KMS, the no-names data model, write-only/server-side-only birth data, and the automated privacy gate now enforced in the codebase. Summary content approved by Lisa 2026-07-16; the security-section rewrites are code-verified against the live functions (`emailCrypto.js`, `contentCrypto.js`, `secureVault.js`, `clientCrypto.ts`, `adminCharts.js`). Aligned with SOP-5 and the consent register.

### Changes

**New "Your Data" summary section (material)**
- Added a plain-language, layered-notice summary at the top of the policy ("Your Data: What We Store and How It's Protected"). States that identity and data are kept apart (no single record holds both); email and birth data are each stored once in separate encrypted vaults (Cloud KMS); the name is not stored (only an encrypted signature if a legal waiver is signed); everything else is linked by an anonymous access code; birth data stays server-side and is never shown in the apps (single admin exception for correcting a data-entry error); birth data is never used for research and any retained research signals carry no name/email/birth data; deletion leaves nothing that links back; and an internal privacy check blocks any change that would store a name, search an email in plain text, or move birth data out of its vault.

**Section III — Identity & Contact Data (material)**
- Removed the "First name or nickname — stored separately from health data" row. TMG does not store client names; the row was inaccurate under the current no-names architecture.
- Rewrote the "Separation guarantee" callout to the current vault model: email and birth data each held in a separate KMS-encrypted vault reachable only by secure server functions, email located via a one-way lookup code (never searchable plain text), everything else linked by an anonymous access code. (Note: the `user_identities` collection still exists but was repurposed — it now holds only the one-way email hash + access code, no plaintext email and no name. The public callout no longer names internal collections.)

**Section VIII — Security Measures (material, code-verified)**
- Replaced the "Client-Side Encryption" subsection (which described the retired passphrase scheme: XSalsa20-Poly1305 / scrypt, key in browser sessionStorage, "passphrase recovery is not possible") with "Encryption of Sensitive Data (Managed-Key Cloud KMS)." New text, verified against `functions/emailCrypto.js`, `functions/contentCrypto.js`, `functions/secureVault.js`, `packages/shared/src/clientCrypto.ts`: email, birth data, and practitioner clinical notes/psych readings are encrypted at rest with a dedicated Google Cloud KMS key that lives server-side only; encryption/decryption happen in Cloud Functions and the key never enters any browser; email vault located by a one-way SHA-256 hash, birth vault keyed by anonymous access code; practitioner decryption gated by authenticated claim + client-assignment ownership (or admin); the passphrase scheme is retired and legacy-sealed data is unrecoverable and marked as such.
- Updated "Infrastructure Security" to note field-level KMS on top of default at-rest encryption, birth data being write-only from the browser (no raw read-back; all calculation server-side), and audit-logged admin access to raw birth data for data-entry correction.

**Section XII — Practitioner App Data (material, code-verified)**
- "What Practitioners Enter": client email now KMS-encrypted server-side at save time (was "encrypted client-side ... unreadable without the practitioner's passphrase").
- "Client Birth Data": now KMS-encrypted in a dedicated access-code-keyed vault, never read back as raw birth data, practitioner scoped to assigned clients (was "stored in the practitioner's Firestore account under their authenticated UID").
- "Encryption & Passphrase" renamed "Encryption" and rewritten to the managed-key KMS model; removed the passphrase-responsibility / no-recovery language.

**Section VII — Data Retention (housekeeping)**
- Retention row relabeled from "Identity data (name/email)" to "Email (identity vault)" to match the no-names model.

**Version label + review date (housekeeping)**
- Policy version bumped 2026-06 → 2026-07; "Last reviewed" updated to July 16, 2026.

### Open item routed outside the privacy policy
- **In-app copy — `apps/client/src/components/SubscribePage.tsx` (practitioner subscribe screen):** still tells practitioners their notes/readings/client-email are "encrypted in my browser with a passphrase I set" with "no recovery mechanism." This describes the retired scheme and now contradicts the shipped KMS architecture and this policy. It is app UI copy, not the privacy policy — routed to the app repo for a separate fix.

---

## v2026-06 — June 8, 2026

**Reviewed:** June 8, 2026
**Reviewed by:** Lisa Hagan + Claude (Anthropic)
**Context:** Privacy review triggered by newly bound business liability + CyberShield PLUS+ cyber insurance (Alternative Balance® / Lio Specialty Insurance Co., policy WIN 3000000001-03-AL227588, period 06/08/2026–06/08/2027)

### Changes

**Section II — Scope (material)**
- Scope sentence expanded to enumerate the full ecosystem: natal chart generator, Health Journal (PWA), Health Blueprint, Tea Moon, phone widget, and the paid practitioner apps (Integrative Practitioner, Soul Pattern, Constitutional Health). Previously listed only the journal PWA, natal chart, and phone widget — though Sections X and XII already referenced the others.

**Section III — Technical & Device Data (material)**
- Added explicit disclosure that TMG does not collect precise device geo-location (GPS); the only location processed is the birth location the user enters for chart calculation, supplied by the user rather than derived from device location services.

**Section VIII — Security: Data Breach Notification (material)**
- Added a breach-notification commitment: GDPR Art. 33 (72-hour supervisory-authority notice) and Art. 34 (notice to affected users where high risk), plus US state-law notification (California Civil Code §§ 1798.29 / 1798.82). Notes that identity/health data separation limits cross-exposure. Aligns the policy with the incident-response capability now backed by CyberShield PLUS+ cyber coverage (breach notification, forensics, regulatory defense).

**Version label + review date (housekeeping)**
- Policy version bumped 2026-05b → 2026-06; "Last reviewed" updated to June 8, 2026. (Versions 05c/05d touched only the retired SFN file, so the main policy carried the 05b label until this revision.)

**Changelog location note (housekeeping)**
- Corrected the maintenance note: this changelog lives in the `triple-moon-goddess.github.io` repo at `legal/PRIVACY_CHANGELOG.md`, co-located with the policy HTML it tracks and updated in the same commit. The prior note stating it lives in `TMG-Library` did not match where the file actually resides.

### Insurance review — items routed outside the privacy policy
- **AI-output liability:** Carrier confirmed on the record that AI / auto-generated output is not covered by professional liability — advice must come from Lisa personally (see `business/legal/insurance/carrier-support-transcript-ai-output-exclusion.md` in tmg-library). The privacy policy describes the AI only in data-handling terms and makes no advice representation, so no privacy-policy change. The fix lands in the ToS and the three in-app AI notices (this commit set).
- **Scope of practice (CA §2068 posted-notice format):** Not applicable — no clients are received at a physical business premises (in-person work is at expos / on screen). Educator / not-medical-provider posture is carried by the ToS and intake disclosures.
- **Business address:** Fremont mailing address is the correct public contact; the Union City home / insured address is intentionally kept off all public documents. No change to Sections I or XIV.

---

## v2026-05d — May 20, 2026

**Reviewed:** May 20, 2026  
**Reviewed by:** Lisa Hagan + Claude (Anthropic)

### Changes

**SFN retired — decision not to use (non-material)**
- `triple-moon-goddess-privacy-sfn.html` created in v2026-05c and immediately retired in this version
- The Mobile Short Form Notice (SFN) requirement comes from a corporate framework document written for large organisations shipping native apps to the Apple App Store and Google Play Store
- TMG is a PWA, not a native app, and has no app store listing
- The full privacy policy (`triple-moon-goddess-privacy-policy.html`) is already written in plain language, is mobile-readable, is linked in every app footer, and covers everything an SFN would summarise
- Maintaining a third privacy document creates ongoing overhead with no user benefit: every policy change would require updating the SFN, the full policy, and the changelog
- The JIT notices handle in-context AI disclosure; the full policy handles everything else
- Decision: one privacy policy, linked in the footer of every app. That is sufficient and correct for TMG’s architecture and scale
- SFN URL now redirects to the full privacy policy to avoid dead links

---

## v2026-05c — May 20, 2026

**Note:** SFN created this version, immediately retired in v2026-05d. See above.

---

## v2026-05b — May 20, 2026

**Reviewed:** May 20, 2026  
**Reviewed by:** Lisa Hagan + Claude (Anthropic)  
**Deployed:** JIT notices confirmed live on dev

### Changes

**Section IV — AI Processing (material)**
- Renamed from “AI Summary Processing” to “AI Processing”
- Added structured table of all three AI touchpoints with location, trigger, data sent, sessionStorage key
- Added callout on sessionStorage expiry behaviour
- Added fifth item to What We Never Do: “Send client names, emails, or birth data to any AI processor”

**Section V — Anthropic processor card (material)**
- Updated to reference summaries and dialog; cross-reference to Section IV table

**Section IX — Cookies and Local Storage (material)**
- Added storage type column; added all three JIT notice sessionStorage keys as explicit rows

**Architecture note: Intents & Permissions document (V) — not applicable (non-material)**
- The project document on Android/iOS intents and permissions was reviewed and determined not applicable to TMG
- TMG apps are PWAs sharing a single Firestore database under one account — the apps are different views on the same data, not separate applications passing data between themselves
- No broadcast intents, no IPC interfaces, no Android permission levels apply
- No policy changes required

---

## v2026-05 — May 20, 2026

**Reviewed:** May 20, 2026  
**Reviewed by:** Lisa Hagan + Claude (Anthropic)

### Changes
- Section I: postal address added (3654 Thornton Ave, Unit #748, Fremont, CA 94536)
- Section IV: AI consent model rewritten (5 free → token opt-in)
- Section IX: cookies table created; `tmg_minor_chart` added
- Section XI: 30-day denial-reason language added
- Section XII: research corpus example and no-PII-in-output statement added
- Section XIV: postal address and 30-day response commitment added
- Hero: effective date corrected to January 1, 2025

---

## v2025-01 — January 1, 2025

**Effective date:** January 1, 2025  
**Note:** Original policy publication. No prior version exists.

### Initial publication covers
- Identity and contact data collection and separation architecture (`user_identities` Firestore collection)
- Health and wellness data as GDPR Article 9 special category
- Legal basis per processing activity (Art 6 and Art 9)
- Third-party processors: Firebase, Anthropic, Google Cloud Run, Google Workspace
- International transfers via SCCs and EU-US Data Privacy Framework
- Data retention table
- Client-side encryption for practitioner apps (XSalsa20-Poly1305 / scrypt)
- Cookies and local storage (strictly necessary only, no advertising trackers)
- Children’s privacy: full platform 18+; age-appropriate natal chart experience for 13–17 with parental consent and local-only storage
- User rights: GDPR (Arts 15–22), CCPA/CPRA, LGPD, PIPEDA, Australian Privacy Act
- Practitioner app data architecture and research corpus pseudonymization
- Contact and complaints: email only (postal address pending at time of publication)

---

## Changelog Maintenance Notes

- This file lives in the `triple-moon-goddess.github.io` repo at `legal/PRIVACY_CHANGELOG.md`, co-located with the policy HTML it tracks
- Maintained by Claude (Anthropic) on behalf of Triple Moon Goddess
- **Rule:** The privacy policy HTML and this changelog are always updated in the same session — never one without the other
- **Material changes** = changes that affect how user data is collected, used, shared, or retained
- **Non-material changes** = clarifications, formatting, cross-references, corrections that do not change underlying data practices
- When a new policy version is published, add the entry at the top of this file

## Standing Watch Items

- **Research corpus publication** — review Section XII of the full privacy policy before any research output is published or shared
- **Annual review** — next due May 2027
- **New app added to ecosystem** — triggers policy update at that point

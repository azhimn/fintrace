# Product

<!-- impeccable:product-schema 1 -->

Inferred from SPEC.md without an interview, because the build was requested without waiting. Everything below is inferred unless SPEC.md states it word for word; correct anything that reads wrong.

## Platform

web

## Users

One person tracking their own money in Indonesia. They log spending on a phone, usually right after paying, and plan or reconcile on a larger screen at pay day. (Inferred from SPEC section 0, "personal finance", and section 1, "transactions are logged on a phone".)

## Product Purpose

fintrace replaces a Google Sheet budget tracker with envelope budgeting per pay cycle across several wallets and bank accounts. Success is that recording a transaction is faster than the sheet: a new one in under 10 seconds, a repeat one in under 5.

## Positioning

Built around one person's real pay cycle: pay days that shift, rupiah shorthand like 1,5jt, and balances reconciled against counted cash. It is not a bank-linked aggregator and has no social or advice features.

## Operating Context

Logged standing up, one-handed, often outdoors or in a shop just after paying. Reviewed at a desk on pay day. Runs on the user's own server, self-hosted.

## Capabilities and Constraints

UI language is English; money and numbers are id-ID ('Rp 1.234.567', '22,5', '12,5%'); dates read like 'Fri, Sep 25'. Negative money is red. One login, no signup. Installable PWA with offline capture arrives in M3.

## Brand Commitments

The name is fintrace, written lowercase. No logo or other brand assets exist yet.

## Evidence on Hand

No real financial data exists. Seeded reference lists only: accounts, envelopes, categories. Do not fabricate balances, charts or testimonials.

## Product Principles

- Input speed beats every other consideration.
- Numbers are the interface: they must be legible at a glance and never ambiguous.
- Show what is true now; an empty state says what to do next.
- A person's money is private: nothing decorative distracts from that seriousness, and nothing is exposed.

## Accessibility & Inclusion

WCAG AA contrast, full keyboard use on desktop, and touch targets that work one-handed on a phone. (Inferred from SPEC section 6, "accessible forms".)

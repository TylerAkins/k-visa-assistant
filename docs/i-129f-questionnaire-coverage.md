# I-129F Questionnaire Coverage

This document tracks whether the app's questionnaire captures the information needed for Form I-129F and its instructions.

Source documents reviewed:

- `i-129f.pdf`: Form I-129F, edition 01/20/25, expires 03/31/2027, 12 pages.
- `i-129finstr.pdf`: Form I-129F Instructions, 01/20/25, 14 pages.

## Current Status

The app does not yet cover all I-129F possibilities.

Current implementation covers the foundation:

- A case root with authenticated ownership checks.
- Basic petitioner and beneficiary profile fields.
- K-2 child tracking.
- A questionnaire data model for sections, questions, answers, and per-case review state.
- A server-safe section registry for `petitioner`, `beneficiary`, `relationship`, and `children`.

It does not yet include a complete I-129F question catalog, conditional branching, evidence checklist, or PDF field mapping.

## Coverage Checklist

| Form area | I-129F requirement | Current coverage | Gap |
|-----------|--------------------|------------------|-----|
| Part 1: petitioner identity | A-Number, USCIS online account number, SSN, classification requested, full legal name, other names, mailing address, physical address | Partial | Missing immigration identifiers, classification requested, other names, full mailing/physical address parity, and K-3 classification handling |
| Part 1: petitioner history | Five-year address history, five-year employment history, sex, date of birth, marital status, place of birth | Partial | Existing profile has a single address and some identity fields, but no repeatable five-year address/employment history |
| Part 1: petitioner family and citizenship | Parent information, prior marriages, citizenship basis, certificate details, previous I-129F filings, children under 18, residences since age 18 | Not covered | Needs repeatable parent, spouse, filing history, child-age, and residence-since-18 question groups |
| Part 2: beneficiary identity | Full legal name, A-Number, SSN, date of birth, sex, marital status, place of birth, citizenship, other names | Partial | Existing profile has core identity fields but not immigration identifiers, sex, marital status, or repeatable other names |
| Part 2: beneficiary history | Mailing address, five-year address history, five-year employment history, parents, prior marriages | Partial | Existing profile has one address and basic details, but no repeatable history, parent, or prior spouse groups |
| Part 2: beneficiary U.S. immigration status | Prior U.S. presence, I-94, date of arrival, stay expiration, passport/travel document details | Not covered | Needs conditional I-94/passport/travel-document group |
| Part 2: beneficiary children | Whether beneficiary has children, each child's name, country of birth, date of birth, residence-with-beneficiary flag, child address if different | Partial | Existing K-2 tracking captures basic child identity, but not all Form I-129F child fields or conditional residence details |
| Part 2: intended residence and native alphabet | U.S. address where beneficiary intends to live, physical address abroad, native-alphabet name and address | Not covered | Needs U.S. intended residence, abroad residence, phone, and native-script fields |
| Part 2: relationship | Familial relationship, nature/degree of relationship, in-person meeting within two years, meeting narrative, waiver explanation when no meeting | Not covered | Needs relationship questions, conditional waiver branch, and evidence prompts |
| Part 2: IMB and consular processing | International marriage broker usage, IMB contact details, signed consent form, requested U.S. embassy or consulate | Not covered | Needs IMB branch, evidence requirement, and consular post fields |
| Part 3: criminal information | Protection/restraining orders, specified crime categories, extreme cruelty/self-defense context, other arrests/citations/charges, dates/outcomes | Not covered | Needs sensitive criminal disclosure flow, repeatable incident details, and evidence prompts |
| Part 3: multiple filer waiver | General, extraordinary circumstances, mandatory, or not-applicable waiver selection and supporting explanation/evidence | Not covered | Needs IMBRA multiple-filer branch based on previous I-129F history and filing type |
| Part 4: biographic information | Ethnicity, race, height, weight, eye color, hair color | Not covered | Needs biographic field group and enumerated options |
| Part 5: petitioner statement/contact/signature | Contact numbers, email, interpreter/preparer declaration flags, signature/date | Partial | Existing account contact may overlap, but form-specific declaration, signature, and date are not modeled |
| Part 6: interpreter | Interpreter identity, business, contact, certification, signature/date | Not covered | Needs optional interpreter section |
| Part 7: preparer | Preparer identity, business, contact, certification, signature/date | Not covered | Needs optional preparer section |
| Part 8: additional information | Page/part/item references and extra free-text responses | Not covered | Needs repeatable overflow entries tied to source form items |
| Evidence checklist | Citizenship, prior marriage termination, photos, legal name change, I-94, K-1 intent to marry, in-person meeting or exception evidence, K-3 I-130 and marriage certificate | Not covered | Needs evidence requirements generated from questionnaire answers and filing classification |

## Required Branching Rules

The questionnaire needs conditional logic for at least these branches:

- K-1 versus K-3 filing classification.
- K-3 Form I-130 evidence and marriage certificate requirements.
- Mailing address same as physical address.
- Additional other names, addresses, employers, previous spouses, previous filings, residences, and children beyond the first displayed slots.
- Petitioner certificate of naturalization or citizenship details.
- Petitioner previous I-129F filing history and IMBRA multiple-filer waiver requirements.
- Beneficiary prior U.S. presence and I-94/passport/travel document details.
- Beneficiary native alphabet fields when Roman letters are not used.
- Familial relationship to beneficiary.
- In-person meeting within two years, including waiver reason and supporting evidence when no meeting occurred.
- International marriage broker usage, including beneficiary consent evidence.
- Criminal history disclosures, certified records, and beneficiary disclosure warnings.
- Interpreter and preparer involvement.
- Part 8 overflow entries whenever a repeatable answer exceeds the form's visible slots.

## Implementation Notes

- Keep the questionnaire registry as the section-level source of truth, but add a separate question catalog that maps every question to a Form I-129F part and item number.
- Store repeatable groups explicitly for histories, previous spouses, previous filings, children, criminal incidents, and Part 8 overflow entries.
- Treat evidence requirements as derived state from answers, not as standalone checklist items users must remember to add manually.
- Keep SSN handling aligned with the existing project rule: Social Security Numbers are never stored in the database or on disk.
- Document the source PDF edition next to the question catalog so future USCIS form revisions can be diffed against this checklist.

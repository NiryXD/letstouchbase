# 03 · Structured Career Data & Filtering

## The LinkedIn pattern, abbreviated

LinkedIn gets people to volunteer career data by making every field a
structured picker, not free text — dropdowns, typeahead, fixed taxonomies.
LTB replicates the pattern but trims it to dating-app length (a profile you
browse in 20 seconds, not an actual CV):

- **Experience** (max 3 entries, newest first): Title (free text) + Company
  (typeahead, optional "prefer not to say") + Industry (picker) + Years
  ("2021–Present" style, year granularity only) + optional one-liner
  (100 chars). No employment-type, no location-per-job, no paragraphs.
- **Education** (max 2 entries): School (typeahead) + Degree level (picker:
  High School · Associate · **Bachelor's · Master's · PhD** · MD · JD · MBA ·
  Trade Certification · Self-Taught) + Field of study (picker) + Class year.

## Industry taxonomy

Single fixed list (~20), used for both profile and filtering. Lives in
`packages/shared` as enums so profile, filters, and analytics all speak the
same taxonomy:

> Tech · Finance · Engineering · Manufacturing · Retail · Healthcare/Medicine ·
> Academia/Research · Law · Education · Government · Marketing/Media ·
> Consulting · Real Estate · Construction/Trades · Hospitality ·
> Arts/Entertainment · Nonprofit · Science · Military · Student · Other

## Filtering: "Hiring Criteria" (Hinge's preferences model)

Two layers — preferences shape the deck, **Dealbreakers** hard-exclude:

- **Standard vectors (free):** age range, distance, gender, height,
  race/ethnicity, religion, family plans, kids, smoking/drinking/420,
  politics.
- **Corporate vectors (free, the differentiator):** Industry (multi-select),
  Education level (Bachelor's+/Master's+/PhD), Department archetype,
  Open-to-Work status.
- **Minimum Qualifications (free):** flip any vector into a hard Dealbreaker —
  "Master's or higher, Finance or Tech only, must want kids." Free, per the
  no-feature-gating principle: monetization is volume, not capability.

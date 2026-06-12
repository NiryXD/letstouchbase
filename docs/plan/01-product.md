# 01 · Product Concept & UX Model

## What LTB is

A satirical, corporate-jargon dating app poking fun at corporate America and
hustle culture (finance bros, tech bros, neuroscience girlies): profiles are
resumes, passing is "Reject Candidate," liking is "Request an Initial Screen,"
matches are "Offers Extended," and ghosting is replaced by formal rejection
letters.

**Crucially, the credentials are real.** Users list their actual current role,
what they study/studied, where they graduated, and can upload their real
resume PDF. People choose people partly off the resume. The satire is the
tone; the professional substance is genuine.

All the corporate-theatre features (references, endorsements, pipeline view,
rejection templates) are **free** — removing them removes the magic.

## UX Model: copy Hinge's mechanics, reskin in corporate satire

Hinge is the workflow template — **not Tinder**. Hinge's core insight: no
anonymous swipe deck. You see one full, scrollable profile at a time and you
like/comment on a *specific* photo or prompt answer, which forces intentional
choices and gives every conversation a built-in opener.

| What makes Hinge great | LTB version |
|---|---|
| Scrollable full-profile cards (photos interleaved with prompt answers) | **The Resume** — photos interleaved with Behavioral Question answers and Experience entries, formatted like a slick CV |
| Like a *specific* photo/prompt + optional comment | **Annotate their resume** — tap a specific line/photo and attach a **Cover Letter** referencing it |
| X button to pass | **Reject Candidate** (with optional one-tap Formal Rejection Letter) |
| 8 free likes/day | 8 free **Initial Screen requests**/day |
| Roses | **Headhunts** (jump their queue, consumable) |
| Most Compatible daily pick | **Recruiter's Pick** — one algorithm-blessed candidate per day |
| Standouts grid | **Featured Candidates** |
| Likes-you grid (blurred for free) | **Inbound Applications** — blurred grid for free users, processed newest-first one at a time; premium unblurs and jumps the queue |
| "Your Turn" anti-ghosting nudge | **Action Required** inbox — pending items flagged like overdue tasks; reply or send a Formal Rejection Letter |
| "We Met" feedback loop | **Exit Interview** — "Did the Alignment Call convert to an in-person Final Round?" — feeds the matching algorithm |
| "Designed to be deleted" | **"Built for your two weeks' notice."** |

## The Corporate Jargon Glossary

Every UI string commits to the bit. Lives in `packages/shared/glossary.ts` so
copy stays consistent. (Avoid trademarked terms: no "LinkedIn," no "InMail.")

| Real concept | LTB name |
|---|---|
| Profile | **Your Resume / CV** — real data: current title & employer/industry, education, career history |
| Resume PDF upload | **Resume on File** — actual PDF; "Full resume available upon request": viewable only after a match. Upload flow warns to redact phone/email/address |
| Bio | **Executive Summary** |
| Prompts | **Behavioral Questions** — literal interview questions answered about your love life: "Tell me about a time you went above and beyond on a date." · "What is your greatest weakness?" · "Where do you see yourself in five years?" · "Why should we hire you?" · "Walk me through your dating resume." · "Describe a conflict and how you resolved it." · "What are your salary expectations?" · "Do you have any questions for us?" — pick 3 during onboarding |
| Like | **Request an Initial Screen** (must attach a short **Cover Letter**) |
| Pass | **Reject Candidate** |
| Match | **Offer Extended** 🎉 (confetti + offer-letter modal) |
| Super-like | **Headhunt** |
| Chat | **Alignment Call** |
| Unmatch | **Termination** (exit interview optional) |
| Ghost-prevention | **Formal Rejection Letter** (one-tap templated "we've decided to move forward with other candidates") |
| Status badge | **Open to Work** (green = open to commitment, purple = contract/casual, grey = just networking) |
| Match list | **Your Pipeline** (kanban: Sourced → Initial Screen → Second Round → Final Round → Offer Extended) |
| Snooze | **Out of Office** (auto-reply on your profile) |
| Boost | **Expedited Review** ("your resume moves to the top of the stack") |
| Profile analytics | **Quarterly Performance Review** |
| Referral program | **Employee Referral Bonus** (invite friends → free premium month) |

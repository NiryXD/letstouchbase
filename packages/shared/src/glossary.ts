/**
 * The Corporate Jargon Glossary — single source of truth for every UI string.
 * Every screen commits to the bit. No "like", no "match", no "swipe" anywhere
 * in user-facing copy. (And no trademarked terms: no "LinkedIn", no "InMail".)
 */
export const glossary = {
  brand: {
    name: "letstouchbase",
    shortName: "LTB",
    tagline: "Built for your two weeks' notice.",
  },

  auth: {
    signInTitle: "Badge In",
    signInSub: "Welcome back to the office.",
    signUpTitle: "New Hire Orientation",
    signUpSub: "Let's get you in the system.",
    emailLabel: "Email",
    passwordLabel: "Password",
    signInCta: "Badge In",
    signUpCta: "Submit Application",
    verifyTitle: "Identity Verification",
    verifySub: "HR sent a 6-digit code to your inbox.",
    verifyCta: "Confirm Identity",
    toSignUp: "New around here? Begin orientation",
    toSignIn: "Already employed here? Badge in",
    signOut: "Resign (Sign Out)",
  },

  profile: {
    title: "Your Resume",
    bio: "Executive Summary",
    resumeOnFile: "Resume on File",
    resumeOnFileTeaser: "Full resume available upon request",
    resumeUploadWarning:
      "Heads up: redact your phone number, email, and address before uploading. Matched candidates can view this file.",
    openToWork: "Open to Work",
    outOfOffice: "Out of Office",
    // [Opus 4.8] Resume on File actions
    resumeUpload: "Upload Resume PDF",
    resumeReplace: "Replace Resume",
    resumeRemove: "Remove",
    resumeOnFileSet: "Resume on file — released to matches only.",
    resumeViewMatch: "View Resume on File",
    resumeUnavailable: "Resume couldn't be retrieved. They may have removed it.",
  },

  openToWorkStatuses: {
    committed: "Open to Commitment",
    casual: "Looking for Contract Work",
    networking: "Happily Employed (Just Networking)",
  },

  actions: {
    screen: "Request an Initial Screen",
    reject: "Reject Candidate",
    headhunt: "Headhunt",
    unsend: "Retract Statement",
    undoReject: "Counteroffer",
    unmatch: "Termination",
    coverLetter: "Cover Letter",
    rejectionLetter: "Formal Rejection Letter",
  },

  match: {
    celebration: "Offer Extended!",
    celebrationSub: "Schedule your alignment call.",
    chat: "Alignment Call",
    exitInterview: "Exit Interview",
  },

  // [Opus 4.8] endorsements + exitInterview copy — authored this session
  endorsements: {
    title: "Endorsements",
    cta: "Endorse a Competency",
    sub: "Vouch for a core competency. One endorsement per skill, per colleague.",
    done: "Endorsement on file. HR thanks you for your candor.",
    empty: "No endorsements yet. Reputation is built one humble-brag at a time.",
  },

  exitInterview: {
    title: "Exit Interview",
    intro: "Before you go — a quick word with HR. This is confidential and shapes future matches.",
    metQuestion: "Did the alignment call convert to an in-person Final Round?",
    metYes: "Yes, we met",
    metNo: "No, we never met",
    outcomeQuestion: "How would you rate the engagement?",
    outcomes: {
      great: "Exceeded expectations",
      fine: "Met expectations",
      poor: "Below expectations",
      no_show: "Candidate ghosted / no-show",
    },
    noteLabel: "Anything for the record? (optional)",
    submit: "Submit Exit Interview",
    skip: "Decline to comment",
  },

  tabs: {
    candidates: "Candidates",
    inbound: "Inbound",
    pipeline: "Pipeline",
    you: "Your Resume",
  },

  discovery: {
    recruitersPick: "Recruiter's Pick",
    featuredCandidates: "Featured Candidates",
    dailyLimitReached:
      "You've reached today's screening capacity. Upgrade your seat for unlimited candidate review.",
    emptyDeck: "We're still hiring in your area — refer a colleague.",
    expandingRadius: "Expanding your search area…",
  },

  inbound: {
    title: "Inbound Applications",
    blurredHint: "Review applications in the order received.",
    headhuntFlag: "Headhunted you",
    // [Opus 4.8] inbound grid gating copy (Phase 5)
    gridLockedTitle: "See everyone who applied",
    gridLockedBody: (n: number) =>
      `${n} candidate${n === 1 ? "" : "s"} applied. Free reviews them one at a time, newest first. ` +
      "Upgrade your seat to unblur the grid and jump to anyone.",
    gridUpgradeCta: "Upgrade Your Seat",
    gridHint: "All inbound applications — tap any candidate to review.",
  },

  pipeline: {
    title: "Your Pipeline",
    actionRequired: "Action Required",
    stages: ["Sourced", "Initial Screen", "Second Round", "Final Round", "Offer Extended"],
  },

  filters: {
    title: "Hiring Criteria",
    dealbreaker: "Minimum Qualification",
    // [Opus 4.8] Hiring Criteria editor copy
    sub: "Shape who lands on your desk. Flip any vector to a Minimum Qualification to hard-exclude — all free.",
    standardTitle: "Standard vectors",
    corporateTitle: "Corporate vectors",
    seeking: "Interested in",
    ageRange: "Age range",
    distance: "Max distance (km)",
    industries: "Industries",
    education: "Minimum education",
    archetypes: "Department",
    openToWork: "Open to Work status",
    dealbreakerHint: "Minimum Qualification (hard exclude)",
    anyDegree: "Any",
  },

  // [Opus 4.8] Business Trip (location change)
  businessTrip: {
    title: "Business Trip",
    sub: "Relocate your deck to wherever you're headed. Candidates there see you; you see them.",
    active: "On assignment",
    activeAt: "Your deck is currently set to a travel location.",
    addressLabel: "Destination city or address",
    addressPlaceholder: "Chicago, IL",
    start: "Depart on Business Trip",
    end: "Return to the Office",
    notFound: "Couldn't find that location. Try a city and region.",
  },

  // [Opus 4.8] Counteroffer (undo reject)
  counteroffer: {
    rejected: (name: string) => `Rejected ${name}.`,
    undo: "Counteroffer",
  },

  // [Opus 4.8] premium copy expanded this session (Phase 5)
  premium: {
    tierName: "The Executive Suite",
    paywallTitle: "Upgrade Your Seat",
    paywallSub:
      "Same job, corner office. Premium never locks a feature — it just lifts the volume caps.",
    perks: [
      "Unlimited Initial Screens — review candidates all day",
      "Unblurred Inbound Applications — see everyone who applied, jump to anyone",
      "One Headhunt included every week",
    ],
    perksDisclaimer:
      "Every other capability stays free, forever. You're paying for reach, not features.",
    cta: "Review the Offer",
    restore: "Restore Purchases",
    manage: "Manage Subscription",
    activeBadge: "Executive Suite — Active",
    loadingOffer: "Pulling the comp package…",
    unavailable:
      "Billing isn't available in this build. Open the app from a store install to upgrade.",
    purchaseFailed: "The transaction didn't go through. No charge was made.",
    restoreNone: "No prior purchases found on this account.",

    consumablesTitle: "Discretionary Budget",
    consumablesSub: "À la carte reach for anyone, free or paid. Approved without a manager's sign-off.",
    headhunt: "Headhunt",
    headhuntSub: "Jump to the top of their inbound queue — they see you first.",
    headhuntCredits: (n: number) => `${n} Headhunt${n === 1 ? "" : "s"} on hand`,
    headhuntSendOption: "Send as a Headhunt ★",
    headhuntNone: "You're out of Headhunts. Top up from the Discretionary Budget.",

    boost: "Expedited Review",
    boostSub: "Your resume moves to the top of the stack for 30 minutes.",
    boostCredits: (n: number) => `${n} Expedited Review${n === 1 ? "" : "s"} on hand`,
    boostActivate: "Expedite My Review",
    boostActive: "Expedited — you're top of the stack",
    boostNone: "No Expedited Reviews left. Buy more from the Discretionary Budget.",
    boostDone: "Done. Your resume is at the top of the stack for the next 30 minutes.",
  },

  analytics: {
    title: "Quarterly Performance Review",
    // [Opus 4.8] metrics copy below authored this session
    sub: "Your numbers, summarized for the board. All metrics are free — reach is what costs.",
    metrics: {
      impressions: "Resume Impressions",
      impressionsSub: "Times your resume surfaced in a candidate review.",
      screensReceived: "Inbound Applications",
      screensReceivedSub: "Candidates who requested an initial screen with you.",
      screensSent: "Initial Screens Requested",
      screensSentSub: "Candidates you reached out to.",
      conversionRate: "Screen-to-Offer Rate",
      conversionRateSub: "Share of your outbound screens that became offers.",
      offers: "Offers Extended",
      offersSub: "Mutual matches, all time.",
      activeOffers: "Active Engagements",
      activeOffersSub: "Open alignment calls right now.",
      endorsements: "Endorsements",
      references: "Approved References",
      desirability: "Reciprocity Band",
      desirabilitySub: "How often inbound interest converts — your internal rating.",
      completeness: "Resume Completeness",
      memberSince: "Date of Hire",
    },
    empty: "Not enough data for a review yet. Get out there and generate some pipeline.",
  },

  referral: {
    title: "Employee Referral Bonus",
  },

  // [Opus 4.8] notification settings copy (Phase 6)
  notifications: {
    title: "Notification Settings",
    sub: "Manage what HR is allowed to ping you about. Nothing erodes trust faster than a spammy dating app.",
    master: "Push Notifications",
    masterSub: "The master switch. Off means total radio silence.",
    categoriesTitle: "Per-category",
    categories: {
      screens: "New inbound applications",
      screensSub: "Someone requested an initial screen with you.",
      matches: "Offers extended",
      matchesSub: "You have a new match.",
      messages: "Alignment Call messages",
      messagesSub: "New messages from your matches.",
      rejections: "Formal correspondence",
      rejectionsSub: "A candidate sent a Formal Rejection Letter.",
    },
    quietTitle: "Quiet Hours",
    quietSub: "Hold all notifications during these hours, in your local time.",
    quietEnable: "Enable quiet hours",
    quietFrom: "From",
    quietTo: "To",
    saved: "Preferences saved.",
  },

  onboarding: {
    title: "Build Your Resume",
    dressCode: "Dress for the date you want, not the date you have.",
  },

  rejectionLetterTemplate: (name: string) =>
    `Dear ${name},\n\nThank you for taking the time to connect. While your background is genuinely impressive, we've decided to move forward with other candidates whose availability better aligns with our current needs.\n\nWe'll keep your resume on file.\n\nBest of luck in your future endeavors,\nThe Hiring Committee (of one)`,
} as const;

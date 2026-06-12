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

  profile: {
    title: "Your Resume",
    bio: "Executive Summary",
    resumeOnFile: "Resume on File",
    resumeOnFileTeaser: "Full resume available upon request",
    resumeUploadWarning:
      "Heads up: redact your phone number, email, and address before uploading. Matched candidates can view this file.",
    openToWork: "Open to Work",
    outOfOffice: "Out of Office",
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
  },

  pipeline: {
    title: "Your Pipeline",
    actionRequired: "Action Required",
    stages: ["Sourced", "Initial Screen", "Second Round", "Final Round", "Offer Extended"],
  },

  filters: {
    title: "Hiring Criteria",
    dealbreaker: "Minimum Qualification",
  },

  premium: {
    tierName: "The Executive Suite",
    paywallTitle: "Upgrade Your Seat",
    consumablesTitle: "Discretionary Budget",
    boost: "Expedited Review",
    boostSub: "Your resume moves to the top of the stack.",
  },

  analytics: {
    title: "Quarterly Performance Review",
  },

  referral: {
    title: "Employee Referral Bonus",
  },

  onboarding: {
    title: "Build Your Resume",
    dressCode: "Dress for the date you want, not the date you have.",
  },

  rejectionLetterTemplate: (name: string) =>
    `Dear ${name},\n\nThank you for taking the time to connect. While your background is genuinely impressive, we've decided to move forward with other candidates whose availability better aligns with our current needs.\n\nWe'll keep your resume on file.\n\nBest of luck in your future endeavors,\nThe Hiring Committee (of one)`,
} as const;

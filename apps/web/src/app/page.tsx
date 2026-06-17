import Link from "next/link";
import { glossary } from "@ltb/shared";
import { WaitlistForm } from "@/components/WaitlistForm";

const KPIS = [
  "Mutual interest ▲ 23% QoQ",
  "Alignment calls scheduled: 12,409",
  "Time-to-offer ▼ 4.2 days",
  "Candidate satisfaction: 104%",
  "Rejection letters delivered with dignity: 100%",
  "Ghosting incidents: 0 (compliance violation)",
  "Projected headcount: you + 1",
];

const GLOSSARY_ROWS: Array<[string, string]> = [
  ["Swiping", "Candidate Review"],
  ["Your profile", glossary.profile.title],
  ["Liking someone", glossary.actions.screen],
  ["It's a match!", glossary.match.celebration],
  ["Chatting", glossary.match.chat],
  ["Ghosting", glossary.actions.rejectionLetter],
  ["Breaking up", glossary.match.exitInterview],
];

export default function Home() {
  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link href="/" className="wordmark">
            <span className="wordmark-badge">{glossary.brand.shortName}</span>
            {glossary.brand.name}
          </Link>
          <nav className="topnav" aria-label="Primary">
            <a href="#process">The Process</a>
            <a href="#glossary">Terminology</a>
            <a href="#pricing">Compensation</a>
          </nav>
          <a href="#waitlist" className="btn btn-primary">
            Join the Waitlist
          </a>
        </div>
      </header>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[...KPIS, ...KPIS].map((kpi, i) => (
            <span key={i}>{kpi}</span>
          ))}
        </div>
      </div>

      <main>
        <section className="wrap hero">
          <div>
            <span className="eyebrow rise rise-1">
              A professional network for falling in love
            </span>
            <h1 className="rise rise-2">
              Let&rsquo;s circle back on being alone.
            </h1>
            <p className="sub rise rise-3">
              {glossary.brand.name} runs your dating life like a hiring
              pipeline: structured screens, formal offers, and rejection
              letters with full dignity.{" "}
              <strong>{glossary.brand.tagline}</strong>
            </p>
            <div className="hero-ctas rise rise-4">
              <a href="#waitlist" className="btn btn-primary">
                Submit Your Resume
              </a>
              <a href="#process" className="btn btn-ghost">
                Review the Hiring Process
              </a>
            </div>
            <p className="hero-fineprint rise rise-4">
              Strictly 18+. Android first. Free tier includes the entire
              product — see <a href="#pricing">compensation philosophy</a>.
            </p>
          </div>

          <div className="resume-card rise rise-5" aria-hidden="true">
            <span className="stamp">{glossary.discovery.recruitersPick}</span>
            <div className="resume-head">
              <div className="resume-avatar">JA</div>
              <div>
                <div className="resume-name">Jordan A.</div>
                <div className="resume-role">
                  Senior Synergy Associate · 6 yrs experience
                </div>
                <span className="otw">
                  {glossary.openToWorkStatuses.committed}
                </span>
              </div>
            </div>
            <hr className="resume-rule" />
            <div className="resume-section-label">{glossary.profile.bio}</div>
            <blockquote>
              &ldquo;Results-oriented romantic with a proven track record of
              remembering birthdays.&rdquo;
            </blockquote>
            <hr className="resume-rule" />
            <div className="resume-section-label">Behavioral Question</div>
            <blockquote>
              &ldquo;My toxic trait is checking Slack on vacation.&rdquo;
            </blockquote>
            <div className="resume-actions">
              <span className="btn btn-reject">{glossary.actions.reject}</span>
              <span className="btn btn-primary">
                {glossary.actions.screen}
              </span>
            </div>
          </div>
        </section>

        <section className="section" id="process">
          <div className="wrap">
            <span className="eyebrow">Standard Operating Procedure</span>
            <h2>Every great relationship starts with a rigorous process.</h2>
            <p className="section-lede">
              No infinite swiping. No ghosting. Every candidate gets a
              decision, every decision gets a letter, and every letter is on
              letterhead.
            </p>
            <div className="process-grid">
              <div className="process-card">
                <div className="process-step">Step 01</div>
                <h3>{glossary.onboarding.title}</h3>
                <p>
                  Labeled photo slots, real credentials, an executive summary.
                  &ldquo;{glossary.onboarding.dressCode}&rdquo;
                </p>
              </div>
              <div className="process-card">
                <div className="process-step">Step 02</div>
                <h3>Review {glossary.tabs.candidates}</h3>
                <p>
                  One resume at a time, eight screens a day. Respond to a
                  specific line item with a {glossary.actions.coverLetter} — or
                  pass with dignity.
                </p>
              </div>
              <div className="process-card">
                <div className="process-step">Step 03</div>
                <h3>{glossary.match.celebration}</h3>
                <p>
                  Mutual interest triggers a formal offer letter.{" "}
                  {glossary.match.celebrationSub}
                </p>
              </div>
              <div className="process-card">
                <div className="process-step">Step 04</div>
                <h3>{glossary.match.chat}s</h3>
                <p>
                  Real-time chat with your pipeline. Exit any engagement
                  professionally via the {glossary.match.exitInterview}.
                </p>
              </div>
            </div>
            <div className="pipeline" aria-label="Pipeline stages">
              {glossary.pipeline.stages.map((stage, i) => (
                <span key={stage} style={{ display: "contents" }}>
                  {i > 0 && <span className="arrow">→</span>}
                  <span
                    className={
                      i === glossary.pipeline.stages.length - 1
                        ? "stage final"
                        : "stage"
                    }
                  >
                    {stage}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="glossary">
          <div className="wrap">
            <span className="eyebrow">Memo from HR</span>
            <h2>Approved terminology.</h2>
            <p className="section-lede">
              Effective immediately, the following language standards apply to
              your personal life.
            </p>
            <table className="glossary-table">
              <thead>
                <tr>
                  <th scope="col">Common parlance</th>
                  <th scope="col">Approved term</th>
                </tr>
              </thead>
              <tbody>
                {GLOSSARY_ROWS.map(([before, after]) => (
                  <tr key={after}>
                    <td>{before}</td>
                    <td>{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section" id="dignity">
          <div className="wrap letter-wrap">
            <div>
              <span className="eyebrow">Compliance</span>
              <h2>Ghosting is a policy violation.</h2>
              <p className="section-lede">
                On {glossary.brand.name}, nobody disappears. Every pass ships
                with a {glossary.actions.rejectionLetter} — composed, signed,
                and delivered to the candidate&rsquo;s inbox. Closure is a
                benefit, and it&rsquo;s fully vested on day one.
              </p>
            </div>
            <div className="letter">
              <div className="letterhead">
                <span className="lh-brand">{glossary.brand.name}</span>
                <span className="lh-office">Office of the Hiring Committee</span>
              </div>
              <p>{glossary.rejectionLetterTemplate("Valued Candidate")}</p>
            </div>
          </div>
        </section>

        <section className="section" id="pricing">
          <div className="wrap">
            <span className="eyebrow">Compensation Philosophy</span>
            <h2>Free tier means the whole product.</h2>
            <p className="section-lede">
              Company policy, non-negotiable: premium never gates features —
              only volume. Every employee gets the full experience.
            </p>
            <div className="pricing-card">
              <div className="pricing-tag">{glossary.premium.paywallTitle}</div>
              <h3>{glossary.premium.tierName}</h3>
              <ul>
                <li>Unlimited daily screening capacity</li>
                <li>
                  {glossary.premium.boost} — {glossary.premium.boostSub.toLowerCase()}
                </li>
                <li>Your full {glossary.inbound.title} queue, unblurred</li>
              </ul>
              <div className="policy-note">
                Everything else — matching, chat, letters, the entire bit — is
                free forever. Volume is the only thing money buys here.
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="waitlist">
          <div className="wrap">
            <span className="eyebrow">{glossary.referral.title}</span>
            <h2>The position is open. Apply within.</h2>
            <p className="section-lede">
              We&rsquo;re onboarding one metro at a time. Submit your interest
              and we&rsquo;ll touch base when your cohort starts orientation.
            </p>
            <WaitlistForm />
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <div>
            <strong>{glossary.brand.name}</strong> —{" "}
            {glossary.brand.tagline}
            <div className="age-gate">
              Strictly 18+. This office hires adults only.
            </div>
          </div>
          <nav aria-label="Legal">
            <Link href="/privacy/">Privacy Policy</Link>
            <Link href="/terms/">Terms of Service</Link>
            <Link href="/support/">Support</Link>{/* [Opus 4.8] */}
          </nav>
        </div>
      </footer>
    </>
  );
}

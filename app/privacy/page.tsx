import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Data Vista",
  description:
    "Data Vista Privacy Policy: how we collect, use, and protect your data when you use our AI-powered analytics platform.",
};

const EFFECTIVE_DATE = "February 21, 2026";
const COMPANY_NAME = "Data Vista";
const CONTACT_EMAIL = "privacy@datavista.ai";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-xl font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-grape-300">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-grape-100">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-grape-300">{children}</div>
    </div>
  );
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="ml-4 mt-2 list-disc space-y-1.5 text-grape-300">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

const toc = [
  { id: "overview", label: "Overview" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use", label: "How We Use Your Information" },
  { id: "database-credentials", label: "Database Connections & Credentials" },
  { id: "ai-processing", label: "AI Processing of Your Data" },
  { id: "data-sharing", label: "Data Sharing & Third Parties" },
  { id: "cookies", label: "Cookies & Local Storage" },
  { id: "data-retention", label: "Data Retention" },
  { id: "security", label: "Security Measures" },
  { id: "your-rights", label: "Your Rights (GDPR & CCPA)" },
  { id: "children", label: "Children's Privacy" },
  { id: "international", label: "International Transfers" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Us" },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      {/* Header */}
      <div className="mb-12 border-b border-white/[0.06] pb-10">
        <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-grape-400">Legal</p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-sm text-grape-400">
          Effective date: <span className="text-grape-200">{EFFECTIVE_DATE}</span>
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-grape-300">
          {COMPANY_NAME} (&ldquo;Data Vista,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or
          &ldquo;us&rdquo;) is committed to protecting your privacy. This Privacy Policy explains
          what information we collect, how we use it, and the choices you have when you use our
          AI-powered analytics platform. Please read it carefully.
        </p>
      </div>

      <div className="flex gap-12">
        {/* Table of contents — sticky sidebar on large screens */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-24">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-grape-500">
              Contents
            </p>
            <nav aria-label="Privacy policy sections">
              <ul className="space-y-1.5">
                {toc.map(({ id, label }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="block rounded-lg px-2 py-1.5 text-xs text-grape-400 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-12">
          {/* 1. Overview */}
          <Section id="overview" title="1. Overview">
            <p>
              Data Vista is a business analytics platform that lets you connect your own databases and
              ask questions in plain English. Our service translates natural-language questions into
              SQL queries, runs them against your connected data sources, and returns insights,
              charts, and AI-generated analysis.
            </p>
            <p>
              Because our platform processes data that may be sensitive — including database
              connection credentials, query results, and business metrics — we have designed our
              systems with a strong privacy and security posture. This policy tells you exactly what
              we collect and why.
            </p>
          </Section>

          {/* 2. Information We Collect */}
          <Section id="information-we-collect" title="2. Information We Collect">
            <SubSection title="2.1 Account & Authentication Information">
              <p>
                When you sign up or sign in using Google (or other supported identity providers), we
                receive from your identity provider:
              </p>
              <Ul
                items={[
                  "Your email address",
                  "Your display name",
                  "Your profile photo URL",
                  "A unique user ID issued by your identity provider (e.g., Google UID)",
                ]}
              />
              <p className="mt-2">
                We do not store passwords. Authentication is handled entirely through Firebase
                Authentication (Google LLC) using OAuth 2.0.
              </p>
            </SubSection>

            <SubSection title="2.2 Data Source Connection Information">
              <p>
                To connect your database, you provide connection details such as:
              </p>
              <Ul
                items={[
                  "Database host, port, and database name",
                  "Database username and password (or equivalent credentials)",
                  "Connection type (PostgreSQL, MySQL, etc.)",
                  "A human-readable name you assign to the connection",
                ]}
              />
              <p className="mt-2">
                These credentials are encrypted at rest and in transit. See{" "}
                <a href="#database-credentials" className="text-accent hover:underline">
                  Section 4
                </a>{" "}
                for full details.
              </p>
            </SubSection>

            <SubSection title="2.3 Query & Usage Data">
              <p>When you use the platform, we log:</p>
              <Ul
                items={[
                  "The natural-language questions you submit",
                  "The SQL queries generated and executed on your behalf",
                  "Query results returned to your session",
                  "Conversation thread history (for follow-up queries within a session)",
                  "Feature usage signals (e.g., chart vs. table view, analysis mode activations)",
                  "Timestamps of queries and sessions",
                ]}
              />
            </SubSection>

            <SubSection title="2.4 Technical & Device Data">
              <p>We automatically collect standard technical information:</p>
              <Ul
                items={[
                  "IP address",
                  "Browser type and version",
                  "Operating system",
                  "Referring URL",
                  "Pages and features accessed",
                  "Session duration and interaction timestamps",
                ]}
              />
            </SubSection>

            <SubSection title="2.5 Support & Communications">
              <p>
                If you contact us for support, we retain the contents of those communications,
                including email address, message body, and any attachments you send.
              </p>
            </SubSection>
          </Section>

          {/* 3. How We Use */}
          <Section id="how-we-use" title="3. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <Ul
              items={[
                "Authenticate you and maintain your account",
                "Connect to your data sources and execute queries on your behalf",
                "Generate SQL, charts, AI summaries, and deep-analysis reports",
                "Maintain your in-session conversation history for follow-up queries",
                "Send transactional emails (account confirmations, security alerts)",
                "Detect, investigate, and prevent fraud, abuse, or security incidents",
                "Improve model quality, UI, and feature performance (using anonymised aggregates)",
                "Comply with legal obligations",
              ]}
            />
            <p>
              We do <strong className="text-white">not</strong> sell, rent, or trade your personal
              information or your database contents to any third party for their independent marketing
              or advertising purposes.
            </p>
          </Section>

          {/* 4. Database Credentials */}
          <Section id="database-credentials" title="4. Database Connections & Credentials">
            <p>
              Your database credentials are among the most sensitive data you entrust to us. We treat
              them accordingly:
            </p>
            <Ul
              items={[
                "Credentials are encrypted with AES-256 before being stored.",
                "Credentials are decrypted only in-memory, at query execution time, and are never logged in plaintext.",
                "All traffic between Data Vista servers and your database is encrypted using TLS 1.2+.",
                "Only your account (and organisation members you explicitly share access with) can initiate queries against your connected source.",
                "We recommend using a read-only database user dedicated to Data Vista with the minimum permissions required.",
                "You can revoke and delete a connection at any time from Settings → Data Sources; this permanently removes all stored credentials.",
              ]}
            />
            <p>
              We do <strong className="text-white">not</strong> store a full copy of your database.
              We only read the data necessary to answer each query you submit.
            </p>
          </Section>

          {/* 5. AI Processing */}
          <Section id="ai-processing" title="5. AI Processing of Your Data">
            <p>
              Data Vista uses large language models (LLMs) to convert your natural-language questions
              into SQL and to generate analytical summaries. Here is what you should know:
            </p>
            <SubSection title="5.1 What is sent to the AI">
              <Ul
                items={[
                  "Your question (natural-language prompt)",
                  "Your database schema (table names, column names, and types) — used to construct accurate SQL",
                  "Sampled or summarised query result rows — used to generate data summaries and insights",
                  "Conversation thread history — used to support follow-up queries",
                ]}
              />
            </SubSection>
            <SubSection title="5.2 What is NOT sent">
              <Ul
                items={[
                  "Your raw database credentials",
                  "Your full database contents beyond what is needed for a specific query",
                  "Any data that you do not explicitly query",
                ]}
              />
            </SubSection>
            <SubSection title="5.3 AI provider data handling">
              <p>
                We use third-party AI providers (including Anthropic&apos;s Claude API) to power
                query generation and analysis. These providers process the data described in Section
                5.1 under their own data-processing agreements with us. They are contractually
                prohibited from using your data to train their public models. Please review{" "}
                <a
                  href="https://www.anthropic.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Anthropic&apos;s Privacy Policy
                </a>{" "}
                for details.
              </p>
            </SubSection>
          </Section>

          {/* 6. Data Sharing */}
          <Section id="data-sharing" title="6. Data Sharing & Third Parties">
            <p>We share data only in the following limited circumstances:</p>
            <SubSection title="6.1 Service Providers (Sub-processors)">
              <p>
                We use carefully vetted service providers to operate the platform. They act as data
                processors on our behalf and are bound by data-processing agreements:
              </p>
              <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.06]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-4 py-2.5 text-left font-semibold text-grape-200">Provider</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-grape-200">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {[
                      ["Google Firebase", "Authentication, Firestore database, hosting"],
                      ["Anthropic", "LLM-powered SQL generation & AI analysis"],
                      ["Vercel / cloud hosting provider", "Application hosting & edge delivery"],
                      ["Email provider", "Transactional email delivery"],
                    ].map(([provider, purpose]) => (
                      <tr key={provider}>
                        <td className="px-4 py-2.5 text-grape-300">{provider}</td>
                        <td className="px-4 py-2.5 text-grape-400">{purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SubSection>

            <SubSection title="6.2 Legal Requirements">
              <p>
                We may disclose information if required to do so by law, court order, or governmental
                authority, or if we believe in good faith that disclosure is necessary to protect the
                rights, property, or safety of Data Vista, our users, or the public.
              </p>
            </SubSection>

            <SubSection title="6.3 Business Transfers">
              <p>
                In the event of a merger, acquisition, or sale of all or a portion of our assets,
                your information may be transferred as part of that transaction. We will notify you
                via email and/or a prominent notice on the platform before your data becomes subject
                to a different privacy policy.
              </p>
            </SubSection>
          </Section>

          {/* 7. Cookies & Local Storage */}
          <Section id="cookies" title="7. Cookies & Local Storage">
            <p>We use a minimal set of cookies and browser storage:</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.06]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-4 py-2.5 text-left font-semibold text-grape-200">Name / Type</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-grape-200">Purpose</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-grape-200">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[
                    ["Firebase Auth session cookies", "Maintain your authenticated session", "Session / up to 1 year"],
                    ["datasourceId (localStorage)", "Remember your last-selected data source", "Persistent (until cleared)"],
                    ["Analytics cookies (if enabled)", "Aggregate usage analytics", "Up to 2 years"],
                  ].map(([name, purpose, duration]) => (
                    <tr key={name}>
                      <td className="px-4 py-2.5 text-grape-300">{name}</td>
                      <td className="px-4 py-2.5 text-grape-400">{purpose}</td>
                      <td className="px-4 py-2.5 text-grape-400">{duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              You can clear local storage and cookies at any time through your browser settings.
              Doing so will sign you out and reset your data-source preferences.
            </p>
          </Section>

          {/* 8. Data Retention */}
          <Section id="data-retention" title="8. Data Retention">
            <Ul
              items={[
                "Account information is retained for as long as your account is active.",
                "Query logs and conversation history are retained for up to 12 months, then automatically purged.",
                "Database connection credentials are deleted immediately when you remove a data source from Settings → Data Sources.",
                "If you delete your account, all personal data and associated query history are permanently deleted within 30 days, subject to any legal hold obligations.",
                "Anonymised, aggregated usage statistics may be retained indefinitely for product improvement purposes.",
              ]}
            />
          </Section>

          {/* 9. Security */}
          <Section id="security" title="9. Security Measures">
            <p>
              We take reasonable and industry-standard technical and organisational measures to
              protect your information, including:
            </p>
            <Ul
              items={[
                "TLS 1.2+ encryption for all data in transit",
                "AES-256 encryption for credentials and sensitive data at rest",
                "Role-based access controls; only authorised personnel can access production systems",
                "Regular security reviews and dependency audits",
                "Firebase Security Rules to ensure strict per-user data isolation",
                "Monitoring and alerting for anomalous activity",
              ]}
            />
            <p>
              No system is 100% secure. If you discover a security vulnerability, please report it
              responsibly to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              before disclosing it publicly.
            </p>
          </Section>

          {/* 10. Your Rights */}
          <Section id="your-rights" title="10. Your Rights (GDPR & CCPA)">
            <p>
              Depending on where you are located, you may have the following rights regarding your
              personal data:
            </p>
            <SubSection title="For users in the European Economic Area, UK, and Switzerland (GDPR)">
              <Ul
                items={[
                  "Right of access — request a copy of the personal data we hold about you",
                  "Right to rectification — request correction of inaccurate data",
                  "Right to erasure — request deletion of your personal data (&ldquo;right to be forgotten&rdquo;)",
                  "Right to restriction — request that we limit processing of your data",
                  "Right to data portability — receive your data in a structured, machine-readable format",
                  "Right to object — object to processing based on our legitimate interests",
                  "Right to withdraw consent — where processing is based on consent, withdraw it at any time",
                ]}
              />
            </SubSection>
            <SubSection title="For California residents (CCPA / CPRA)">
              <Ul
                items={[
                  "Right to know what personal information we collect and how it is used",
                  "Right to delete personal information (subject to certain exceptions)",
                  "Right to opt out of the sale or sharing of personal information — we do not sell personal information",
                  "Right to non-discrimination for exercising your privacy rights",
                  "Right to correct inaccurate personal information",
                  "Right to limit use of sensitive personal information",
                ]}
              />
            </SubSection>
            <p>
              To exercise any of these rights, email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
                {CONTACT_EMAIL}
              </a>
              . We will respond within 30 days. We may need to verify your identity before
              processing certain requests.
            </p>
          </Section>

          {/* 11. Children */}
          <Section id="children" title="11. Children's Privacy">
            <p>
              Data Vista is not directed at children under the age of 16. We do not knowingly collect
              personal information from children under 16. If you believe we have inadvertently
              collected such information, please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              and we will delete it promptly.
            </p>
          </Section>

          {/* 12. International Transfers */}
          <Section id="international" title="12. International Data Transfers">
            <p>
              Data Vista is operated from the United States. If you are located outside the United
              States, your information will be transferred to and processed in the United States
              and/or other countries where our service providers operate.
            </p>
            <p>
              For transfers from the EEA, UK, or Switzerland to the United States, we rely on the EU
              Standard Contractual Clauses (SCCs) or other approved transfer mechanisms. By using the
              platform, you acknowledge that your data may be processed in jurisdictions with
              different data protection laws than your own.
            </p>
          </Section>

          {/* 13. Changes */}
          <Section id="changes" title="13. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our
              practices, technology, legal requirements, or other factors. When we make material
              changes, we will:
            </p>
            <Ul
              items={[
                "Update the &ldquo;Effective date&rdquo; at the top of this page",
                "Display a prominent notice within the platform for at least 14 days",
                "Send an email notification to registered users where required by law",
              ]}
            />
            <p>
              Your continued use of Data Vista after the updated policy takes effect constitutes
              acceptance of the revised terms.
            </p>
          </Section>

          {/* 14. Contact */}
          <Section id="contact" title="14. Contact Us">
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or our
              privacy practices, please contact us:
            </p>
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm">
              <p className="font-semibold text-white">{COMPANY_NAME}</p>
              <p className="mt-1 text-grape-300">
                Email:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p className="mt-1 text-grape-400">
                We aim to respond to all privacy-related enquiries within 5 business days.
              </p>
            </div>
          </Section>

          {/* Back to top */}
          <div className="border-t border-white/[0.06] pt-8">
            <Link
              href="/"
              className="text-sm text-grape-400 transition hover:text-white"
            >
              &larr; Back to Data Vista
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

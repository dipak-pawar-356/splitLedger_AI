"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Printer,
  ArrowLeft,
  Calendar,
  Scale,
  Shield,
  CreditCard,
  Users,
  Sparkles,
  QrCode,
  AlertTriangle,
  Lock,
  HardDrive,
  UserCheck,
  FileCheck,
  Ban,
  HelpCircle,
  Mail,
  ChevronRight,
  Database,
  Building,
  Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TermsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeSection, setActiveSection] = React.useState("section-1");

  const sections = [
    { id: "section-1", title: "1. Title & Identification" },
    { id: "section-2", title: "2. Effective Date" },
    { id: "section-3", title: "3. Last Updated" },
    { id: "section-4", title: "4. Acceptance of Terms" },
    { id: "section-5", title: "5. Definitions" },
    { id: "section-6", title: "6. Eligibility & Capacity" },
    { id: "section-7", title: "7. User Accounts & Authentication" },
    { id: "section-8", title: "8. User Responsibilities & Conduct" },
    { id: "section-9", title: "9. Group Collaboration & Roles" },
    { id: "section-10", title: "10. Expense Recording & Versioning" },
    { id: "section-11", title: "11. Settlements & Verification" },
    { id: "section-12", title: "12. Dynamic UPI Payments (Non-Banking)" },
    { id: "section-13", title: "13. AI Features & Machine Processing" },
    { id: "section-14", title: "14. Acceptable Use Policy" },
    { id: "section-15", title: "15. Prohibited Activities" },
    { id: "section-16", title: "16. Third-Party Services" },
    { id: "section-17", title: "17. Intellectual Property Rights" },
    { id: "section-18", title: "18. User Content & Licensing" },
    { id: "section-19", title: "19. Account Suspension & Termination" },
    { id: "section-20", title: "20. Disclaimer of Warranties" },
    { id: "section-21", title: "21. Limitation of Liability" },
    { id: "section-22", title: "22. Indemnification" },
    { id: "section-23", title: "23. Privacy & Data Protection" },
    { id: "section-24", title: "24. Amendments & Modifications" },
    { id: "section-25", title: "25. Governing Law & Jurisdiction" },
    { id: "section-26", title: "26. Dispute Resolution & Arbitration" },
    { id: "section-27", title: "27. Contact Information" },
  ];

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="w-full bg-white dark:bg-slate-950 py-12 md:py-16 text-slate-800 dark:text-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Navigation Bar / Quick Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/70 dark:border-slate-800/70">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs font-semibold gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Button>
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search terms clauses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 focus-visible:ring-primary/20"
              />
            </div>

            {/* Print Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="rounded-xl text-xs font-semibold gap-1.5 h-9 shrink-0 print:hidden border-slate-200 dark:border-slate-800"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Terms</span>
            </Button>
          </div>
        </div>

        {/* Title Header */}
        <div className="mb-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              Official Legal Agreement
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold border border-slate-200/60 dark:border-slate-800/60">
              Production Standard • 27 Enforceable Sections
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Terms &amp; Conditions of Service
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Last Updated: October 16, 2026
            </span>
            <span>•</span>
            <span>Effective Date: January 1, 2026</span>
          </div>
        </div>

        {/* Main Grid: Sidebar TOC + Body Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* ================= STICKY SIDEBAR (TOC) ================= */}
          <aside className="lg:col-span-4 sticky top-24 hidden lg:block rounded-2xl p-5 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-3 print:hidden max-h-[calc(100vh-8rem)] overflow-y-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-primary" />
              <span>Index of Clauses</span>
            </h2>

            <nav className="space-y-1">
              {sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeSection === sec.id
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {sec.title}
                </a>
              ))}
            </nav>

            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-500">
              Legal Support Contact:{" "}
              <a href="mailto:dipakpawar3747@gmail.com" className="text-primary font-bold hover:underline">
                dipakpawar3747@gmail.com
              </a>
            </div>
          </aside>

          {/* ================= LEGAL CLAUSES CONTENT ================= */}
          <main className="lg:col-span-8 space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            {/* Section 1 */}
            {matchesSearch("Title Identification SplitLedger AI Entity") && (
              <section id="section-1" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>1. Title &amp; Identification of the Platform</span>
                </h2>
                <p>
                  These Terms and Conditions of Service (&ldquo;<strong>Terms</strong>&rdquo;, &ldquo;<strong>Agreement</strong>&rdquo;) govern the relationship between <strong>[Company Legal Name]</strong> (&ldquo;<strong>SplitLedger AI</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>us</strong>&rdquo;, or &ldquo;<strong>our</strong>&rdquo;) and any individual or entity (&ldquo;<strong>User</strong>&rdquo;, &ldquo;<strong>you</strong>&rdquo;, or &ldquo;<strong>your</strong>&rdquo;) who accesses, registers with, or utilizes the web application, progressive web app, mobile-responsive client interfaces, and related backend services located at <code>split-ledger-ai.vercel.app</code> and associated domain names (collectively, the &ldquo;<strong>Application</strong>&rdquo; or &ldquo;<strong>Platform</strong>&rdquo;).
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs">
                  <div><strong>Legal Entity:</strong> [Company Legal Name / Corporate Entity Name]</div>
                  <div><strong>Registered Corporate Office:</strong> [Registered Corporate Address, City, State, PIN/ZIP, Country]</div>
                  <div><strong>Corporate Identification:</strong> [CIN / Corporate Registration Number / Tax Identifier]</div>
                  <div><strong>Official Legal &amp; Support Contact:</strong> dipakpawar3747@gmail.com</div>
                </div>
              </section>
            )}

            {/* Section 2 & 3 */}
            {matchesSearch("Effective Date Last Updated") && (
              <section id="section-2" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  <span>2. Effective Date &amp; 3. Last Updated</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Effective Date</span>
                    <p className="text-slate-600 dark:text-slate-400 font-mono">January 1, 2026</p>
                    <p className="text-slate-500 text-[11px]">This Agreement governs all access, interactions, expense entries, and settlements originating on or after this date.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Last Updated</span>
                    <p className="text-slate-600 dark:text-slate-400 font-mono">October 16, 2026</p>
                    <p className="text-slate-500 text-[11px]">Comprehensive update reflecting dynamic NPCI UPI QR code generation, AI assistant workflows, and PostgreSQL ledger data structures.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 4 */}
            {matchesSearch("Acceptance of Terms Binding Agreement Contract") && (
              <section id="section-4" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-emerald-500" />
                  <span>4. Acceptance of Terms</span>
                </h2>
                <p>
                  By visiting the Application, registering an account via our identity provider, creating or participating in an expense group, logging an expense, generating a dynamic UPI QR code, scanning a receipt, or interacting with our AI financial assistant, you explicitly acknowledge that you have read, understood, and agree to be legally bound by this Agreement and our integrated <Link href="/privacy" className="text-primary font-bold hover:underline">Privacy Policy</Link>.
                </p>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs">
                  <strong>Mandatory Condition:</strong> If you do not agree unconditionally to every term and condition set forth in this Agreement, you are strictly prohibited from accessing or using the Application, and you must immediately cease all access and terminate your account.
                </div>
              </section>
            )}

            {/* Section 5 */}
            {matchesSearch("Definitions Application User Registered Guest Group Owner Admin Member Expense Settlement Dynamic UPI QR AI Features Services Content Third-Party") && (
              <section id="section-5" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  <span>5. Definitions</span>
                </h2>
                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Application&rdquo; or &ldquo;Platform&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">The SplitLedger AI web software, progressive web application (PWA), backend server actions, and cloud infrastructure hosted on Vercel and Neon.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;User&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">Any natural person accessing or utilizing the Application, including Registered Users and individuals recorded as Guest Users.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Registered User&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">A User who has completed account authentication through our identity provider (Clerk, Inc.) and established a profile in our database.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Guest User&rdquo; or &ldquo;Guest Member&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">An unauthenticated natural person created by a Registered User within an individual or group ledger to assign split expense shares prior to establishing an authenticated account.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Group&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">A multi-party collaborative expense container created within the Application to track shared expenditures (e.g., trips, roommates, projects, households).</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Group Owner&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">The Registered User who instantiated the Group, possessing sole administrative authority over group settings, member approval workflows, role delegations, and group deletion.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Group Admin&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">A Member designated by the Group Owner with delegated administrative powers to invite, approve, or remove members and moderate ledger transactions.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Member&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">An authenticated Registered User admitted into a Group with permissions to log expenses, view net balances, and confirm peer settlements.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Expense&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">An itemized financial expenditure entry recorded in the Application, specifying total transaction value (stored in integer paise), payor, split distribution formulas, timestamp, category, and receipt attachments.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Settlement&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">A bilateral debt reconciliation record within a Group or peer ledger reflecting reimbursement of shared expenditures.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Dynamic UPI QR&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">An in-browser dynamically generated Quick Response matrix barcode encoding standard National Payments Corporation of India (NPCI) Universal UPI URI payment strings (<code>upi://pay</code>).</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;AI Features&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">Automated algorithmic functions within the Application, comprising the AI Financial Assistant, Optical Character Recognition (OCR) receipt parsing via Tesseract.js and OpenAI, Smart Expense Categorization, and Debt Minimization graph algorithms.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Services&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">All software functionality, ledger tools, calculation utilities, dynamic QR generation, budgeting modules, and data export tools provided by SplitLedger AI.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Content&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">All text, images, receipt photos, PDF bills, comments, notes, category tags, and data uploaded or generated by Users on the Platform.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Third-Party Services&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">External cloud infrastructure and enterprise software vendors integrated into the Application, specifically Clerk, Neon, OpenAI, Cloudinary, Resend, Meta WhatsApp, and Vercel.</dd>
                  </div>
                </dl>
              </section>
            )}

            {/* Section 6 */}
            {matchesSearch("Eligibility Minimum Age Legal Capacity Registration") && (
              <section id="section-6" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                  <span>6. Eligibility &amp; Legal Capacity</span>
                </h2>
                <p>
                  To register an Account or access the Services, you must satisfy the following strict legal conditions:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Minimum Age Requirement:</strong> You must be at least <strong>18 years of age</strong> (or the age of legal majority in your country of residence). In compliance with the Indian Contract Act, 1872, the Digital Personal Data Protection Act, 2023, and international child data protection frameworks, minors under 18 years of age are strictly prohibited from creating accounts.</li>
                  <li><strong>Legal Capacity:</strong> You possess full legal power, capacity, and authority to enter into this legally binding contract and are not disqualified or restricted under any applicable jurisdiction.</li>
                  <li><strong>Accurate Registration:</strong> You represent and warrant that all personal identity information, email addresses, phone numbers, and financial details provided during registration and profile configuration are authentic, current, and accurate.</li>
                </ul>
              </section>
            )}

            {/* Section 7 */}
            {matchesSearch("User Accounts Creation Authentication Clerk Security Responsibility") && (
              <section id="section-7" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>7. User Accounts &amp; Authentication</span>
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">A. Account Provisioning</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      User identity authentication is provisioned through Clerk, Inc. (&ldquo;Clerk&rdquo;). You agree to provide a valid email address and secure credentials. Each natural person may establish only one active account on the Platform.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">B. Credential Confidentiality</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      You are exclusively responsible for maintaining the confidentiality of your authentication credentials, session tokens, and passwords. You agree not to disclose, share, or transfer your login access to any third party.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">C. Absolute Account Responsibility</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      You accept sole and unconditional legal and financial liability for all activities, expense submissions, split approvals, group modifications, and debt records executed under your account. You must notify us immediately at <code>dipakpawar3747@gmail.com</code> if you suspect any unauthorized access or breach of security.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 8 */}
            {matchesSearch("User Responsibilities Accurate Credentials UPI ID Lawful Use") && (
              <section id="section-8" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-500" />
                  <span>8. User Responsibilities &amp; Conduct</span>
                </h2>
                <p>As a condition of using SplitLedger AI, you agree to fulfill the following continuous obligations:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Accurate Expense Records</span>
                    <p className="text-slate-500">Record only genuine, verifiable expenditures actually incurred on behalf of a group or personal ledger. Fictitious or exaggerated entries are strictly prohibited.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Valid UPI ID Maintenance</span>
                    <p className="text-slate-500">Ensure any Virtual Payment Address / UPI ID configured in your profile is active, valid, and legally registered to your bank account before generating settlement payment requests.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Collaborative Good Faith</span>
                    <p className="text-slate-500">Engage transparently with co-members in shared groups, reviewing and acknowledging genuine expense splits promptly.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Lawful Compliance</span>
                    <p className="text-slate-500">Comply strictly with all local, municipal, state, national, and international laws, including currency control regulations and taxation statutes.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 9 */}
            {matchesSearch("Group Collaboration Owner Admin Member Guest Approval Historical Participation") && (
              <section id="section-9" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-500" />
                  <span>9. Group Collaboration, Governance &amp; Roles</span>
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">A. Governance Hierarchy</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      <strong>Group Owners</strong> hold complete authority over Group settings, title, cover imagery, member invitation codes, role assignments, and permanent group archiving or deletion. <strong>Group Admins</strong> possess delegated authority to review member join requests and moderate transaction entries.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">B. Guest Member Handling</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      When a Registered User adds a Guest Member (non-registered contact) to a Group, that Registered User assumes full responsibility for the accuracy of splits assigned to that contact. When a Guest User subsequently registers an authentic Account and links their profile, historical guest expense shares merge into their authenticated ledger.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">C. Member Approval &amp; Join Workflows</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Access to private groups requires explicit approval from the Group Owner or Admin. Join request approvals and role changes are immutably logged in database audit tables.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">D. Historical Expense Participation &amp; Exit Restrictions</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      A Member may not unilaterally erase, void, or repudiate historical expense participation records by leaving a Group. Prior to exiting a Group, a Member must resolve all outstanding net debit balances owed to co-members.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 10 */}
            {matchesSearch("Expense Recording Accuracy Split Calculations Editing Deleting Version History") && (
              <section id="section-10" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-amber-500" />
                  <span>10. Expense Recording, Splits &amp; Version History</span>
                </h2>
                <p>SplitLedger AI implements precision mathematical accounting standards:</p>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Integer-Based Monetary Storage (Paise):</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">To prevent floating-point calculation rounding discrepancies, all transaction amounts are stored in the smallest currency unit (integer paise, <code>bigint</code> mode). 100 paise equals ₹1.00 INR.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Split Calculation Formulas:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">The Platform supports equal division, exact fractional amounts, percentage apportionment, and per-item allocations. You agree that mathematical calculations executed by the system are binding ledger representations.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Editing, Soft Deletion &amp; Version History:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Any modifications to an existing expense generate a logged audit version (<code>expense_history</code>). Deleting an expense triggers an audited soft-deletion flag, preserving historical integrity and preventing surreptitious ledger alteration.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 11 */}
            {matchesSearch("Settlements Calculations Payment Requests Confirmation Manual Verification Offline") && (
              <section id="section-11" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  <span>11. Settlements &amp; Manual Verification</span>
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">A. Informational Payment Requests</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      A settlement record or reminder sent through SplitLedger AI (via email, WhatsApp, or in-app notification) constitutes a purely bilateral peer-to-peer notification. It is not an official banking demand or debt collection mechanism.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">B. Settlement Confirmation</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      When a debtor marks a balance as &ldquo;Paid&rdquo;, the payee must verify receipt of actual funds in their external bank account before acknowledging the settlement as confirmed. SplitLedger AI does not automatically confirm external banking deposits.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">C. Manual Verification &amp; Offline Settlements</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Users may enter banking Unique Transaction Reference (UTR) numbers or record offline cash settlements. SplitLedger AI does not independently verify banking UTR validity against central banking clearinghouses.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 12 */}
            {matchesSearch("Dynamic UPI Payments Banking Non Payment Gateway NBFC Escrow PIN Passwords") && (
              <section id="section-12" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-rose-500" />
                  <span>12. Dynamic UPI Payments &amp; Strict Non-Banking Disclaimers</span>
                </h2>
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-300 text-xs font-semibold leading-relaxed">
                  CRITICAL STATUTORY DISCLAIMER: SplitLedger AI is strictly an informational software utility. SplitLedger AI is NOT a Bank, NOT a Non-Banking Financial Company (NBFC), NOT a Payment Gateway, NOT a Payment Aggregator (PA), and NOT an Escrow Service under Reserve Bank of India (RBI) regulations or international banking directives.
                </div>
                <p>
                  By generating or scanning a Dynamic UPI QR code on the Platform, you acknowledge and agree to the following technical and legal realities:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Local URI Generation Only:</strong> SplitLedger AI solely formats and displays standard NPCI Universal UPI URI strings (<code>upi://pay?pa=...&amp;pn=...&amp;am=...&amp;cu=INR</code>) rendered as a QR code directly inside your client browser.</li>
                  <li><strong>Zero Monetary Custody:</strong> SplitLedger AI <strong>never receives, holds, touches, escrows, handles, or transfers money</strong>. No funds ever pass through our servers or corporate accounts.</li>
                  <li><strong>Zero Financial Credential Storage:</strong> SplitLedger AI <strong>never solicits, accesses, collects, or stores</strong> your UPI PIN, MPIN, ATM PIN, Net Banking passwords, debit/credit card numbers (PAN), or CVV.</li>
                  <li><strong>External Execution:</strong> All financial transactions execute exclusively inside your independently chosen third-party UPI application (e.g., Google Pay, PhonePe, Paytm, BHIM, Cred) directly between your bank account and the recipient&rsquo;s bank account.</li>
                  <li><strong>No Banking Proof:</strong> Marking a transaction as &ldquo;Paid&rdquo; in the Application is an internal bookkeeping update and does not constitute statutory banking proof of financial transfer.</li>
                </ul>
              </section>
            )}

            {/* Section 13 */}
            {matchesSearch("AI Features Assistant Receipt OCR Categorization Settlement Optimization Limitations Verification") && (
              <section id="section-13" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span>13. AI Features, Machine Processing &amp; Limitations</span>
                </h2>
                <p>
                  SplitLedger AI integrates artificial intelligence capabilities (AI Financial Assistant, OCR Receipt Scanning via Tesseract.js and OpenAI <code>gpt-4o</code>, Smart Categorization, and Debt Minimization algorithms) subject to the following binding conditions:
                </p>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Probabilistic Limitations of AI &amp; OCR:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Optical character recognition and large language model inference are inherently probabilistic. Extracted line items, tax calculations, or expense totals may contain errors, omissions, or misinterpretations caused by poor image resolution, crumpling, or non-standard receipt layouts.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Mandatory User Verification Obligation:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5"><strong>You are under a strict legal duty to review, verify, and correct all AI-extracted amounts, dates, merchant names, and itemized splits before saving an expense.</strong> SplitLedger AI disclaims all liability for incorrect splits or financial miscalculations caused by unverified AI suggestions.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">No Professional Financial Advice:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Outputs generated by the AI Financial Assistant are informational software calculations only and do not constitute certified accounting, financial planning, tax advice, or investment recommendations.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Zero Model Training:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Under our enterprise API terms, data processed through AI inference is processed ephemerally and is never used to train or refine public foundational AI models.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 14 */}
            {matchesSearch("Acceptable Use Allowed Activities") && (
              <section id="section-14" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  <span>14. Acceptable Use Policy</span>
                </h2>
                <p>You may use SplitLedger AI exclusively for lawful, legitimate purposes:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li>Tracking shared household, roommate, travel, dining, and collaborative personal project expenses.</li>
                  <li>Calculating mathematical debt reconciliations among consenting group members.</li>
                  <li>Generating informational UPI payment requests to reimburse legitimate shared expenses.</li>
                  <li>Exporting your personal financial ledger data in JSON, CSV, or PDF formats for personal accounting.</li>
                </ul>
              </section>
            )}

            {/* Section 15 */}
            {matchesSearch("Prohibited Activities Fraud Money Laundering Spam Unauthorized Reverse Engineering Abuse Fake Malicious") && (
              <section id="section-15" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Ban className="h-5 w-5 text-rose-500" />
                  <span>15. Strictly Prohibited Activities</span>
                </h2>
                <p>You agree not to engage in, facilitate, or promote any of the following prohibited conduct:</p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Financial Crimes:</strong> Utilizing the platform to facilitate money laundering, terrorist financing, tax evasion, fraudulent schemes, or unauthorized hawala transactions.</li>
                  <li><strong>Fictitious &amp; Fraudulent Expenses:</strong> Creating falsified, fabricated, or forged expense entries or receipt images to extort money from group members.</li>
                  <li><strong>Spam &amp; Harassment:</strong> Abusing the settlement reminder notification system to spam, threaten, or harass co-members via email or WhatsApp.</li>
                  <li><strong>Technical Attacks:</strong> Attempting to probe, scan, or breach the security of our infrastructure, bypassing authentication barriers (Clerk session checks), or executing denial-of-service (DoS) attacks.</li>
                  <li><strong>Reverse Engineering:</strong> Decompiling, reverse engineering, disassembling, or extracting the source code, proprietary algorithms (including min-cash-flow logic), or database schemas.</li>
                  <li><strong>Automated Scraping:</strong> Deploying web scrapers, spiders, bots, or automated crawlers without our explicit prior written consent.</li>
                  <li><strong>Malicious Code Uploads:</strong> Uploading receipts or files containing trojans, viruses, worms, ransomware, or corrupted media files.</li>
                  <li><strong>Unlawful Content:</strong> Submitting notes, comments, or expense descriptions containing defamatory, obscene, hateful, or abusive content.</li>
                </ul>
              </section>
            )}

            {/* Section 16 */}
            {matchesSearch("Third-Party Services Subprocessors Clerk Neon OpenAI Cloudinary Resend WhatsApp Vercel") && (
              <section id="section-16" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-purple-500" />
                  <span>16. Third-Party Services</span>
                </h2>
                <p>
                  The Application relies upon vetted enterprise third-party services for core operations. By using SplitLedger AI, you acknowledge that our Services operate in conjunction with:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Clerk, Inc.:</strong> User identity authentication, password hashing, and session management.</li>
                  <li><strong>Neon, Inc.:</strong> Serverless PostgreSQL cloud database storage and replication.</li>
                  <li><strong>OpenAI LLC:</strong> Natural language processing and structured OCR extraction.</li>
                  <li><strong>Cloudinary, Inc.:</strong> Cloud media hosting for receipt images and profile avatars.</li>
                  <li><strong>Resend, Inc.:</strong> Transactional email delivery for notifications and reminders.</li>
                  <li><strong>Meta Platforms, Inc. (WhatsApp Cloud API):</strong> Automated messaging alerts.</li>
                  <li><strong>Vercel, Inc.:</strong> Application edge hosting and serverless compute deployment.</li>
                </ul>
                <p className="text-xs text-slate-500 mt-2">
                  Each third-party service operates under its own legal terms and privacy policies. SplitLedger AI does not control and is not liable for disruptions, outages, or service modifications initiated by these external vendors.
                </p>
              </section>
            )}

            {/* Section 17 */}
            {matchesSearch("Intellectual Property Ownership Application Brand Logo Algorithms Database UI Source Code AI") && (
              <section id="section-17" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-blue-500" />
                  <span>17. Intellectual Property Rights</span>
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">A. Platform Ownership</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      The Application, including its source code, database architecture, design system, graphical components, algorithms (including the debt minimization algorithm), AI prompt chains, documentation, and the &ldquo;SplitLedger AI&rdquo; trademark and logo, are the exclusive intellectual property of <strong>[Company Legal Name]</strong>.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">B. Limited License to Users</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Subject to your continuous compliance with this Agreement, we grant you a limited, revocable, non-exclusive, non-transferable, non-sublicensable license to access and use the Platform for your personal, non-commercial expense tracking.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">C. Reservation of Rights</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      No intellectual property rights are conveyed or transferred to you, except for the explicit limited license set forth above. All rights not expressly granted are strictly reserved by [Company Legal Name].
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 18 */}
            {matchesSearch("User Content Ownership License Receipts Notes Comments Profile") && (
              <section id="section-18" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>18. User Content &amp; Grant of License</span>
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">A. Ownership of User Content</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      You retain all right, title, and ownership in and to the content you upload to the Application, including receipt photographs, expense notes, comments, budget parameters, and profile details.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">B. License Granted to SplitLedger AI</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      You grant SplitLedger AI a worldwide, non-exclusive, royalty-free, limited license to host, store, display, format, calculate, and transmit your User Content solely to the extent necessary to provide the Services, operate shared group ledgers, execute OCR parsing, and generate settlement requests.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">C. Content Warranty</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      You represent and warrant that you own or possess all requisite rights to upload the content, and that your submissions do not infringe upon any third-party privacy, copyright, or contractual rights.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 19 */}
            {matchesSearch("Account Suspension Temporary Permanent Termination Reasons") && (
              <section id="section-19" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  <span>19. Account Suspension &amp; Termination</span>
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">A. Suspension &amp; Termination by SplitLedger AI</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      We reserve the right, without prior notice or liability, to temporarily suspend or permanently terminate your access to the Application if:
                    </p>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-500">
                      <li>You breach any provision of this Agreement or our Privacy Policy;</li>
                      <li>You engage in fraudulent, deceptive, or abusive expense recording;</li>
                      <li>Required by law, regulatory authority, or judicial directive; or</li>
                      <li>Your actions jeopardize the security or operational integrity of the Platform.</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">B. Termination by User</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      You may terminate your Account at any time via Account Settings (<code>/dashboard/settings</code>) using our verified deletion workflow.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">C. Effect of Termination &amp; Ledger Anonymization</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Upon termination, your login access ceases and personal identifiers are removed or permanently anonymized. However, historical transaction totals (in paise) and split distributions are preserved in group ledgers to maintain the financial accuracy of remaining group members.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 20 */}
            {matchesSearch("Disclaimer of Warranties As Is As Available") && (
              <section id="section-20" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-amber-500" />
                  <span>20. Disclaimer of Warranties</span>
                </h2>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2 uppercase leading-relaxed">
                  <p>
                    THE APPLICATION, SERVICES, DYNAMIC UPI QR GENERATOR, AND AI FEATURES ARE PROVIDED STRICTLY ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
                  </p>
                  <p>
                    SPLITLEDGER AI AND [COMPANY LEGAL NAME] EXPRESSLY DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND ACCURACY OF MATHEMATICAL CALCULATIONS OR OCR EXTRACTIONS.
                  </p>
                  <p>
                    WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, TIMELY, ERROR-FREE, SECURE, OR FREE FROM VIRUSES OR DEFECTS.
                  </p>
                </div>
              </section>
            )}

            {/* Section 21 */}
            {matchesSearch("Limitation of Liability Ledger Collaboration Guarantee Bank Transfers Settlements") && (
              <section id="section-21" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-rose-500" />
                  <span>21. Limitation of Liability</span>
                </h2>
                <p>
                  To the maximum extent permitted by applicable law, in no event shall SplitLedger AI, [Company Legal Name], its founders, directors, employees, affiliates, or licensors be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, revenue, data, goodwill, or financial losses arising out of:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li>Failed, delayed, misdirected, or disputed bank transfers or UPI payments executed through external payment applications;</li>
                  <li>Inaccurate or fraudulent expense entries created by other Users within shared Groups;</li>
                  <li>Inaccuracies or hallucinations in AI-generated responses, receipt OCR extractions, or debt minimization proposals;</li>
                  <li>Unavailability or service interruptions of third-party cloud infrastructure (Clerk, Neon, OpenAI, Cloudinary, Resend, Meta WhatsApp, Vercel); or</li>
                  <li>Unauthorized access to your account resulting from compromised credentials.</li>
                </ul>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs">
                  <strong>Aggregate Liability Cap:</strong> In all circumstances, our total cumulative aggregate liability for all claims arising out of or related to this Agreement shall be limited to the amount paid by you to SplitLedger AI in the twelve (12) months preceding the claim, or <strong>₹1,000 INR</strong> (or $50 USD), whichever is lower.
                </div>
              </section>
            )}

            {/* Section 22 */}
            {matchesSearch("Indemnification Hold Harmless Claims") && (
              <section id="section-22" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-indigo-500" />
                  <span>22. Indemnification</span>
                </h2>
                <p>
                  You agree to defend, indemnify, and hold harmless SplitLedger AI, [Company Legal Name], its officers, directors, contractors, agents, and successors from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or related to:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li>Your access to or use of the Application and Services;</li>
                  <li>Your breach of any term, condition, representation, or warranty of this Agreement;</li>
                  <li>Any inaccurate, fraudulent, or disputed expense entries uploaded by you;</li>
                  <li>Disputes between you and any co-member regarding group debts, splits, or settlements; or</li>
                  <li>Your violation of any third-party right, including intellectual property or privacy rights.</li>
                </ul>
              </section>
            )}

            {/* Section 23 */}
            {matchesSearch("Privacy Data Protection Reference Policy") && (
              <section id="section-23" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-emerald-500" />
                  <span>23. Privacy &amp; Data Protection</span>
                </h2>
                <p>
                  Your privacy and personal data protection are governed by our official <Link href="/privacy" className="text-primary font-bold hover:underline">Privacy Policy</Link>, which is incorporated into and forms an integral part of this Agreement.
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  By using SplitLedger AI, you consent to the collection, processing, cross-border transmission, and storage of your personal data as detailed in the Privacy Policy in compliance with the Digital Personal Data Protection Act, 2023 (India), the General Data Protection Regulation (EU), and the California Consumer Privacy Act (CCPA).
                </p>
              </section>
            )}

            {/* Section 24 */}
            {matchesSearch("Changes to Terms Amendments Modifications") && (
              <section id="section-24" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <span>24. Changes &amp; Amendments to Terms</span>
                </h2>
                <p>
                  We reserve the right to amend, revise, or replace these Terms at our discretion. When revisions occur, the &ldquo;Last Updated&rdquo; date at the top of this document will be updated.
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  For material changes that alter user obligations or liability terms, we will provide advance notice via an in-app banner or email notification to your registered email address at least <strong>15 days</strong> prior to the effective date of the revised Terms. Your continued use of the Application following the effective date constitutes your binding acceptance of the updated Terms.
                </p>
              </section>
            )}

            {/* Section 25 */}
            {matchesSearch("Governing Law Jurisdiction") && (
              <section id="section-25" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-500" />
                  <span>25. Governing Law &amp; Jurisdiction</span>
                </h2>
                <p>
                  This Agreement, and any dispute, controversy, or claim arising out of or in connection with it or its subject matter, shall be governed by and construed in accordance with the laws of <strong>India [or State/Jurisdiction Placeholder]</strong>, without giving effect to any principles of conflicts of law.
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Subject to the dispute resolution provisions in Section 26, the courts of competent jurisdiction located at <strong>[City, State, Country Placeholder]</strong> shall have exclusive jurisdiction to settle any disputes arising out of or in connection with this Agreement.
                </p>
              </section>
            )}

            {/* Section 26 */}
            {matchesSearch("Dispute Resolution Arbitration Negotiation Class Action Waiver") && (
              <section id="section-26" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-indigo-500" />
                  <span>26. Dispute Resolution &amp; Arbitration</span>
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">A. Mandatory Informal Resolution</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Before initiating formal legal action, you agree to attempt in good faith to resolve any dispute informally by sending written notice detailing the controversy to <code>dipakpawar3747@gmail.com</code>. The parties agree to negotiate in good faith for a period of at least thirty (30) calendar days from receipt of such notice.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">B. Binding Arbitration</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      If informal negotiations fail, the dispute shall be resolved through final and binding arbitration administered in accordance with the Arbitration and Conciliation Act, 1996 [or designated Arbitration Rules Placeholder]. The arbitration seat and venue shall be [City, State, Country Placeholder], and the proceedings shall be conducted in the English language before a sole arbitrator appointed by mutual consent.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">C. Class Action &amp; Consolidated Proceedings Waiver</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      To the fullest extent permitted by law, you agree that any arbitration or proceeding shall be conducted solely on an individual basis, and you waive any right to bring or participate in any class action, collective arbitration, or representative proceeding against SplitLedger AI or [Company Legal Name].
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 27 */}
            {matchesSearch("Contact Information Support Email Legal Questions") && (
              <section id="section-27" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>27. Contact Information</span>
                </h2>
                <p>
                  If you have questions, inquiries, or notices regarding these Terms &amp; Conditions, please contact us at:
                </p>
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/70 space-y-2 text-xs">
                  <div><strong>Legal Entity:</strong> [Company Legal Name]</div>
                  <div><strong>Registered Office:</strong> [Registered Corporate Address, City, State, PIN/ZIP, Country]</div>
                  <div><strong>Official Support &amp; Legal Email:</strong> <a href="mailto:dipakpawar3747@gmail.com" className="text-primary hover:underline font-mono font-bold">dipakpawar3747@gmail.com</a></div>
                  <div><strong>Application Domain:</strong> <span className="font-mono">split-ledger-ai.vercel.app</span></div>
                  <div><strong>Statutory Inquiries Timeline:</strong> Formal notices are acknowledged within 24 hours of receipt.</div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

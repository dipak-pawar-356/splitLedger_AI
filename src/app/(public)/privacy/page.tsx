"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  Printer,
  ArrowLeft,
  Calendar,
  Lock,
  FileCheck,
  Database,
  Users,
  HardDrive,
  Trash2,
  Download,
  AlertCircle,
  Mail,
  QrCode,
  Sparkles,
  Cookie,
  Globe,
  Share2,
  Clock,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PrivacyPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeSection, setActiveSection] = React.useState("section-1");

  const sections = [
    { id: "section-1", title: "1. Title & Identification" },
    { id: "section-2", title: "2. Effective Date" },
    { id: "section-3", title: "3. Last Updated" },
    { id: "section-4", title: "4. Introduction" },
    { id: "section-5", title: "5. Definitions" },
    { id: "section-6", title: "6. Scope of this Policy" },
    { id: "section-7", title: "7. Information We Collect" },
    { id: "section-8", title: "8. How We Use Information" },
    { id: "section-9", title: "9. AI Features & Data Processing" },
    { id: "section-10", title: "10. Dynamic UPI QR Processing" },
    { id: "section-11", title: "11. Cookies & Local Storage" },
    { id: "section-12", title: "12. Third-Party Services" },
    { id: "section-13", title: "13. How We Share Information" },
    { id: "section-14", title: "14. Data Security" },
    { id: "section-15", title: "15. Data Retention" },
    { id: "section-16", title: "16. Account Deletion" },
    { id: "section-17", title: "17. Your Privacy Rights" },
    { id: "section-18", title: "18. Children's Privacy" },
    { id: "section-19", title: "19. International Data Transfers" },
    { id: "section-20", title: "20. Policy Updates" },
    { id: "section-21", title: "21. Contact & Grievance Redressal" },
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
            <Button variant="ghost" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
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
                placeholder="Search policy clauses..."
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
              <span>Print Document</span>
            </Button>
          </div>
        </div>

        {/* Title Header */}
        <div className="mb-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              Official Legal Document
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold border border-slate-200/60 dark:border-slate-800/60">
              GDPR • DPDP India • CCPA Ready
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Privacy Policy
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
              <FileCheck className="h-4 w-4 text-primary" />
              <span>Table of Contents</span>
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
              Direct Privacy Inquiries:{" "}
              <a href="mailto:privacy@splitledger.ai" className="text-primary font-bold hover:underline">
                privacy@splitledger.ai
              </a>
            </div>
          </aside>

          {/* ================= LEGAL CLAUSES CONTENT ================= */}
          <main className="lg:col-span-8 space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            {/* Section 1 */}
            {matchesSearch("Title Identification SplitLedger AI") && (
              <section id="section-1" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span>1. Title &amp; Identification of Data Fiduciary</span>
                </h2>
                <p>
                  This document constitutes the official <strong>Privacy Policy for SplitLedger AI</strong> (&ldquo;SplitLedger AI&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). SplitLedger AI operates as an intelligent group expense management, mathematical debt settlement, and personal financial record-keeping web platform.
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs">
                  <div><strong>Legal Entity:</strong> [Company Legal Name / Corporate Entity Name]</div>
                  <div><strong>Registered Corporate Address:</strong> [Registered Corporate Address, City, State, PIN/ZIP, Country]</div>
                  <div><strong>Corporate Identification:</strong> [CIN / Registration Number / Tax ID]</div>
                  <div><strong>Data Protection Designation:</strong> Data Fiduciary (under Section 2(i) of the Digital Personal Data Protection Act, 2023) and Data Controller (under Article 4(7) of the General Data Protection Regulation (EU) 2016/679).</div>
                </div>
              </section>
            )}

            {/* Section 2 & 3 */}
            {matchesSearch("Effective Date Last Updated") && (
              <section id="section-2" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-500" />
                  <span>2. Effective Date &amp; 3. Last Updated</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Effective Date</span>
                    <p className="text-slate-600 dark:text-slate-400 font-mono">January 1, 2026</p>
                    <p className="text-slate-500 text-[11px]">This Policy governs all user interactions originating on or after this date.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Last Updated</span>
                    <p className="text-slate-600 dark:text-slate-400 font-mono">October 16, 2026</p>
                    <p className="text-slate-500 text-[11px]">Reflects current technical architecture, timeline calculations, and dynamic UPI QR implementations.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 4 */}
            {matchesSearch("Introduction Overview Purpose Commitment") && (
              <section id="section-4" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-500" />
                  <span>4. Introduction</span>
                </h2>
                <p>
                  At SplitLedger AI, user trust, transparency, and data privacy form the architectural core of our service. We recognize that shared financial ledgers, household budgets, travel expenses, and personal finance notes involve sensitive personal context.
                </p>
                <p>
                  This Privacy Policy sets forth our mandatory practices regarding the collection, processing, storage, sharing, and protection of personal data. By accessing SplitLedger AI, registering an account, creating or joining a group, scanning a receipt, or interacting with our dynamic UPI settlement interfaces, you acknowledge the data practices described in this Policy.
                </p>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-xs">
                  <strong>Zero Commercial Sale Guarantee:</strong> SplitLedger AI does not sell, rent, monetize, or trade your personal or financial data to advertising brokers, data aggregators, or credit bureaus.
                </div>
              </section>
            )}

            {/* Section 5 */}
            {matchesSearch("Definitions Account Clerk Group Member Guest Settlement UPI Paired Data") && (
              <section id="section-5" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-amber-500" />
                  <span>5. Definitions</span>
                </h2>
                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Account&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">The authenticated personal identity profile established by a user through our third-party identity provider (Clerk, Inc.) and synchronized with our PostgreSQL database.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Data Principal / Data Subject&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">The natural person to whom the personal or financial data relates, who uses SplitLedger AI.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Financial Ledger Data&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">Records of transactions, expenses, split calculations, amounts in paise, categories, currencies, and settlements maintained within groups or personal ledgers.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Group&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">A shared collaborative ledger container created by a user to track collective expenses among multiple members (e.g. household, trip, project).</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Guest Member / Contact&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">An unauthenticated person represented in an individual or group ledger, created by a registered user to assign split shares prior to that person establishing an account.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-900 dark:text-white">&ldquo;Dynamic UPI QR Code&rdquo;</dt>
                    <dd className="text-slate-600 dark:text-slate-400">A locally rendered Quick Response matrix code encoding standard National Payments Corporation of India (NPCI) Universal UPI URI payment strings (`upi://pay`).</dd>
                  </div>
                </dl>
              </section>
            )}

            {/* Section 6 */}
            {matchesSearch("Scope of this Privacy Policy Platform APIs") && (
              <section id="section-6" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <span>6. Scope of this Privacy Policy</span>
                </h2>
                <p>
                  This Privacy Policy applies strictly to data processed through the SplitLedger AI web platform (`split-ledger-ai.vercel.app` and associated custom domains), our Progressive Web App interfaces, and our backend server actions.
                </p>
                <p className="text-xs text-slate-500">
                  <strong>Exclusions:</strong> This Policy does NOT apply to the independent privacy practices of third-party banking or payment applications (e.g., Google Pay, PhonePe, Paytm, BHIM, Cred, or your bank). When you initiate an external UPI transfer, your transaction is governed exclusively by the terms and privacy notices of those payment applications and your banking institution.
                </p>
              </section>
            )}

            {/* Section 7 */}
            {matchesSearch("Information We Collect Account Profile Financial Expenses Settlements Receipts AI Cookies Logs") && (
              <section id="section-7" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <span>7. Information We Collect</span>
                </h2>
                <p>
                  We collect only the data necessary to provide accurate mathematical ledger calculations, user authentication, receipt scanning, and P2P settlement communication:
                </p>

                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">A. Account &amp; Identity Data</span>
                    <p className="text-slate-600 dark:text-slate-400">Full name, email address, Clerk User ID (`clerk_user_id`), profile avatar image URL, default currency preference (e.g. INR), and UI theme selection.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">B. Extended Profile &amp; Contact Data (Optional)</span>
                    <p className="text-slate-600 dark:text-slate-400">Mobile phone number, secondary phone number, secondary email, WhatsApp contact number, Date of Birth, gender, occupation, company, city, state, country, PIN code, biography, and emergency contact name.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">C. Financial Identifiers</span>
                    <p className="text-slate-600 dark:text-slate-400">Primary Indian Virtual Payment Address / UPI ID (`upi_id`) configured to receive P2P settlements (e.g. `user@okhdfcbank`), and banking transaction reference numbers (UTR) entered for manual verification.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">D. Group &amp; Collaborative Membership Data</span>
                    <p className="text-slate-600 dark:text-slate-400">Group names, descriptions, cover images, group types (trip, friends, family, office), membership roles (owner, admin, member, viewer), delegated permission sets, nicknames, and join request approval logs.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">E. Guest Contact Information</span>
                    <p className="text-slate-600 dark:text-slate-400">Names, phone numbers, and email addresses of non-registered third parties entered manually by group members into the contacts table to assign shared expenses.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">F. Financial Ledger &amp; Transaction Records</span>
                    <p className="text-slate-600 dark:text-slate-400">Expense titles, item descriptions, amounts stored in paise, expense timestamps, category associations, payment methods (UPI, Cash, Card), split allocations (equal shares, percentages, exact amounts), and peer-to-peer settlement records.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">G. Uploaded Receipt Images &amp; Invoices</span>
                    <p className="text-slate-600 dark:text-slate-400">User-uploaded receipt photos and PDF invoices (max 10MB) stored securely in Cloudinary cloud media storage for optical character recognition.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">H. Financial Notes &amp; Journal Reflections</span>
                    <p className="text-slate-600 dark:text-slate-400">User-created personal financial notes, markdown memos, checklist items, and daily financial mood reflections (&ldquo;happy&rdquo;, &ldquo;stressed&rdquo;, &ldquo;calm&rdquo;).</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">I. Device Telemetry, Security Logs &amp; Cookies</span>
                    <p className="text-slate-600 dark:text-slate-400">IP address, browser type, operating system, user agent string, session authentication tokens (`__session`), login history timestamps, and audit log diffs.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 8 */}
            {matchesSearch("How We Use Information Purpose Processing Ledger Settlements") && (
              <section id="section-8" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                  <span>8. How We Use Your Information</span>
                </h2>
                <p>We process your data strictly under recognized lawful bases (contractual necessity, legitimate interest, and consent):</p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Core Ledger Computation:</strong> Calculating net balances, resolving multi-person debts via graph minimization algorithms, and maintaining immutable transaction version histories.</li>
                  <li><strong>Settlement Enablement:</strong> Constructing dynamic NPCI compliant UPI URI links (`upi://pay`) and rendering exact-amount QR codes.</li>
                  <li><strong>AI-Assisted Features:</strong> Performing optical character recognition on receipts and answering user-initiated financial queries.</li>
                  <li><strong>Transactional Notifications:</strong> Dispatching real-time in-app updates, email alerts, and optional WhatsApp notifications regarding new expenses, group invitations, and settlement reminders.</li>
                  <li><strong>Platform Security &amp; Compliance:</strong> Enforcing rate limiting, detecting unauthorized account access, maintaining administrative audit logs, and preventing fraudulent transactions.</li>
                </ul>
              </section>
            )}

            {/* Section 9 */}
            {matchesSearch("AI Features Data Processing Financial Assistant OCR OpenAI") && (
              <section id="section-9" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span>9. AI Features &amp; Data Processing</span>
                </h2>
                <p>
                  SplitLedger AI integrates artificial intelligence capabilities to minimize manual accounting labor:
                </p>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">AI Financial Assistant:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Processes user-entered questions by compiling a temporary, structured context from your personal ledger. Queries execute deterministic calculations over your data.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">OCR Receipt Scanning:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Uploaded receipt images are processed via Tesseract.js (local OCR) and forwarded to OpenAI API (`gpt-4o`) to extract structured JSON containing merchant names, line items, amounts, and GST figures.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Smart Categorization:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Natural language algorithms classify expense descriptions into standard categories (e.g. Dining, Travel, Groceries, Utilities).</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Debt Optimization:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Automated min-cash-flow algorithms analyze bilateral debts across group members to calculate simplified, mathematically optimal settlement pathways, minimizing the total number of inter-member transactions required.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1">
                  <strong>Zero Model Training:</strong> Under our enterprise API configuration with OpenAI LLC, data processed through the OpenAI API is NOT used to train, retrain, or improve foundational AI models.
                </div>
              </section>
            )}

            {/* Section 10 */}
            {matchesSearch("Dynamic UPI QR Processing Banking Non Payment Gateway") && (
              <section id="section-10" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-emerald-500" />
                  <span>10. Dynamic UPI QR Processing &amp; Non-Banking Disclosure</span>
                </h2>
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-300 text-xs font-semibold leading-relaxed">
                  CRITICAL FINANCIAL NOTICE: SplitLedger AI is NOT a Bank, NOT a Non-Banking Financial Company (NBFC), NOT a Payment Aggregator (PA), and NOT an Escrow Service under Reserve Bank of India (RBI) regulations or international banking directives.
                </div>
                <p>
                  SplitLedger AI does NOT hold, process, transfer, custody, or transmit money. Our dynamic QR generator functions solely as an in-browser graphical utility that formats standard NPCI URI strings (`upi://pay?pa=...&amp;pn=...&amp;am=...&amp;cu=INR`).
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li>We <strong>NEVER</strong> solicit, access, collect, or store your UPI PIN, MPIN, ATM PIN, Net Banking passwords, or debit/credit card numbers.</li>
                  <li>When you click &ldquo;Pay Now&rdquo; or scan a QR code, the entire financial transfer executes strictly between your bank and the recipient&rsquo;s bank inside your selected UPI application.</li>
                  <li>Marking a transaction as &ldquo;Paid&rdquo; inside SplitLedger AI is an informational record update; it does not constitute official banking proof of funds transfer.</li>
                </ul>
              </section>
            )}

            {/* Section 11 */}
            {matchesSearch("Cookies Local Storage Session Tokens") && (
              <section id="section-11" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Cookie className="h-5 w-5 text-amber-500" />
                  <span>11. Cookies &amp; Local Storage</span>
                </h2>
                <p>We deploy strictly necessary and functional browser cookies and storage items:</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200/70 dark:border-slate-800/70 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-slate-950 font-bold border-b border-slate-200/70 dark:border-slate-800/70">
                      <tr>
                        <th className="p-2.5">Identifier</th>
                        <th className="p-2.5">Provider</th>
                        <th className="p-2.5">Type &amp; Purpose</th>
                        <th className="p-2.5">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                      <tr>
                        <td className="p-2.5 font-mono">__session</td>
                        <td className="p-2.5">Clerk, Inc.</td>
                        <td className="p-2.5">Authentication JWT session token</td>
                        <td className="p-2.5">14 days</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono">__clerk_db_jwt</td>
                        <td className="p-2.5">Clerk, Inc.</td>
                        <td className="p-2.5">Database user sync authorization</td>
                        <td className="p-2.5">Session</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono">theme</td>
                        <td className="p-2.5">Application</td>
                        <td className="p-2.5">Light / Dark theme preference</td>
                        <td className="p-2.5">1 year</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono">splitledger-offline-queue</td>
                        <td className="p-2.5">LocalStorage</td>
                        <td className="p-2.5">Offline transaction sync queue</td>
                        <td className="p-2.5">Persistent</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Section 12 */}
            {matchesSearch("Third-Party Services Subprocessors Clerk Neon OpenAI Cloudinary Resend WhatsApp Vercel") && (
              <section id="section-12" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-purple-500" />
                  <span>12. Third-Party Services &amp; Subprocessors</span>
                </h2>
                <p>We transfer data strictly to vetted enterprise cloud providers subject to Data Protection Agreements:</p>
                <div className="space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 gap-1">
                    <span className="font-bold text-slate-900 dark:text-white">Clerk, Inc. (San Francisco, USA)</span>
                    <span className="text-slate-500">Authentication, user accounts, password hashing, 2FA</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 gap-1">
                    <span className="font-bold text-slate-900 dark:text-white">Neon, Inc. (San Francisco, USA)</span>
                    <span className="text-slate-500">Encrypted serverless PostgreSQL cloud database storage</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 gap-1">
                    <span className="font-bold text-slate-900 dark:text-white">OpenAI LLC (San Francisco, USA)</span>
                    <span className="text-slate-500">Natural language inference &amp; receipt text structuring</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 gap-1">
                    <span className="font-bold text-slate-900 dark:text-white">Cloudinary, Inc. (Santa Clara, USA)</span>
                    <span className="text-slate-500">Receipt image files and profile avatar hosting</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 gap-1">
                    <span className="font-bold text-slate-900 dark:text-white">Resend, Inc. (San Francisco, USA)</span>
                    <span className="text-slate-500">Transactional email delivery for settlement reminders</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 gap-1">
                    <span className="font-bold text-slate-900 dark:text-white">Meta Platforms, Inc. (Menlo Park, USA)</span>
                    <span className="text-slate-500">WhatsApp Cloud API for automated payment alerts</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 gap-1">
                    <span className="font-bold text-slate-900 dark:text-white">Vercel, Inc. (San Francisco, USA)</span>
                    <span className="text-slate-500">Application edge deployment and serverless execution</span>
                  </div>
                </div>
              </section>
            )}

            {/* Section 13 */}
            {matchesSearch("How We Share Information Group Members Disclosure") && (
              <section id="section-13" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-indigo-500" />
                  <span>13. How We Share Information</span>
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">A. Visibility Among Group Members</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      When you accept an invitation or join a group, your full name, avatar, expenses created, assigned split shares, and configured UPI ID become visible to all active members of that specific group to enable ledger accountability.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">B. Subprocessor Fulfillment</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Data is shared with subprocessors identified in Section 12 solely to execute required platform computations and communications.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">C. Statutory &amp; Law Enforcement Compliance</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      We may disclose user data if required under applicable Indian laws (such as a lawful directive issued under Section 69A of the Information Technology Act) or valid judicial process.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 14 */}
            {matchesSearch("Data Security Encryption AES-256 TLS 1.3 RBAC Rate Limiting") && (
              <section id="section-14" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-500" />
                  <span>14. Data Security Protocols</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Encryption at Rest &amp; in Transit</span>
                    <p className="text-slate-500">All database volumes are encrypted using 256-bit AES via Neon. All web traffic is strictly encrypted using Transport Layer Security (TLS 1.3) with HTTP Strict Transport Security (HSTS).</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Application Security &amp; RBAC</span>
                    <p className="text-slate-500">Every backend server action enforces mandatory session verification (`requireAuth()`), parameter sanitization, parameterized SQL queries, in-memory rate limiting, and circular threat monitoring.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 15 */}
            {matchesSearch("Data Retention Financial Ledger Preservation Audit") && (
              <section id="section-15" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span>15. Data Retention Policies</span>
                </h2>
                <p>
                  We retain personal data and financial records for as long as your account remains active.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Ledger Integrity:</strong> To prevent financial distortion for other group members, historical transaction amounts, split percentages, and completed settlement records are maintained as permanent ledger entries.</li>
                  <li><strong>Audit Logs:</strong> Operational audit trail records (`audit_logs` and `admin_actions`) are retained for 180 to 365 days for dispute resolution and security forensics.</li>
                  <li><strong>Soft-Deleted Entities:</strong> Transactions or groups marked as deleted remain soft-flagged in database tables to support transactional rollback and accounting audits.</li>
                </ul>
              </section>
            )}

            {/* Section 16 */}
            {matchesSearch("Account Deletion Flow Right to Erasure Anonymization") && (
              <section id="section-16" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-rose-500" />
                  <span>16. Account Deletion &amp; Anonymization Architecture</span>
                </h2>
                <p>
                  You may request account deletion anytime directly in Account Settings (`/dashboard/settings`). We implement a legally verified two-tier deletion pipeline (`src/actions/account.ts`):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <span className="font-bold text-slate-900 dark:text-white">1. Soft Deactivation</span>
                    <p className="text-slate-500">Your profile status is immediately set to &ldquo;deactivated&rdquo;. Your session tokens are terminated, and your profile is hidden from active member search.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <span className="font-bold text-slate-900 dark:text-white">2. Permanent Anonymization</span>
                    <p className="text-slate-500">Your personal identity is severed. Your name is replaced with &ldquo;Deleted User&rdquo;, avatar is removed, and all phone numbers, secondary emails, and bios are permanently nullified in database tables, while preserving numerical balance totals to protect the financial accuracy of remaining group members.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 17 */}
            {matchesSearch("Your Privacy Rights GDPR DPDP CCPA Portability Export Erasure") && (
              <section id="section-17" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="h-5 w-5 text-emerald-500" />
                  <span>17. Your Privacy Rights (GDPR, DPDP India &amp; CCPA)</span>
                </h2>
                <p>Depending on your geographic residency, you possess comprehensive statutory data rights:</p>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Rights under India DPDP Act 2023:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Right to access summary of personal data; right to correction and completion of inaccurate data; right to erasure; right to grievance redressal; and right to nominate an authorized representative.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Rights under GDPR (EU &amp; UK):</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Right to Access (Art. 15); Right to Rectification (Art. 16); Right to Erasure / &ldquo;Right to be Forgotten&rdquo; (Art. 17); Right to Restriction of Processing (Art. 18); Right to Data Portability (Art. 20 via our instant JSON/CSV export tool); and Right to Object (Art. 21).</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Rights under CCPA / CPRA (California):</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Right to know categories of collected personal information; right to delete personal information; right to correct inaccurate personal data; and right against retaliation or discrimination for exercising privacy rights.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 18 */}
            {matchesSearch("Children Privacy Age Restriction 18") && (
              <section id="section-18" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <span>18. Children&apos;s Privacy (18+ Requirement)</span>
                </h2>
                <p>
                  SplitLedger AI provides financial ledger and debt calculation services intended strictly for adults capable of entering into legally binding contracts. In compliance with the India Digital Personal Data Protection Act, 2023 and child data protection frameworks:
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  You must be at least <strong>18 years of age</strong> (or the age of legal majority in your jurisdiction) to register an account or create groups. We do not knowingly collect personal data from minors. If we discover that a minor under 18 has registered an account, we will immediately terminate the account and purge associated identifying data.
                </div>
              </section>
            )}

            {/* Section 19 */}
            {matchesSearch("International Data Transfers Cross-Border Neon Clerk OpenAI") && (
              <section id="section-19" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <span>19. International Data Transfers</span>
                </h2>
                <p>
                  SplitLedger AI operates globally. While users may access our platform from India, Europe, or the United States, our primary cloud infrastructure, authentication services (Clerk), and database clusters (Neon) are hosted within secure enterprise data centers located in the United States and European cloud regions.
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  When cross-border transfers occur, we implement recognized transfer safeguards, including Standard Contractual Clauses (SCCs) approved by the European Commission and compliance with statutory cross-border transfer rules prescribed under the India DPDP Act.
                </p>
              </section>
            )}

            {/* Section 20 */}
            {matchesSearch("Policy Updates Changes Notice") && (
              <section id="section-20" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <span>20. Policy Updates &amp; Amendments</span>
                </h2>
                <p>
                  We may periodically revise this Privacy Policy to reflect platform feature updates, AI subsystem enhancements, or statutory regulatory amendments. When changes are made, the &ldquo;Last Updated&rdquo; date at the top of this Policy will be revised.
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  For material modifications impacting user rights or data processing scopes, we will provide advance notice through prominent in-app banners or transactional email notifications at least 15 days before changes take effect.
                </p>
              </section>
            )}

            {/* Section 21 */}
            {matchesSearch("Contact Information Grievance Redressal DPO Officer Email") && (
              <section id="section-21" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>21. Contact Information &amp; Grievance Redressal</span>
                </h2>
                <p>
                  In accordance with the India Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023, and international privacy regulations, the contact details of our designated Data Protection Officer and Grievance Officer are set forth below:
                </p>
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/70 space-y-2 text-xs">
                  <div><strong>Designated Grievance Officer:</strong> [Grievance Officer Name / Legal Counsel]</div>
                  <div><strong>Data Protection Officer (DPO):</strong> [Data Protection Officer Name / Compliance Head]</div>
                  <div><strong>Official Privacy Email:</strong> <a href="mailto:privacy@splitledger.ai" className="text-primary hover:underline font-mono">privacy@splitledger.ai</a></div>
                  <div><strong>Customer Support Desk:</strong> <a href="mailto:support@splitledger.ai" className="text-primary hover:underline font-mono">support@splitledger.ai</a></div>
                  <div><strong>Mailing Address:</strong> [Physical Corporate Address, Attn: Grievance Officer, City, State, PIN/ZIP, Country]</div>
                  <div><strong>Statutory Redressal Timeline:</strong> All privacy grievances and data requests are acknowledged within 24 hours and resolved within 30 calendar days.</div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}


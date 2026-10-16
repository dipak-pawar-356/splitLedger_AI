"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  Printer,
  ArrowLeft,
  Calendar,
  Scale,
  Copyright,
  Code,
  Cpu,
  Database,
  FileText,
  UserCheck,
  Package,
  CheckCircle2,
  Ban,
  AlertTriangle,
  Gavel,
  Lock,
  Mail,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CopyrightPolicyPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeSection, setActiveSection] = React.useState("section-1");

  const sections = [
    { id: "section-1", title: "1. Title & Identification" },
    { id: "section-2", title: "2. Effective Date" },
    { id: "section-3", title: "3. Last Updated" },
    { id: "section-4", title: "4. Introduction & Purpose" },
    { id: "section-5", title: "5. Ownership of SplitLedger AI" },
    { id: "section-6", title: "6. Copyright Notice & Scope" },
    { id: "section-7", title: "7. Trademark Rights & Branding" },
    { id: "section-8", title: "8. Source Code Ownership" },
    { id: "section-9", title: "9. Proprietary Algorithms & AI Models" },
    { id: "section-10", title: "10. Database Rights & Architecture" },
    { id: "section-11", title: "11. User Content Ownership" },
    { id: "section-12", title: "12. License Granted by Users" },
    { id: "section-13", title: "13. Open Source Components" },
    { id: "section-14", title: "14. Permitted Uses" },
    { id: "section-15", title: "15. Strictly Prohibited Activities" },
    { id: "section-16", title: "16. Copyright Infringement Reporting" },
    { id: "section-17", title: "17. Enforcement & Legal Remedies" },
    { id: "section-18", title: "18. Termination for IP Violations" },
    { id: "section-19", title: "19. Reservation of Rights" },
    { id: "section-20", title: "20. Amendments to this Policy" },
    { id: "section-21", title: "21. Contact Information & Legal Agent" },
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
                placeholder="Search IP policy clauses..."
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
              <span>Print Policy</span>
            </Button>
          </div>
        </div>

        {/* Title Header */}
        <div className="mb-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              Official Legal Policy
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold border border-slate-200/60 dark:border-slate-800/60">
              Copyright • Trademark • Software Licensing • Berne Convention
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Copyright &amp; Intellectual Property Policy
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
              <span>IP Policy Index</span>
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
              Designated IP Agent:{" "}
              <a href="mailto:dipakpawar3747@gmail.com" className="text-primary font-bold hover:underline">
                dipakpawar3747@gmail.com
              </a>
            </div>
          </aside>

          {/* ================= LEGAL CLAUSES CONTENT ================= */}
          <main className="lg:col-span-8 space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            {/* Section 1 */}
            {matchesSearch("Title Identification SplitLedger AI Platform") && (
              <section id="section-1" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Copyright className="h-5 w-5 text-primary" />
                  <span>1. Title &amp; Identification of the Platform</span>
                </h2>
                <p>
                  This official <strong>Copyright and Intellectual Property Policy</strong> (&ldquo;<strong>IP Policy</strong>&rdquo;) governs the intellectual property rights, proprietary assets, copyright protections, trademark designations, and software licensing frameworks relating to <strong>SplitLedger AI</strong> (&ldquo;<strong>SplitLedger AI</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>us</strong>&rdquo;, or &ldquo;<strong>our</strong>&rdquo;), operated by <strong>[Company Legal Name]</strong>, accessible at <code>split-ledger-ai.vercel.app</code> and associated domains (the &ldquo;<strong>Application</strong>&rdquo; or &ldquo;<strong>Platform</strong>&rdquo;).
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs">
                  <div><strong>Legal Entity:</strong> [Company Legal Name / Corporate Entity Name]</div>
                  <div><strong>Registered Corporate Office:</strong> [Registered Corporate Address, City, State, PIN/ZIP, Country]</div>
                  <div><strong>Corporate Identification:</strong> [CIN / Registration Number / Tax ID]</div>
                  <div><strong>Designated IP &amp; Legal Agent:</strong> dipakpawar3747@gmail.com</div>
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
                    <p className="text-slate-500 text-[11px]">This Policy governs all source code, algorithms, visual interfaces, and user content originating on or after this date.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Last Updated</span>
                    <p className="text-slate-600 dark:text-slate-400 font-mono">October 16, 2026</p>
                    <p className="text-slate-500 text-[11px]">Comprehensive audit establishing protections for proprietary AI prompt orchestration, database schemas, and debt minimization engines.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 4 */}
            {matchesSearch("Introduction Purpose Protecting Intellectual Property") && (
              <section id="section-4" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <span>4. Introduction &amp; Purpose</span>
                </h2>
                <p>
                  SplitLedger AI represents substantial investments in software architecture, algorithm design, precision integer accounting models, receipt computer vision workflows, and user interface engineering. The purpose of this IP Policy is to establish the clear legal boundaries protecting our proprietary technology, trademarks, and code, while providing transparent assurances regarding user content ownership and compliance with open-source licensing.
                </p>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-xs">
                  <strong>Clear Ownership Boundary:</strong> We distinguish unequivocally between (a) our proprietary software platform, source code, and algorithms, (b) third-party open-source components, (c) external AI cloud providers, and (d) content submitted by Users. Users retain 100% ownership of their personal financial records and uploaded receipts.
                </div>
              </section>
            )}

            {/* Section 5 */}
            {matchesSearch("Ownership SplitLedger AI Application Website User Interface Design Brand Assets Business Logic") && (
              <section id="section-5" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-500" />
                  <span>5. Ownership of SplitLedger AI</span>
                </h2>
                <p>
                  Unless otherwise explicitly stated in writing, all right, title, and interest in and to SplitLedger AI, throughout the world in perpetuity, are and shall remain the exclusive property of <strong>[Company Legal Name]</strong>. This proprietary ownership encompasses:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Software &amp; Web Platform</span>
                    <p className="text-slate-500 mt-0.5">The complete web application, mobile progressive web app (PWA), backend services, and serverless edge functions.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">User Interface &amp; Design System</span>
                    <p className="text-slate-500 mt-0.5">Visual layouts, glassmorphic styling tokens, dark/light themes, typography choices, and responsive viewport grid structures.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Brand Assets &amp; Visual Identity</span>
                    <p className="text-slate-500 mt-0.5">Logos, wordmarks, brand icons, color palettes, visual badges, marketing graphics, and custom illustrations.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Business Logic &amp; Custom Components</span>
                    <p className="text-slate-500 mt-0.5">Ledger state machines, group permission matrices, approval workflows, and interactive financial dashboard widgets.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 6 */}
            {matchesSearch("Copyright Notice Text Graphics UI Designs Icons Logos Illustrations Documentation") && (
              <section id="section-6" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Copyright className="h-5 w-5 text-primary" />
                  <span>6. Copyright Notice &amp; Scope of Protection</span>
                </h2>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white">
                  &copy; 2026 [Company Legal Name] / SplitLedger AI. All rights reserved.
                </div>
                <p>
                  All original content, designs, code, and documentation comprising SplitLedger AI are protected as original literary, artistic, and software works under the Indian Copyright Act, 1957, the United States Copyright Act of 1976 (Title 17, U.S. Code), the Berne Convention for the Protection of Literary and Artistic Works, and the Universal Copyright Convention:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Text &amp; Literary Works:</strong> User documentation, help guides, onboarding tooltips, system error messages, and legal policies.</li>
                  <li><strong>Artistic &amp; Graphic Works:</strong> Custom icons, SVG illustrations, dashboard visualizations, balance charts, and layout mockups.</li>
                  <li><strong>Software Code:</strong> Source code, compiled bytecode, client JavaScript bundles, server actions, and build configuration files.</li>
                  <li><strong>Compilation &amp; Database Architecture:</strong> The selection, arrangement, coordination, and structural compilation of our database schemas and UI views.</li>
                </ul>
              </section>
            )}

            {/* Section 7 */}
            {matchesSearch("Trademarks SplitLedger AI Logos Brand Identity Product Names Service Taglines") && (
              <section id="section-7" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-500" />
                  <span>7. Trademark Rights &amp; Branding</span>
                </h2>
                <p>
                  &ldquo;<strong>SplitLedger AI</strong>&rdquo;, the SplitLedger AI logo, stylized mark, sparkle emblem, product titles, service names, and taglines are trademarks and service marks of <strong>[Company Legal Name]</strong>:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Prohibition on Unauthorized Use:</strong> You may not use, copy, reproduce, republish, upload, post, transmit, or distribute our trademarks, service marks, or logos without our express prior written permission.</li>
                  <li><strong>Confusion &amp; Disparagement:</strong> You may not use any trademark, service mark, domain name, or social media handle that is confusingly similar to &ldquo;SplitLedger AI&rdquo; or in any manner that disparages or discredits the Platform.</li>
                  <li><strong>Trade Dress Protection:</strong> The overall look and feel, color combinations, button styles, and interactive behavior of SplitLedger AI constitute protected trade dress.</li>
                </ul>
              </section>
            )}

            {/* Section 8 */}
            {matchesSearch("Source Code Ownership Frontend Backend Server Actions APIs Authentication Security Payment") && (
              <section id="section-8" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Code className="h-5 w-5 text-emerald-500" />
                  <span>8. Source Code Ownership &amp; Architecture</span>
                </h2>
                <p>
                  All proprietary source code developed for SplitLedger AI is the exclusive intellectual property of [Company Legal Name]. This proprietary code repository includes:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Frontend Architecture:</span>
                    <p className="text-slate-500 mt-0.5">All React components, Next.js App Router layouts, custom state management hooks, responsive client utilities, and interactive modal dialogs.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Backend Server Actions &amp; APIs:</span>
                    <p className="text-slate-500 mt-0.5">All server actions (<code>src/actions/*</code>) executing atomic database transactions, financial record mutations, and role authorization checks.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Security &amp; Payment Mechanics:</span>
                    <p className="text-slate-500 mt-0.5">Clerk session validation guards (<code>requireAuth()</code>), CSRF mitigation, in-memory rate limiters, input sanitizers, and NPCI Universal UPI URI generation code.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 9 */}
            {matchesSearch("Algorithms AI Models Expense Splitting Settlement Debt Optimization OCR Categorization") && (
              <section id="section-9" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-amber-500" />
                  <span>9. Proprietary Algorithms &amp; AI Implementations</span>
                </h2>
                <p>
                  SplitLedger AI contains specialized mathematical logic and AI workflow integrations developed specifically for shared financial operations:
                </p>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Mathematical Ledger &amp; Optimization Algorithms:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Our proprietary min-cash-flow graph reduction algorithms, integer-based paise split apportionments, historical recalculation formulas, and multi-currency conversion pipelines.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">AI Financial Assistant &amp; Prompt Orchestration:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Our proprietary context assembly pipelines, system prompt architectures, financial schema constraints, and deterministic calculation validators.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Receipt OCR &amp; Categorization Pipeline:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Our hybrid client-side optical character recognition (Tesseract.js) and structured JSON parsing pipelines converting noisy receipt scans into validated database entities.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs">
                  <strong>Third-Party Model Distinction:</strong> While SplitLedger AI utilizes third-party AI models (such as OpenAI <code>gpt-4o</code>) for raw natural language inference, the application&apos;s proprietary prompt templates, workflow orchestrations, categorization rules, and algorithmic balance engines remain the exclusive intellectual property of SplitLedger AI.
                </div>
              </section>
            )}

            {/* Section 10 */}
            {matchesSearch("Database Rights Architecture Schema Relationships Indexes Drizzle") && (
              <section id="section-10" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  <span>10. Database Rights &amp; Schema Architecture</span>
                </h2>
                <p>
                  The architectural design, relational schema, table structures, foreign key constraints, composite indexes, query models, and audit logs constituting our database (41 relational tables defined in Drizzle ORM and hosted on Neon Serverless PostgreSQL) are original compilations and trade secrets of [Company Legal Name].
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <strong>Clear Legal Distinction:</strong> Users own their individual submitted records (e.g. specific transaction numbers, personal names, notes). However, the structural arrangement, schema mappings, integer-based accounting formulas, and relational data architecture are protected under database rights and copyright law.
                </div>
              </section>
            )}

            {/* Section 11 */}
            {matchesSearch("User Content Ownership Profile Expense Records Receipts Comments Notes Journal") && (
              <section id="section-11" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                  <span>11. User Content Ownership</span>
                </h2>
                <p>
                  SplitLedger AI recognizes and respects the intellectual property rights of its users. <strong>You retain 100% of your ownership, title, copyright, and intellectual property rights in and to any content you upload, submit, or record on the Platform</strong>, including:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li>Your user profile information, biographical notes, and avatar images;</li>
                  <li>Your expense titles, line-item descriptions, and split allocation amounts;</li>
                  <li>Photographs of physical receipts, digital invoices, and PDF payment bills;</li>
                  <li>Personal financial notes, journal reflections, checklist memos, and comments; and</li>
                  <li>Any other personal or collaborative financial data submitted by you.</li>
                </ul>
              </section>
            )}

            {/* Section 12 */}
            {matchesSearch("License Granted by Users Store Display Process Analyze Backup Secure") && (
              <section id="section-12" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>12. Limited Operational License Granted by Users</span>
                </h2>
                <p>
                  To enable SplitLedger AI to perform mathematical computations, display shared ledgers to your group members, and execute AI features, you grant SplitLedger AI a limited, worldwide, non-exclusive, royalty-free, revocable license solely to:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li>Host, store, display, format, calculate, and transmit your User Content within your designated groups;</li>
                  <li>Process uploaded receipt images through optical character recognition and AI structuring;</li>
                  <li>Execute automated debt minimization and balance optimization calculations; and</li>
                  <li>Maintain secure automated database backups and encrypted storage volumes.</li>
                </ul>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                  No Ownership Transfer: This operational license does NOT transfer ownership of your data to SplitLedger AI. Furthermore, our enterprise AI configuration ensures your data is NEVER used to train public machine learning models.
                </div>
              </section>
            )}

            {/* Section 13 */}
            {matchesSearch("Open Source Components React Next.js Drizzle Lucide Tailwind Radix") && (
              <section id="section-13" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" />
                  <span>13. Open Source Software Compliance</span>
                </h2>
                <p>
                  SplitLedger AI is developed using industry-standard open-source software libraries, including React, Next.js, Drizzle ORM, Lucide React icons, Radix UI primitives, and Tailwind CSS utilities:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Third-Party Ownership:</strong> Each open-source library remains the intellectual property of its respective original author and contributors.</li>
                  <li><strong>License Compliance:</strong> Open-source components are utilized strictly under their applicable open-source licenses (such as MIT, Apache 2.0, or BSD-3-Clause).</li>
                  <li><strong>No Claim Over Dependencies:</strong> SplitLedger AI does not claim ownership, copyright, or exclusive rights over any open-source dependency. Our intellectual property protections apply exclusively to original source code and architectures developed for SplitLedger AI.</li>
                </ul>
              </section>
            )}

            {/* Section 14 */}
            {matchesSearch("Permitted Uses Allowed") && (
              <section id="section-14" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>14. Permitted Uses &amp; User License</span>
                </h2>
                <p>Subject to continuous compliance with this IP Policy and our Terms of Service, you are granted a personal, revocable, non-exclusive, non-transferable, non-sublicensable limited license to:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <li>Access and use the Application through modern, standard web browsers on desktop and mobile devices;</li>
                  <li>Create, manage, and participate in collaborative expense groups and personal ledgers;</li>
                  <li>Generate and display dynamic NPCI Universal UPI payment request QR codes; and</li>
                  <li>Export your personal financial ledger data in JSON, CSV, or PDF formats using our data portability tools.</li>
                </ul>
              </section>
            )}

            {/* Section 15 */}
            {matchesSearch("Prohibited Activities Copying Reverse Engineering Decompiling Scraping") && (
              <section id="section-15" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Ban className="h-5 w-5 text-rose-500" />
                  <span>15. Strictly Prohibited Activities</span>
                </h2>
                <p>Except as expressly authorized by mandatory statutory law, you are strictly prohibited from:</p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Reverse Engineering:</strong> Decompiling, disassembling, reverse engineering, or attempting to reconstruct the source code, underlying logic, or database structures of the Application.</li>
                  <li><strong>Code Plagiarism &amp; Cloning:</strong> Copying, redistributing, reselling, sublicensing, or mirroring the Application&apos;s UI designs, component code, or algorithmic calculations.</li>
                  <li><strong>Automated Extraction:</strong> Using spiders, scrapers, data-mining robots, or automated tools to extract data, schemas, prompt templates, or graphics from SplitLedger AI.</li>
                  <li><strong>Trademark Infringement:</strong> Using &ldquo;SplitLedger AI&rdquo; or confusingly similar trademarks in any software, domain name, or advertising campaign without written license.</li>
                  <li><strong>Removal of Notices:</strong> Removing, obscuring, or altering any copyright notices, trademark symbols, digital watermarks, or proprietary notices appearing on the Platform.</li>
                  <li><strong>Derivative Works:</strong> Creating derivative works, competing clones, or unauthorized third-party client wrappers based on SplitLedger AI.</li>
                </ul>
              </section>
            )}

            {/* Section 16 */}
            {matchesSearch("Copyright Infringement Reporting Notice Takedown DMCA Procedure") && (
              <section id="section-16" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>16. Copyright Infringement Reporting &amp; Takedown Procedure</span>
                </h2>
                <p>
                  If you are a copyright owner or an agent thereof and believe that any content hosted on SplitLedger AI infringes upon your copyright, you may submit a formal notification to our Designated Copyright Agent at <code>dipakpawar3747@gmail.com</code> containing the following details:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li>A physical or electronic signature of a person authorized to act on behalf of the owner of the copyright;</li>
                  <li>Identification of the copyrighted work claimed to have been infringed;</li>
                  <li>Identification of the material that is claimed to be infringing and its exact URL or location on SplitLedger AI;</li>
                  <li>Your full legal name, physical mailing address, telephone number, and official email address;</li>
                  <li>A statement that you have a good-faith belief that use of the material is not authorized by the copyright owner, its agent, or the law; and</li>
                  <li>A statement, made under penalty of perjury, that the information in the notification is accurate and that you are authorized to act on behalf of the copyright owner.</li>
                </ol>
              </section>
            )}

            {/* Section 17 */}
            {matchesSearch("Enforcement Legal Remedies Civil Damages Injunction") && (
              <section id="section-17" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-indigo-500" />
                  <span>17. Enforcement &amp; Legal Remedies</span>
                </h2>
                <p>
                  [Company Legal Name] aggressively protects its intellectual property rights. In the event of confirmed infringement, theft of source code, or unauthorized reverse engineering:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Immediate Content Removal:</strong> Prompt removal or disabling of access to infringing material.</li>
                  <li><strong>Account Deactivation:</strong> Immediate suspension or permanent termination of the infringing user account.</li>
                  <li><strong>Civil Litigation:</strong> Legal action in competent courts for actual damages, statutory damages, disgorgement of profits, and legal costs.</li>
                  <li><strong>Injunctive Relief:</strong> Seeking emergency preliminary and permanent court injunctions to halt unauthorized code distribution or trademark misuse.</li>
                </ul>
              </section>
            )}

            {/* Section 18 */}
            {matchesSearch("Termination IP Violations Repeat Infringer") && (
              <section id="section-18" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-rose-500" />
                  <span>18. Termination for Intellectual Property Violations</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  We enforce a strict repeat infringer policy. Any user who repeatedly violates third-party copyrights or attempts to scrape, steal, or decompile SplitLedger AI&apos;s proprietary code will have their account immediately and permanently terminated without opportunity for reinstatement.
                </p>
              </section>
            )}

            {/* Section 19 */}
            {matchesSearch("Reservation of Rights") && (
              <section id="section-19" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span>19. Reservation of Rights</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  All rights, titles, and interests not expressly granted to users in this IP Policy or in our Terms of Service are strictly and exclusively reserved by [Company Legal Name]. No license or right shall arise by implication, estoppel, or otherwise.
                </p>
              </section>
            )}

            {/* Section 20 */}
            {matchesSearch("Amendments Policy Changes Updates") && (
              <section id="section-20" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <span>20. Amendments &amp; Modifications to this Policy</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  We may periodically revise this IP Policy to reflect new software capabilities, patent filings, trademark registrations, or statutory copyright developments. When changes occur, the &ldquo;Last Updated&rdquo; date at the top of this document will be updated. Continued use of SplitLedger AI constitutes binding acceptance of the revised Policy.
                </p>
              </section>
            )}

            {/* Section 21 */}
            {matchesSearch("Contact Information Legal Agent Support Email") && (
              <section id="section-21" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>21. Contact Information &amp; Designated Legal Agent</span>
                </h2>
                <p>
                  For copyright infringement notices, trademark inquiries, or licensing requests, please contact our designated legal agent:
                </p>
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/70 space-y-2 text-xs">
                  <div><strong>Legal Entity:</strong> [Company Legal Name]</div>
                  <div><strong>Registered Corporate Office:</strong> [Registered Corporate Address, City, State, PIN/ZIP, Country]</div>
                  <div><strong>Designated IP &amp; Legal Agent:</strong> <a href="mailto:dipakpawar3747@gmail.com" className="text-primary hover:underline font-mono font-bold">dipakpawar3747@gmail.com</a></div>
                  <div><strong>Application Production Domain:</strong> <span className="font-mono">split-ledger-ai.vercel.app</span></div>
                  <div><strong>Statutory Takedown Response Timeline:</strong> All formal copyright and intellectual property inquiries are acknowledged within 24 hours of receipt.</div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

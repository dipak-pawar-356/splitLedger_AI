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
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PrivacyPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeSection, setActiveSection] = React.useState("intro");

  const sections = [
    { id: "intro", title: "1. Introduction & Overview" },
    { id: "information-collected", title: "2. Information We Collect" },
    { id: "how-we-use-data", title: "3. How Data Is Used" },
    { id: "security-encryption", title: "4. Security & Encryption" },
    { id: "third-party", title: "5. Third-Party Services" },
    { id: "data-retention", title: "6. Data Retention Policies" },
    { id: "user-rights", title: "7. User Rights & Data Export" },
    { id: "children-privacy", title: "8. Children's Privacy" },
    { id: "policy-changes", title: "9. Changes to This Policy" },
    { id: "contact", title: "10. Contact & Privacy Office" },
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
    <div className="w-full bg-slate-50/50 dark:bg-slate-950 py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Top Header Bar with Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Home</span>
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* In-page Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search privacy terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
              />
            </div>

            {/* Print Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 shrink-0 print:hidden"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </Button>
          </div>
        </div>

        {/* Title Header */}
        <div className="mb-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              Official Legal Document
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
              Version v1.0.0
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Privacy Policy
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Last updated: September 10, 2026
            </span>
            <span>•</span>
            <span>Effective Date: January 1, 2026</span>
          </div>
        </div>

        {/* Main Content Layout with Sticky Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* ================= STICKY SIDEBAR (TOC) ================= */}
          <aside className="lg:col-span-4 sticky top-24 hidden lg:block rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 print:hidden">
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
                  className={`block px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeSection === sec.id
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {sec.title}
                </a>
              ))}
            </nav>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              Need assistance? Email{" "}
              <a href="mailto:dipakpawar3747@gmail.com" className="text-primary font-bold hover:underline">
                dipakpawar3747@gmail.com
              </a>
            </div>
          </aside>

          {/* ================= LEGAL CLAUSES CONTENT ================= */}
          <main className="lg:col-span-8 space-y-10 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            {/* Section 1 */}
            {matchesSearch("Introduction Overview SplitLedger AI") && (
              <section id="intro" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span>1. Introduction &amp; Overview</span>
                </h2>
                <p>
                  At <strong>SplitLedger AI</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), your privacy and financial security are our foundational commitments. This Privacy Policy details how we collect, process, protect, and handle your information when you use our web platform, mobile experiences, and associated APIs.
                </p>
                <p>
                  SplitLedger AI is built specifically for personal expense tracking, group bill sharing, roommate budgets, trip ledgers, and intelligent debt settlements. We adhere to the highest international data privacy standards and the Digital Personal Data Protection Act (DPDPA).
                </p>
              </section>
            )}

            {/* Section 2 */}
            {matchesSearch("Information We Collect Personal Financial Group Notes Attachments Cookies Analytics") && (
              <section id="information-collected" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-500" />
                  <span>2. Information We Collect</span>
                </h2>
                <p>
                  To provide seamless shared expense calculations and intelligent financial features, we collect the following categories of information:
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">A. Personal Information</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      When you create an account via Clerk authentication, we securely record your full name, email address, avatar image, phone number (if provided for WhatsApp reminders), and user ID.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">B. Financial Transaction Data</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Transaction amounts, currencies (primarily INR ₹), expense dates, merchant or payee descriptions, payment modes (UPI, Card, Cash), category classifications, and settlement records.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">C. Group &amp; Social Data</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Group titles, member email associations, split percentages, debt graph balances, and trip itinerary associations.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">D. Financial Notes &amp; Journal Entries</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      User-created notes, markdown memos, expense reminders, and custom tags created within the Financial Notes module.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">E. Attachments &amp; Receipt Images</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Images and PDF documents uploaded for receipt scanning or document vault storage. Optical Character Recognition (OCR) extracts text strictly for transaction creation.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">F. Cookies &amp; Local Storage</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Essential authentication session tokens, theme state preferences (dark/light mode), and temporary client-side form caches. We do NOT use invasive advertising tracking cookies.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">G. Analytics &amp; Diagnostic Logs</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Aggregated telemetry, API latency measurements, and error stack traces to diagnose system crashes and optimize database performance.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 3 */}
            {matchesSearch("How Data Is Used purpose settlements AI Assistant") && (
              <section id="how-we-use-data" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-500" />
                  <span>3. How Data Is Used</span>
                </h2>
                <p>We process your data strictly to deliver and enhance SplitLedger AI features:</p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li>Compute multi-member greedy debt settlements and optimal repayment graphs.</li>
                  <li>Generate pre-filled NPCI compliant UPI QR payment codes (`upi://pay`).</li>
                  <li>Provide AI-powered transaction categorization and OCR receipt item extraction.</li>
                  <li>Send critical security notifications, settlement balance updates, and payment alerts.</li>
                  <li>Calculate personal spending metrics, category budgets, and financial health trends.</li>
                </ul>
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                  <strong>Zero Commercial Sale:</strong> We will never sell, rent, or trade your personal or financial data to advertisers, credit bureaus, or third-party marketing companies.
                </div>
              </section>
            )}

            {/* Section 4 */}
            {matchesSearch("Security Encryption AES-256 TLS TLS 1.3") && (
              <section id="security-encryption" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-500" />
                  <span>4. Security &amp; Encryption</span>
                </h2>
                <p>SplitLedger AI implements enterprise-grade security protocols across all infrastructure tiers:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Encryption in Transit</span>
                    <p className="text-slate-500">Every byte transmitted between your browser and our servers is secured using modern TLS 1.3 encryption with strict HSTS headers.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Encryption at Rest</span>
                    <p className="text-slate-500">All database tables, attachments, and backups are stored using 256-bit Advanced Encryption Standard (AES-256) on Neon PostgreSQL.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 5 */}
            {matchesSearch("Third-Party Services Clerk Neon OpenAI Resend WhatsApp") && (
              <section id="third-party" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-purple-500" />
                  <span>5. Third-Party Services &amp; Subprocessors</span>
                </h2>
                <p>We work with trusted enterprise cloud vendors to deliver platform functionality:</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Clerk Inc.</span>
                    <span className="text-slate-500">Secure User Identity &amp; Session Authentication</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Neon Inc.</span>
                    <span className="text-slate-500">Encrypted Serverless PostgreSQL Cloud Database</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">OpenAI LLC</span>
                    <span className="text-slate-500">Vision OCR &amp; Categorization (Zero data training retention)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Resend Inc.</span>
                    <span className="text-slate-500">Transactional Email Notifications &amp; Alerts</span>
                  </div>
                </div>
              </section>
            )}

            {/* Section 6 */}
            {matchesSearch("Data Retention Policies") && (
              <section id="data-retention" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-amber-500" />
                  <span>6. Data Retention Policies</span>
                </h2>
                <p>
                  We retain personal and financial records for as long as your account remains active. Upon your explicit request to delete your account, your data is completely purged from production databases within 30 days and permanently deleted from backup rotation within 60 days.
                </p>
              </section>
            )}

            {/* Section 7 */}
            {matchesSearch("User Rights Delete Account Export Data") && (
              <section id="user-rights" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="h-5 w-5 text-emerald-500" />
                  <span>7. User Rights &amp; Data Export</span>
                </h2>
                <p>You maintain full sovereignty over your personal and financial information:</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-primary font-bold">
                      <Download className="h-4 w-4" />
                      <span>Data Export (Portability)</span>
                    </div>
                    <p className="text-slate-500">
                      Export your complete financial transaction history, notes, and group ledgers anytime in structured JSON or CSV format directly from your Account Settings.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-rose-500 font-bold">
                      <Trash2 className="h-4 w-4" />
                      <span>Account Deletion (Right to Erasure)</span>
                    </div>
                    <p className="text-slate-500">
                      Permanently delete your profile, transactions, notes, and group associations with a single confirmation in Account Settings or by emailing support.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 8 */}
            {matchesSearch("Children Privacy under 13") && (
              <section id="children-privacy" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <span>8. Children&apos;s Privacy</span>
                </h2>
                <p>
                  SplitLedger AI is not intended for use by individuals under 13 years of age. We do not knowingly solicit or collect personal information from children. If we discover that a minor under 13 has provided personal data, we will promptly delete it.
                </p>
              </section>
            )}

            {/* Section 9 */}
            {matchesSearch("Changes to This Policy") && (
              <section id="policy-changes" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <span>9. Changes to This Policy</span>
                </h2>
                <p>
                  We may periodically revise this Privacy Policy to reflect feature additions or regulatory requirements. Whenever significant changes occur, we will provide conspicuous notice via email and update the &ldquo;Last updated&rdquo; timestamp at the top of this document.
                </p>
              </section>
            )}

            {/* Section 10 */}
            {matchesSearch("Contact Privacy Office DPO email") && (
              <section id="contact" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>10. Contact &amp; Privacy Office</span>
                </h2>
                <p>
                  If you have questions, inquiries, or grievance requests concerning this Privacy Policy or our data handling practices, reach our Data Protection Officer directly:
                </p>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                  <div><strong>Email:</strong> <a href="mailto:dipakpawar3747@gmail.com" className="text-primary hover:underline">dipakpawar3747@gmail.com</a></div>
                  <div><strong>Official Support:</strong> <a href="mailto:dipakpawar3747@gmail.com" className="text-primary hover:underline">dipakpawar3747@gmail.com</a></div>
                  <div><strong>Phone / Helpline:</strong> <a href="tel:+918669233747" className="text-primary hover:underline">+91 8669233747</a></div>
                  <div><strong>Organization:</strong> SplitLedger AI Technologies Private Limited</div>
                  <div><strong>Location:</strong> Bangalore / Mumbai, India 🇮🇳</div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

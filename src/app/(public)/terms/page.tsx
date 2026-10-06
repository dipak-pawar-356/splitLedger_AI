"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Printer,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Shield,
  CreditCard,
  Users,
  Bot,
  Camera,
  Mic,
  Scale,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TermsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeSection, setActiveSection] = React.useState("acceptance");

  const sections = [
    { id: "acceptance", title: "1. Acceptance of Terms" },
    { id: "accounts", title: "2. User Accounts & Security" },
    { id: "responsibilities", title: "3. User Responsibilities & Conduct" },
    { id: "payments", title: "4. Payments & UPI Integration" },
    { id: "groups", title: "5. Groups & Split Settlements" },
    { id: "transactions", title: "6. Transactions & Balances" },
    { id: "notes", title: "7. Financial Notes & Journal" },
    { id: "ai-assistant", title: "8. AI Assistant & OCR Features" },
    { id: "voice", title: "9. Voice Commands & Audio" },
    { id: "ownership", title: "10. Data Ownership & Intellectual Property" },
    { id: "termination", title: "11. Termination & Account Cancellation" },
    { id: "disclaimer", title: "12. Disclaimers & No Financial Advice" },
    { id: "liability", title: "13. Limitation of Liability" },
    { id: "governing-law", title: "14. Governing Law & Jurisdiction" },
    { id: "contact", title: "15. Contact & Legal Inquiries" },
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
                placeholder="Search terms & conditions..."
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
              Terms &amp; Conditions
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
              Version v1.0.0
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Terms of Service
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
              <FileText className="h-4 w-4 text-primary" />
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
              Questions? Email{" "}
              <a href="mailto:legal@splitledger.ai" className="text-primary font-bold hover:underline">
                legal@splitledger.ai
              </a>
            </div>
          </aside>

          {/* ================= LEGAL TERMS CONTENT ================= */}
          <main className="lg:col-span-8 space-y-10 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            {/* Section 1 */}
            {matchesSearch("Acceptance Terms bound agree service") && (
              <section id="acceptance" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>1. Acceptance of Terms</span>
                </h2>
                <p>
                  By accessing, browsing, registering for, or using <strong>SplitLedger AI</strong> (&ldquo;the Service&rdquo;), you signify that you have read, understood, and agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;) and our Privacy Policy.
                </p>
                <p>
                  If you are agreeing to these Terms on behalf of an entity or team, you represent that you have legal authority to bind that entity. If you do not agree to all terms, you must refrain from using SplitLedger AI.
                </p>
              </section>
            )}

            {/* Section 2 */}
            {matchesSearch("Accounts Security Clerk password authentication") && (
              <section id="accounts" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-500" />
                  <span>2. User Accounts &amp; Security</span>
                </h2>
                <p>
                  To access our platform features, you must register through Clerk authentication. You agree to provide true, accurate, and current information. You are solely responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account.
                </p>
                <p>
                  You agree to immediately notify SplitLedger AI of any unauthorized access, security incident, or account compromise.
                </p>
              </section>
            )}

            {/* Section 3 */}
            {matchesSearch("Responsibilities Conduct abuse illegal prohibited") && (
              <section id="responsibilities" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-amber-500" />
                  <span>3. User Responsibilities &amp; Conduct</span>
                </h2>
                <p>You agree not to use SplitLedger AI for any unlawful, deceptive, or abusive activity, including:</p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li>Inputting fraudulent expenses, fabricated debt claims, or fictitious loan records.</li>
                  <li>Attempting to probe, scan, or reverse-engineer the underlying API architecture or database.</li>
                  <li>Using automated scraping, bots, or excessive rate requests that disrupt platform stability.</li>
                  <li>Uploading malicious file attachments, viruses, or inappropriate imagery.</li>
                </ul>
              </section>
            )}

            {/* Section 4 */}
            {matchesSearch("Payments UPI Integration QR Code GPay PhonePe") && (
              <section id="payments" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  <span>4. Payments &amp; UPI Integration</span>
                </h2>
                <p>
                  SplitLedger AI facilitates shared expense reconciliation by generating standardized <strong>NPCI Unified Payments Interface (UPI)</strong> QR codes and deep links (`upi://pay`).
                </p>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2 text-slate-600 dark:text-slate-400">
                  <p>
                    <strong>Important Clarification:</strong> SplitLedger AI is not a bank, payment aggregator, or custodian of funds. All monetary transfers happen directly between users via third-party UPI apps (such as Google Pay, PhonePe, Paytm, BHIM, or your mobile banking app).
                  </p>
                  <p>
                    We do not hold your funds in escrow, and we do not process payment card numbers or bank account credentials on our servers.
                  </p>
                </div>
              </section>
            )}

            {/* Section 5 */}
            {matchesSearch("Groups Split Settlements Greedy Algorithm") && (
              <section id="groups" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span>5. Groups &amp; Split Settlements</span>
                </h2>
                <p>
                  When you create or join a group, you agree that group administrators and members may view the expenses, splits, and net debt balances recorded in that group.
                </p>
                <p>
                  Our proprietary Greedy Settlement algorithm minimizes debt transactions mathematically for your convenience. However, the legal obligation to repay debts remains strictly an agreement between group participants.
                </p>
              </section>
            )}

            {/* Section 6 */}
            {matchesSearch("Transactions Balances logging currency INR") && (
              <section id="transactions" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  <span>6. Transactions &amp; Balances</span>
                </h2>
                <p>
                  Users may record individual income, expenses, category labels, and payment modes. SplitLedger AI provides high-precision mathematical calculations in Indian Rupees (₹). Users are responsible for verifying the accuracy of figures entered by themselves or peers.
                </p>
              </section>
            )}

            {/* Section 7 */}
            {matchesSearch("Financial Notes Journal markdown privacy") && (
              <section id="notes" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-rose-500" />
                  <span>7. Financial Notes &amp; Journal</span>
                </h2>
                <p>
                  The Financial Notes module allows users to store written memos, payment agreements, and categorized thoughts. You retain full ownership of your notes. You agree not to store sensitive plaintext bank PINs, passwords, or government identification cards in unencrypted notes.
                </p>
              </section>
            )}

            {/* Section 8 */}
            {matchesSearch("AI Assistant OCR Scanner Vision models") && (
              <section id="ai-assistant" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bot className="h-5 w-5 text-fuchsia-500" />
                  <span>8. AI Assistant &amp; OCR Features</span>
                </h2>
                <p>
                  SplitLedger AI includes artificial intelligence capabilities for conversational financial analysis and optical receipt scanning:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Receipt Extraction:</strong> While our OCR pipeline maintains high recognition accuracy, receipt scans must be reviewed and verified by you before finalizing an expense entry.</li>
                  <li><strong>AI Responses:</strong> Responses from the AI Assistant are generated computationally and are intended strictly for personal informational guidance.</li>
                </ul>
              </section>
            )}

            {/* Section 9 */}
            {matchesSearch("Voice Commands Audio Speech Recognition") && (
              <section id="voice" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mic className="h-5 w-5 text-red-500" />
                  <span>9. Voice Commands &amp; Audio Processing</span>
                </h2>
                <p>
                  When utilizing voice-to-expense logging, audio inputs are processed ephemerally solely to convert speech into structured transaction text. Audio recordings are not permanently stored or utilized for machine learning model training without consent.
                </p>
              </section>
            )}

            {/* Section 10 */}
            {matchesSearch("Data Ownership Intellectual Property copyright") && (
              <section id="ownership" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-teal-500" />
                  <span>10. Data Ownership &amp; Intellectual Property</span>
                </h2>
                <p>
                  <strong>Your Data:</strong> You retain 100% intellectual property ownership of all personal financial records, notes, and receipts you upload to the platform.
                </p>
                <p>
                  <strong>Our Platform:</strong> The SplitLedger AI name, brand logos, user interface designs, custom greedy debt reduction algorithms, codebases, and documentation are the exclusive intellectual property of SplitLedger AI Technologies.
                </p>
              </section>
            )}

            {/* Section 11 */}
            {matchesSearch("Termination Account Cancellation deletion") && (
              <section id="termination" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>11. Termination &amp; Account Cancellation</span>
                </h2>
                <p>
                  You may terminate your account at any time via Account Settings. We reserve the right to suspend or terminate accounts that violate these Terms, engage in malicious attacks, or attempt fraud.
                </p>
              </section>
            )}

            {/* Section 12 */}
            {matchesSearch("Disclaimers No Financial Advice accounting legal") && (
              <section id="disclaimer" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-indigo-500" />
                  <span>12. Disclaimers &amp; No Financial Advice</span>
                </h2>
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
                  <p className="font-bold">
                    SPLITLEDGER AI IS A SOFTWARE TRACKING TOOL, NOT A REGISTERED FINANCIAL ADVISOR, ACCOUNTING FIRM, OR BANKING INSTITUTION.
                  </p>
                  <p>
                    The calculations, graphs, and AI insights provided are for personal organizational purposes only and should not be relied upon as professional investment, accounting, or tax advice.
                  </p>
                </div>
              </section>
            )}

            {/* Section 13 */}
            {matchesSearch("Limitation of Liability damages indirect") && (
              <section id="liability" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  <span>13. Limitation of Liability</span>
                </h2>
                <p>
                  To the maximum extent permitted by applicable law, SplitLedger AI shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from user error in recording expenses, peer-to-peer debt disputes, or third-party UPI payment gateway downtime.
                </p>
              </section>
            )}

            {/* Section 14 */}
            {matchesSearch("Governing Law Jurisdiction India Bangalore Mumbai") && (
              <section id="governing-law" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-emerald-500" />
                  <span>14. Governing Law &amp; Jurisdiction</span>
                </h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in Bangalore or Mumbai, India.
                </p>
              </section>
            )}

            {/* Section 15 */}
            {matchesSearch("Contact Legal Inquiries email") && (
              <section id="contact" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>15. Contact &amp; Legal Inquiries</span>
                </h2>
                <p>
                  For questions or legal notices regarding these Terms of Service, please contact our legal counsel:
                </p>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                  <div><strong>Legal &amp; Support:</strong> <a href="mailto:dipakpawar3747@gmail.com" className="text-primary hover:underline">dipakpawar3747@gmail.com</a></div>
                  <div><strong>Helpline:</strong> <a href="tel:+918669233747" className="text-primary hover:underline">+91 8669233747</a></div>
                  <div><strong>Organization:</strong> SplitLedger AI Technologies Private Limited</div>
                  <div><strong>Jurisdiction:</strong> India 🇮🇳</div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

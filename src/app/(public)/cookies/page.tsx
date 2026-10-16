"use client";

import * as React from "react";
import Link from "next/link";
import {
  Cookie,
  Search,
  Printer,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Lock,
  Database,
  HardDrive,
  Settings,
  AlertTriangle,
  HelpCircle,
  Mail,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CookiePolicyPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeSection, setActiveSection] = React.useState("section-1");

  const sections = [
    { id: "section-1", title: "1. Title & Identification" },
    { id: "section-2", title: "2. Effective Date" },
    { id: "section-3", title: "3. Last Updated" },
    { id: "section-4", title: "4. Introduction" },
    { id: "section-5", title: "5. What Are Cookies" },
    { id: "section-6", title: "6. Cookies Used by SplitLedger AI" },
    { id: "section-7", title: "7. Browser Storage & Local Data" },
    { id: "section-8", title: "8. Why We Use Cookies" },
    { id: "section-9", title: "9. Third-Party Cookies (Strict Non-Tracking)" },
    { id: "section-10", title: "10. Managing & Controlling Cookies" },
    { id: "section-11", title: "11. Changes to this Policy" },
    { id: "section-12", title: "12. Contact Information" },
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
                placeholder="Search cookie policy..."
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
              Official Compliance Notice
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold border border-slate-200/60 dark:border-slate-800/60">
              ePrivacy Directive • GDPR • DPDP India Verified
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Cookie Policy
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
              <Cookie className="h-4 w-4 text-primary" />
              <span>Sections Index</span>
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
              Cookie Compliance Questions:{" "}
              <a href="mailto:dipakpawar3747@gmail.com" className="text-primary font-bold hover:underline">
                dipakpawar3747@gmail.com
              </a>
            </div>
          </aside>

          {/* ================= LEGAL CLAUSES CONTENT ================= */}
          <main className="lg:col-span-8 space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            {/* Section 1 */}
            {matchesSearch("Title Identification SplitLedger AI") && (
              <section id="section-1" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Cookie className="h-5 w-5 text-primary" />
                  <span>1. Title &amp; Identification of the Platform</span>
                </h2>
                <p>
                  This official <strong>Cookie Policy</strong> applies to <strong>SplitLedger AI</strong> (&ldquo;<strong>SplitLedger AI</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>us</strong>&rdquo;, or &ldquo;<strong>our</strong>&rdquo;), operated by <strong>[Company Legal Name]</strong>, accessible at <code>split-ledger-ai.vercel.app</code> and associated domain names.
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs">
                  <div><strong>Legal Entity:</strong> [Company Legal Name / Corporate Entity Name]</div>
                  <div><strong>Registered Corporate Office:</strong> [Registered Corporate Address, City, State, PIN/ZIP, Country]</div>
                  <div><strong>Corporate Identification:</strong> [CIN / Corporate Registration Number / Tax ID]</div>
                  <div><strong>Official Support &amp; Compliance Email:</strong> dipakpawar3747@gmail.com</div>
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
                    <p className="text-slate-500 text-[11px]">This Policy governs all browser storage and cookie transactions originating on or after this date.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Last Updated</span>
                    <p className="text-slate-600 dark:text-slate-400 font-mono">October 16, 2026</p>
                    <p className="text-slate-500 text-[11px]">Comprehensive audit verifying complete absence of commercial marketing cookies and auditing Clerk session tokens.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 4 */}
            {matchesSearch("Introduction Purpose Privacy Philosophy") && (
              <section id="section-4" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <span>4. Introduction</span>
                </h2>
                <p>
                  SplitLedger AI respects your fundamental right to digital privacy. We believe that financial software should focus strictly on ledger calculations, debt settlement, and receipt intelligence—without silently tracking your behavior across the internet.
                </p>
                <p>
                  This Cookie Policy explains clearly and transparently what cookies and browser storage technologies are, what specific identifiers SplitLedger AI places on your device, why they are technically necessary, and how you can control them.
                </p>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-xs font-semibold">
                  Zero Marketing Guarantee: SplitLedger AI does NOT deploy advertising cookies, behavioral tracking pixels, remarketing tags, or third-party analytical surveillance networks. Every cookie and storage key used on our platform serves a strictly technical or functional purpose.
                </div>
              </section>
            )}

            {/* Section 5 */}
            {matchesSearch("What Are Cookies Session Persistent First Party Third Party Functional Storage Browser") && (
              <section id="section-5" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-blue-500" />
                  <span>5. What Are Cookies &amp; Browser Storage Technologies?</span>
                </h2>
                <p>
                  Cookies are compact data text files placed on your computer, smartphone, or tablet when you navigate websites. Modern web applications also utilize advanced HTML5 browser storage mechanisms (Local Storage and Session Storage) to deliver responsive, offline-capable experiences:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Session Cookies</span>
                    <p className="text-slate-500">Temporary cookie files that exist only while your browser session remains open. They are automatically erased from your device the moment you close your web browser.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Persistent Cookies</span>
                    <p className="text-slate-500">Cookies that remain stored on your device across multiple browsing sessions until they reach their programmed expiration date or until you manually clear them via browser settings.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">First-Party Cookies</span>
                    <p className="text-slate-500">Cookies set directly by SplitLedger AI under our own domain name (<code>split-ledger-ai.vercel.app</code>) to remember your UI theme preferences and display settings.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Third-Party Cookies</span>
                    <p className="text-slate-500">Cookies placed by authorized cloud partners providing essential infrastructure, specifically our identity and authentication provider, Clerk, Inc.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1 sm:col-span-2">
                    <span className="font-bold text-slate-900 dark:text-white">HTML5 Web Storage (Local &amp; Session Storage)</span>
                    <p className="text-slate-500">Client-side browser storage providing secure data caching directly within your device without transmitting data in every HTTP network header, supporting offline expense creation and queue syncing.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 6 */}
            {matchesSearch("Cookies Used SplitLedger AI Clerk session clerk_db_jwt client_uat theme clerk_device_token Table") && (
              <section id="section-6" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <span>6. Cookies Used by SplitLedger AI</span>
                </h2>
                <p>
                  The following comprehensive audit table itemizes every cookie deployed on the SplitLedger AI platform:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200/70 dark:border-slate-800/70 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-slate-950 font-bold border-b border-slate-200/70 dark:border-slate-800/70">
                      <tr>
                        <th className="p-3">Cookie Name</th>
                        <th className="p-3">Provider</th>
                        <th className="p-3">Technical Purpose</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                      <tr>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">__session</td>
                        <td className="p-3">Clerk, Inc.</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">Cryptographically signed JSON Web Token (JWT) holding your authenticated identity and authorizing backend API server actions.</td>
                        <td className="p-3">Strictly Necessary</td>
                        <td className="p-3 font-mono">14 Days</td>
                        <td className="p-3 text-emerald-600 font-bold">Required</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">__clerk_db_jwt</td>
                        <td className="p-3">Clerk, Inc.</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">Database synchronization token allowing SplitLedger AI to securely sync Clerk user records with our PostgreSQL database.</td>
                        <td className="p-3">Strictly Necessary</td>
                        <td className="p-3 font-mono">Session</td>
                        <td className="p-3 text-emerald-600 font-bold">Required</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">__client_uat</td>
                        <td className="p-3">Clerk, Inc.</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">Client Updated-At Unix timestamp used to determine when your session was last refreshed and prevent stale token replay.</td>
                        <td className="p-3">Strictly Necessary</td>
                        <td className="p-3 font-mono">1 Year</td>
                        <td className="p-3 text-emerald-600 font-bold">Required</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">clerk_device_token</td>
                        <td className="p-3">Clerk, Inc.</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">Cryptographic token recognizing trusted devices, preventing unauthorized brute-force attempts and enabling secure multi-factor authentication.</td>
                        <td className="p-3">Security</td>
                        <td className="p-3 font-mono">Persistent</td>
                        <td className="p-3 text-emerald-600 font-bold">Required</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">theme</td>
                        <td className="p-3">SplitLedger AI</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">Remembers whether you selected Light Mode, Dark Mode, or System UI appearance to avoid visual flickering on page load.</td>
                        <td className="p-3">Functional</td>
                        <td className="p-3 font-mono">1 Year</td>
                        <td className="p-3 text-slate-500 font-bold">Optional</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Section 7 */}
            {matchesSearch("Browser Storage Local Storage Session Storage Offline Queue Theme Cache") && (
              <section id="section-7" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-indigo-500" />
                  <span>7. Browser Storage &amp; Local Client Data</span>
                </h2>
                <p>
                  In addition to standard cookies, SplitLedger AI utilizes client-side HTML5 Web Storage strictly to support offline usability, responsive client caching, and local UI state:
                </p>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white font-mono">splitledger-offline-queue (LocalStorage):</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Enables our Progressive Web App (PWA) offline capabilities. When you create an expense while traveling or in an area with poor internet connectivity, the transaction is temporarily queued in your browser&apos;s Local Storage. The moment network connectivity is re-established, the queue automatically syncs with our Neon PostgreSQL cloud database.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white font-mono">theme (LocalStorage):</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Stores a simple string value (&ldquo;dark&rdquo;, &ldquo;light&rdquo;, or &ldquo;system&rdquo;) on your device, ensuring immediate client CSS rendering without delay or layout shifts.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white font-mono">splitledger-recent-searches (LocalStorage):</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Retains a local list of recently queried group names and contact names directly on your device to speed up search auto-completion. This data is purely local and is never uploaded to external servers.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Session Storage &amp; Authentication Cache:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Stores ephemeral in-flight form wizards (such as multi-step expense splits) and client-side Clerk session caches in browser memory. This data is automatically flushed when you close the active browser tab.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 8 */}
            {matchesSearch("Why We Use Cookies Authentication Session Security Fraud Prevention Preferences Performance") && (
              <section id="section-8" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-amber-500" />
                  <span>8. Why We Use Cookies &amp; Storage</span>
                </h2>
                <p>We deploy cookies and storage mechanisms exclusively for the following technical purposes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Authentication &amp; Identity</span>
                    <p className="text-slate-500">Verifying your identity on every page load and server action call, ensuring that only you can access your personal financial ledgers.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Session Management</span>
                    <p className="text-slate-500">Maintaining your login session across tab switches and page navigations without requiring you to re-enter your password repeatedly.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Security &amp; Fraud Prevention</span>
                    <p className="text-slate-500">Detecting malicious bot traffic, mitigating cross-site request forgery (CSRF), enforcing in-memory rate limiting, and recognizing untrusted devices.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Preference Persistence</span>
                    <p className="text-slate-500">Remembering UI visual settings, currency displays, and collapsed navigation bar states across sessions.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1 sm:col-span-2">
                    <span className="font-bold text-slate-900 dark:text-white">Application Functionality &amp; Offline Sync</span>
                    <p className="text-slate-500">Executing client-side dynamic NPCI UPI QR code generation and caching offline ledger submissions safely until internet connectivity is restored.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 9 */}
            {matchesSearch("Third-Party Cookies Clerk Non-Tracking Google Analytics Meta Pixel") && (
              <section id="section-9" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <span>9. Third-Party Cookies (Strict Non-Tracking Commitment)</span>
                </h2>
                <p>
                  SplitLedger AI limits third-party cookies strictly to our vetted authentication infrastructure partner, <strong>Clerk, Inc.</strong> (San Francisco, USA). Clerk operates as an essential technical subprocessor to manage identity authentication, multi-factor security, and password encryption under a formal Data Protection Agreement.
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Explicit Absence of Marketing &amp; Surveillance Technologies:</span>
                  </span>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                    <li>We do <strong>NOT</strong> use Google Analytics, Universal Analytics, or Google Tag Manager.</li>
                    <li>We do <strong>NOT</strong> install Meta (Facebook) Pixel, Conversion APIs, or social media tracking beacons.</li>
                    <li>We do <strong>NOT</strong> deploy programmatic advertising cookies, retargeting scripts, or third-party ad networks.</li>
                    <li>We do <strong>NOT</strong> sell, trade, or share your cookie identifiers with commercial data brokers or credit rating agencies.</li>
                  </ul>
                </div>
              </section>
            )}

            {/* Section 10 */}
            {matchesSearch("Managing Cookies View Delete Block Configure Browser Settings") && (
              <section id="section-10" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-500" />
                  <span>10. Managing &amp; Controlling Cookies</span>
                </h2>
                <p>
                  You have full authority to view, delete, restrict, or block cookies at any time directly through your web browser settings:
                </p>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">How to Adjust Browser Settings:</span>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                      <li><strong>Google Chrome:</strong> Settings &rarr; Privacy and security &rarr; Third-party cookies &rarr; Manage cookie permissions and site data.</li>
                      <li><strong>Mozilla Firefox:</strong> Settings &rarr; Privacy &amp; Security &rarr; Enhanced Tracking Protection &amp; Cookies and Site Data.</li>
                      <li><strong>Apple Safari:</strong> Settings &rarr; Safari &rarr; Advanced &rarr; Block All Cookies or Manage Website Data.</li>
                      <li><strong>Microsoft Edge:</strong> Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies and site data.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 space-y-1.5">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>Consequences of Blocking Strictly Necessary Cookies:</span>
                    </span>
                    <p>
                      Because cookies deployed by Clerk (such as <code>__session</code>) are strictly essential for authenticating your identity, blocking or disabling cookies will make it technically impossible to log into SplitLedger AI, cause immediate session termination, and disrupt the offline queue synchronization mechanism.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 11 */}
            {matchesSearch("Changes to this Cookie Policy Updates") && (
              <section id="section-11" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <span>11. Changes to this Cookie Policy</span>
                </h2>
                <p>
                  We may periodically update this Cookie Policy to reflect changes in our cloud architecture, subprocessor integrations, or statutory data protection mandates. When changes occur, the &ldquo;Last Updated&rdquo; date at the top of this document will be revised accordingly.
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  For any material modifications that alter cookie categories or data handling scopes, we will provide advance notice via an in-app banner or email notification to your registered email address at least <strong>15 days</strong> prior to the effective date.
                </p>
              </section>
            )}

            {/* Section 12 */}
            {matchesSearch("Contact Information Support Email Legal Questions") && (
              <section id="section-12" className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>12. Contact Information</span>
                </h2>
                <p>
                  If you have questions, inquiries, or technical feedback regarding our use of cookies and local browser storage, please contact us at:
                </p>
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/70 space-y-2 text-xs">
                  <div><strong>Legal Entity:</strong> [Company Legal Name]</div>
                  <div><strong>Registered Corporate Office:</strong> [Registered Corporate Address, City, State, PIN/ZIP, Country]</div>
                  <div><strong>Official Support &amp; Compliance Email:</strong> <a href="mailto:dipakpawar3747@gmail.com" className="text-primary hover:underline font-mono font-bold">dipakpawar3747@gmail.com</a></div>
                  <div><strong>Application Production Domain:</strong> <span className="font-mono">split-ledger-ai.vercel.app</span></div>
                  <div><strong>Statutory Inquiries Timeline:</strong> Formal cookie inquiries and privacy requests are acknowledged within 24 hours.</div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

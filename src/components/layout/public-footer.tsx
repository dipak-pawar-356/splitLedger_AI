import Link from "next/link";
import {
  Sparkles,
  Mail,
  Clock,
  ExternalLink,
  Github,
  Linkedin,
  Twitter,
  Instagram,
  Heart,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing", badge: "Coming Soon" },
    { label: "FAQ", href: "/#faq" },
    { label: "About Us", href: "/about" },
  ];

  const resources = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/privacy#cookies" },
    { label: "Support Center", href: "/contact" },
    { label: "Contact Us", href: "/contact" },
  ];

  const platformLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Reports & Analytics", href: "/dashboard/reports" },
    { label: "Groups & Splits", href: "/dashboard/groups" },
    { label: "Transactions", href: "/dashboard/transactions" },
    { label: "Financial Notes", href: "/dashboard/notes" },
    { label: "AI Assistant", href: "/dashboard/ai" },
  ];

  const socialLinks = [
    {
      name: "GitHub",
      href: "https://github.com",
      icon: Github,
      hoverClass: "hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500",
    },
    {
      name: "LinkedIn",
      href: "https://linkedin.com",
      icon: Linkedin,
      hoverClass: "hover:text-blue-600 hover:border-blue-400",
    },
    {
      name: "Twitter (X)",
      href: "https://twitter.com",
      icon: Twitter,
      hoverClass: "hover:text-sky-500 hover:border-sky-400",
    },
    {
      name: "Instagram",
      href: "https://instagram.com",
      icon: Instagram,
      hoverClass: "hover:text-pink-500 hover:border-pink-400",
    },
    {
      name: "Email",
      href: "mailto:dipakpawar3747@gmail.com",
      icon: Mail,
      hoverClass: "hover:text-emerald-500 hover:border-emerald-400",
    },
  ];

  return (
    <footer className="relative border-t border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-slate-50/70 to-slate-100/90 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 overflow-hidden text-slate-700 dark:text-slate-300">
      {/* Top subtle glow bar */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />

      {/* Decorative ambient background orb */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-14">
          {/* ================= LEFT SECTION (Logo, Tagline, Description) ================= */}
          <div className="lg:col-span-4 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.02]"
            >
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-indigo-500/20 text-primary border border-primary/20 shadow-sm shadow-primary/10 group-hover:shadow-primary/20 transition-all">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  SplitLedger<span className="text-primary">AI</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Smart Financial Management
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal max-w-sm">
              Helping individuals, friends, families and teams manage shared expenses, personal finance and settlements with intelligent automation.
            </p>

            <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>256-Bit Encrypted</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Zap className="h-3.5 w-3.5" />
                <span>UPI Enabled</span>
              </span>
            </div>
          </div>

          {/* ================= MIDDLE SECTION (Quick Links, Resources, Platform) ================= */}
          <div className="lg:col-span-5 grid grid-cols-3 gap-4 sm:gap-6">
            {/* Column 1: Quick Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
                Quick Links
              </h4>
              <ul className="space-y-2.5 text-xs font-medium">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors duration-150"
                    >
                      <span className="relative">
                        {link.label}
                        <span className="absolute left-0 bottom-0 w-0 h-px bg-primary transition-all duration-200 group-hover:w-full" />
                      </span>
                      {link.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Resources */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
                Resources
              </h4>
              <ul className="space-y-2.5 text-xs font-medium">
                {resources.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors duration-150"
                    >
                      <span className="relative">
                        {link.label}
                        <span className="absolute left-0 bottom-0 w-0 h-px bg-primary transition-all duration-200 group-hover:w-full" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Platform */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
                Platform
              </h4>
              <ul className="space-y-2.5 text-xs font-medium">
                {platformLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors duration-150"
                    >
                      <span className="relative">
                        {link.label}
                        <span className="absolute left-0 bottom-0 w-0 h-px bg-primary transition-all duration-200 group-hover:w-full" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ================= RIGHT SECTION (Support, SLA, Social Icons) ================= */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Support & Contact
            </h4>

            <div className="space-y-2 text-xs">
              <a
                href="mailto:dipakpawar3747@gmail.com"
                className="group flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 transition-colors"
              >
                <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Official Support</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                    dipakpawar3747@gmail.com
                  </span>
                </div>
              </a>

              <a
                href="tel:8669233747"
                className="group flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40 transition-colors"
              >
                <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Support Hotline</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    +91 8669233747
                  </span>
                </div>
              </a>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Response SLA</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">24–48 Hours</span>
                  </div>
                </div>
                <Link
                  href="/contact"
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>Help Center</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Social Links (Icons only) */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                Connect with us
              </span>
              <div className="flex items-center gap-2">
                {socialLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      aria-label={item.name}
                      title={item.name}
                      className={`p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.hoverClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ================= BOTTOM BAR (Copyright, India Badge, Version) ================= */}
        <div className="pt-8 mt-6 border-t border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 font-mono text-[11px]">
            <span>&copy; {currentYear} SplitLedger AI. All Rights Reserved.</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-[11px]">
            <span>Designed &amp; Developed in India</span>
            <span role="img" aria-label="India flag">🇮🇳</span>
            <Heart className="h-3 w-3 text-rose-500 fill-rose-500 inline-block ml-0.5" />
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

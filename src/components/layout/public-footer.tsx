import Link from "next/link";
import { Sparkles } from "lucide-react";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-950 py-10 text-xs text-slate-500 dark:text-slate-400">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-900 dark:text-white font-bold transition-opacity hover:opacity-85"
              aria-label="SplitLedger AI Home"
            >
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm tracking-tight font-black">
                SplitLedger <span className="text-primary font-black">AI</span>
              </span>
            </Link>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
              •
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              © {currentYear} SplitLedger AI. All rights reserved.
            </p>
          </div>

          {/* Links: Privacy, Terms, Contact, GitHub, LinkedIn */}
          <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer Navigation">
            <Link
              href="/privacy"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/cookies"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cookies
            </Link>
            <Link
              href="/copyright"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Copyright
            </Link>
            <Link
              href="/contact"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Contact
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              LinkedIn
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}


import Link from "next/link";
import { SplitLedgerBrand } from "@/components/ui/logo";

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
              className="flex items-center text-slate-900 dark:text-white font-bold transition-transform duration-200 ease-out hover:scale-[1.02]"
              aria-label="SplitLedger AI Home"
            >
              <SplitLedgerBrand size="sm" />
            </Link>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
              •
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              © {currentYear} SplitLedger AI. All rights reserved.
            </p>
          </div>

          {/* Links: Privacy, Terms, Cookies, Copyright, Contact, GitHub, LinkedIn */}
          <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer Navigation">
            <Link
              href="/privacy"
              className="link-underline hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="link-underline hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
            >
              Terms
            </Link>
            <Link
              href="/cookies"
              className="link-underline hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
            >
              Cookies
            </Link>
            <Link
              href="/copyright"
              className="link-underline hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
            >
              Copyright
            </Link>
            <Link
              href="/contact"
              className="link-underline hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
            >
              Contact
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline hover:text-slate-900 dark:hover:text-white transition-all duration-200 hover:scale-105 inline-flex items-center gap-1"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline hover:text-slate-900 dark:hover:text-white transition-all duration-200 hover:scale-105 inline-flex items-center gap-1"
            >
              LinkedIn
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

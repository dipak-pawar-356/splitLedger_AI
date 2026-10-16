"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function PublicNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: "Features", href: "/features" },
    { label: "About", href: "/about" },
    { label: "Support", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 dark:border-slate-800/70 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-all">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.01]"
            aria-label="SplitLedger AI Home"
          >
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              SplitLedger <span className="text-primary font-black">AI</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-semibold tracking-wide transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Theme Toggle, Sign In, Get Started */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            <Link href="/sign-in">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Sign In
              </Button>
            </Link>

            <Link href="/sign-up">
              <Button
                size="sm"
                className="h-9 px-4 rounded-xl text-xs font-semibold gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs transition-all hover:scale-[1.02]"
              >
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-slate-700 dark:text-slate-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/70 dark:border-slate-800/70 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70 grid grid-cols-2 gap-2">
            <Link href="/sign-in" className="w-full">
              <Button variant="outline" className="w-full h-9 rounded-xl text-xs font-semibold">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up" className="w-full">
              <Button className="w-full h-9 rounded-xl text-xs font-semibold gap-1 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                <span>Get Started</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}


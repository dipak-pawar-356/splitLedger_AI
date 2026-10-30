"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SplitLedgerBrand } from "@/components/ui/logo";

export function PublicNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "/features" },
    { label: "About", href: "/about" },
    { label: "Support", href: "/contact" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-xs"
          : "border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo with modern branding */}
          <Link
            href="/"
            className="flex items-center transition-transform duration-200 ease-out hover:scale-[1.02]"
            aria-label="SplitLedger AI Home"
          >
            <SplitLedgerBrand size="md" />
          </Link>

          {/* Desktop Navigation Links with animated indicator */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-xs font-semibold tracking-wide transition-colors duration-200 py-1 ${
                    isActive
                      ? "text-primary font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>{link.label}</span>
                  {/* Underline indicator */}
                  {isActive ? (
                    <motion.div
                      layoutId="navbar-active-indicator"
                      className="absolute -bottom-1 left-0 right-0 h-[2px] bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : (
                    <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-slate-300 dark:bg-slate-700 rounded-full scale-x-0 hover:scale-x-100 transition-transform duration-250 origin-left" />
                  )}
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
                className="h-9 px-3.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
              >
                Sign In
              </Button>
            </Link>

            <Link href="/sign-up">
              <Button
                size="sm"
                className="h-9 px-4 rounded-xl text-xs font-semibold gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs hover:shadow-md transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
              >
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-slate-700 dark:text-slate-300 hover:scale-[1.05] active:scale-[0.95] transition-transform"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu with AnimatePresence */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden border-t border-slate-200/70 dark:border-slate-800/70 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl px-4 py-4 space-y-3 overflow-hidden shadow-xl"
          >
            <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? "text-primary bg-primary/10 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 active:scale-[0.99]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70 grid grid-cols-2 gap-2">
              <Link href="/sign-in" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-9 rounded-xl text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up" className="w-full">
                <Button className="w-full h-9 rounded-xl text-xs font-semibold gap-1 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                  <span>Get Started</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

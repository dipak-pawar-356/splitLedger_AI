"use client";

import { useState } from "react";
import { Plus, Receipt, Users, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function MobileFAB() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden fixed bottom-18 right-4 z-40 flex flex-col items-end gap-2.5">
      {/* Expanded Quick Action Items with AnimatePresence */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-end gap-2"
          >
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.03 }}
            >
              <Link
                href="/dashboard/transactions"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3.5 py-2 rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-700 text-xs font-bold active:scale-95 transition-transform"
              >
                <span>Add Expense</span>
                <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Receipt className="h-3.5 w-3.5" />
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 }}
            >
              <Link
                href="/dashboard/groups"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3.5 py-2 rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-700 text-xs font-bold active:scale-95 transition-transform"
              >
                <span>Create Group</span>
                <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5" />
                </div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.09 }}
            >
              <Link
                href="/dashboard/ai"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3.5 py-2 rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-700 text-xs font-bold active:scale-95 transition-transform"
              >
                <span>Ask AI Assistant</span>
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trigger Button with Smooth Rotation */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Quick Actions"
        whileTap={{ scale: 0.92 }}
        className="w-13 h-13 rounded-2xl bg-primary text-white shadow-xl hover:shadow-primary/25 hover:shadow-2xl flex items-center justify-center transition-shadow"
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </motion.div>
      </motion.button>
    </div>
  );
}

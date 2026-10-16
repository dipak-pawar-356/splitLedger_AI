"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Phone,
  Bug,
  Clock,
  Send,
  Paperclip,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Building,
  Headphones,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitContactRequest } from "@/actions/contact";

const SUPPORT_EMAIL = "dipakpawar3747@gmail.com";
const SUPPORT_PHONE = "+91 8669233747";
const SUPPORT_PHONE_RAW = "8669233747";

export default function ContactPage() {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    category: "General",
    priority: "Medium" as "Low" | "Medium" | "High" | "Critical",
    message: "",
  });

  const [attachment, setAttachment] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedTicket, setSubmittedTicket] = React.useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in all required fields (Name, Email, Message).");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitContactRequest({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        subject: formData.subject || `${formData.category} Enquiry`,
        category: formData.category,
        priority: formData.priority,
        message: formData.message,
        attachmentUrl: attachment ? `Uploaded: ${attachment.name}` : undefined,
      });

      if (res?.success) {
        setSubmittedTicket(res.ticketNumber);
        toast.success(`Ticket #${res.ticketNumber} submitted! Confirmation email sent.`);
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Failed to submit support request";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedTicket(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      category: "General",
      priority: "Medium",
      message: "",
    });
    setAttachment(null);
  };

  const faqs = [
    {
      q: "How fast will the support team reply?",
      a: "Our guaranteed response SLA is within 24–48 hours for general inquiries. Urgent priority issues and bug reports are triaged promptly.",
    },
    {
      q: "Can I contact support via Phone or WhatsApp?",
      a: `Yes! You can call or WhatsApp our official support hotline at ${SUPPORT_PHONE} during business hours (Monday – Saturday, 10:00 AM – 7:00 PM IST).`,
    },
    {
      q: "How do I report a security vulnerability?",
      a: `Please send responsible disclosure reports directly to ${SUPPORT_EMAIL} with reproduction steps. We acknowledge security submissions within 12 hours.`,
    },
    {
      q: "Where can I request a new feature?",
      a: "Select 'Feature Request' in the contact category above, or email us directly. Our product team reviews requests weekly.",
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-slate-950 py-16 md:py-24 text-slate-800 dark:text-slate-200 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* ================= HERO HEADER ================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-20 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Dedicated Support Center</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            We&apos;re Here to Help
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal max-w-xl mx-auto leading-relaxed">
            Have questions, need technical guidance, found a bug, or want to suggest an improvement? Reach out directly to our engineering desk.
          </p>

          {/* System Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>All Systems Operational (99.9% Cloud Uptime)</span>
          </div>
        </motion.div>

        {/* ================= SUPPORT CHANNELS (CARDS) ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16">
          {/* Email Support */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="group p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] space-y-3"
          >
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit transition-all duration-300 group-hover:scale-110 group-hover:rotate-8 group-hover:shadow-md">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Email Support</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Official email for enquiries, technical assistance, and account questions.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-xs font-bold text-primary hover:underline block pt-1 truncate"
              title={SUPPORT_EMAIL}
            >
              {SUPPORT_EMAIL}
            </a>
          </motion.div>

          {/* Phone Support */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="group p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] space-y-3"
          >
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit transition-all duration-300 group-hover:scale-110 group-hover:rotate-8 group-hover:shadow-md">
              <Phone className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Direct Phone Support</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Call or WhatsApp our team during standard working hours.
            </p>
            <a
              href={`tel:${SUPPORT_PHONE_RAW}`}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline block pt-1"
            >
              {SUPPORT_PHONE}
            </a>
          </motion.div>

          {/* Bug Report Queue */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="group p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs hover:border-rose-500/40 hover:shadow-2xl hover:shadow-rose-500/10 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] space-y-3"
          >
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 w-fit transition-all duration-300 group-hover:scale-110 group-hover:rotate-8 group-hover:shadow-md">
              <Bug className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Bug Report Queue</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Found an issue or calculation discrepancy? Immediate technical triage.
            </p>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block pt-1">
              Priority Review Queue
            </span>
          </motion.div>

          {/* Response SLA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="group p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] space-y-3"
          >
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit transition-all duration-300 group-hover:scale-110 group-hover:rotate-8 group-hover:shadow-md">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Response Time SLA</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Guaranteed engineer review delivered directly to your inbox.
            </p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block pt-1">
              Within 24–48 Hours
            </span>
          </motion.div>
        </div>

        {/* ================= MAIN CONTENT: FORM + SIDEBAR ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start mb-20">
          {/* ================= FORM (8 COLS) ================= */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-8 p-6 sm:p-10 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-6"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Submit a Support Ticket
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Your enquiry will be saved into our support pipeline and routed to our engineering desk.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {submittedTicket ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="p-8 sm:p-12 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-5"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="p-4 bg-emerald-500 text-white rounded-3xl w-fit mx-auto shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="h-10 w-10" />
                  </motion.div>

                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      Ticket #{submittedTicket} Created
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      Thank you! We have logged your request and sent a confirmation notice to{" "}
                      <strong className="text-slate-900 dark:text-white">{formData.email}</strong>. Our support team will respond within 24–48 hours.
                    </p>
                    <div className="pt-2 text-xs font-medium text-slate-500">
                      For urgent issues, call <strong className="text-slate-700 dark:text-slate-300">{SUPPORT_PHONE}</strong>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="rounded-xl text-xs font-semibold h-10 px-5 border-slate-300 dark:border-slate-700 hover:scale-[1.03] active:scale-[0.97] transition-all"
                    >
                      Submit Another Ticket
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Row 1: Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Your Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="rounded-xl text-xs h-10 bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:shadow-md focus:shadow-primary/5"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="email"
                        placeholder="e.g. rahul@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="rounded-xl text-xs h-10 bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:shadow-md focus:shadow-primary/5"
                      />
                    </div>
                  </div>

                  {/* Row 2: Mobile & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Mobile / Phone (Optional)
                      </label>
                      <Input
                        type="tel"
                        placeholder="e.g. +91 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="rounded-xl text-xs h-10 bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:shadow-md focus:shadow-primary/5"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none h-10 transition-all duration-200"
                      >
                        <option>General</option>
                        <option>Bug Report</option>
                        <option>Feature Request</option>
                        <option>Payment</option>
                        <option>Technical Issue</option>
                        <option>Suggestion</option>
                        <option>Account Issue</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Priority & Subject */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 sm:col-span-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Priority Level
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            priority: e.target.value as "Low" | "Medium" | "High" | "Critical",
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none h-10 transition-all duration-200"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Subject
                      </label>
                      <Input
                        type="text"
                        placeholder="Brief summary of your question or issue"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                        className="rounded-xl text-xs h-10 bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:shadow-md focus:shadow-primary/5"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Message <span className="text-rose-500">*</span>
                    </label>
                    <Textarea
                      rows={4}
                      placeholder="Provide details, context, steps to reproduce, or any questions..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      className="rounded-xl text-xs bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:shadow-md focus:shadow-primary/5 leading-relaxed"
                    />
                  </div>

                  {/* Attachment Upload Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Attachment (Optional)</span>
                      <span className="text-[11px] font-normal text-slate-400">PNG, JPG, PDF up to 10MB</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                        <span>{attachment ? "Change file" : "Upload file"}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              if (file.size > 10 * 1024 * 1024) {
                                toast.error("File size cannot exceed 10MB");
                                return;
                              }
                              setAttachment(file);
                            }
                          }}
                        />
                      </label>
                      {attachment && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-xs">
                          ✓ {attachment.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto h-11 px-8 rounded-xl text-xs font-semibold gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-md hover:shadow-xl hover:shadow-primary/10 transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Dispatching Ticket...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Submit Support Ticket</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ================= SIDEBAR (4 COLS) ================= */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 space-y-6"
          >
            {/* Direct Contact Card */}
            <div className="p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-4 hover:shadow-xl hover:border-primary/40 transition-all duration-300 ease-out hover:-translate-y-1.5">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Headphones className="h-4 w-4" />
                <span>Direct Support Details</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 transition-all hover:border-primary/40 hover:shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Official Support Email
                  </span>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="font-bold text-primary hover:underline break-all"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 transition-all hover:border-emerald-500/40 hover:shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Official Phone / WhatsApp
                  </span>
                  <a
                    href={`tel:${SUPPORT_PHONE_RAW}`}
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {SUPPORT_PHONE}
                  </a>
                </div>
              </div>
            </div>

            {/* Office Hours Card */}
            <div className="p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs space-y-3 hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-1.5">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Building className="h-4 w-4" />
                <span>Office &amp; Support Hours</span>
              </div>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="font-medium">Monday – Saturday:</span>
                  <span className="font-bold text-slate-900 dark:text-white">10:00 AM – 7:00 PM IST</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="font-medium">Response SLA:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Within 24–48 Hours</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-medium">Sunday:</span>
                  <span className="text-slate-500 italic">Emergency Monitoring Only</span>
                </div>
              </div>
              <div className="pt-2 text-[11px] text-slate-500 font-medium">
                SplitLedger AI Technologies • Headquartered in India 🇮🇳
              </div>
            </div>

            {/* Quick Self-Serve Box */}
            <div className="p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-primary/20 space-y-3 hover:shadow-xl hover:border-primary/40 transition-all duration-300 ease-out hover:-translate-y-1.5">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span>Self-Serve Documentation</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                Looking for guides on group expense splitting, trip budgets, or UPI QR code payments?
              </p>
              <Link href="/features">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-semibold w-full mt-1 border-slate-200 dark:border-slate-800 hover:scale-[1.03] active:scale-[0.97] transition-all"
                >
                  Browse Features &amp; Guide
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* ================= FAQ ACCORDION (SMOOTH ANIMATED) ================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto space-y-6"
        >
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Support Center FAQ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">Quick solutions to recurring questions</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaqIndex === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 overflow-hidden transition-all duration-250 hover:border-primary/30 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ease-out ${
                        isOpen ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200/40 dark:border-slate-800/40 pt-3">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

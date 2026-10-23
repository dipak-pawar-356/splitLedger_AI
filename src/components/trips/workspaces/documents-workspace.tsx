"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText,
  ShieldCheck,
  Download,
  Eye,
  Plus,
  Search,
  UploadCloud,
  Copy,
  Printer,
  CheckCircle2,
  Lock,
  Calendar,
  X,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentsWorkspaceProps {
  tripName?: string;
}

export interface TravelDocument {
  id: string;
  title: string;
  category: "Permit" | "Insurance" | "Ticket" | "Voucher" | "Identity" | "Medical";
  fileType: "PDF" | "PNG" | "JPG";
  fileSize: string;
  uploadedAt: string;
  verified: boolean;
  notes: string;
  issuer?: string;
  referenceNumber?: string;
}

export function DocumentsWorkspace({ tripName }: DocumentsWorkspaceProps) {
  const [docs, setDocs] = useState<TravelDocument[]>([
    {
      id: "doc_1",
      title: "State Wildlife & Forest Expedition Entry Permit",
      category: "Permit",
      fileType: "PDF",
      fileSize: "2.4 MB",
      uploadedAt: "2027-10-14",
      verified: true,
      notes: "Valid for all 6 expedition convoy members with GPS tracking clearance.",
      issuer: "State Forest & Wildlife Conservation Department",
      referenceNumber: "WLF-EXP-2027-99182",
    },
    {
      id: "doc_2",
      title: "Comprehensive Group Travel & Evacuation Insurance",
      category: "Insurance",
      fileType: "PDF",
      fileSize: "4.1 MB",
      uploadedAt: "2027-10-18",
      verified: true,
      notes: "Policy #T-992011 covering emergency medical evacuation up to ₹10,00,000 per member.",
      issuer: "HDFC ERGO General Insurance Co.",
      referenceNumber: "POL-T992011-EXP",
    },
    {
      id: "doc_3",
      title: "Return Flight E-Tickets & Boarding Passes (Convoy Batch 1)",
      category: "Ticket",
      fileType: "PDF",
      fileSize: "1.8 MB",
      uploadedAt: "2027-10-20",
      verified: true,
      notes: "PNR: 6E-8820 / AI-492 departing 08:30 AM Terminal 2.",
      issuer: "IndiGo & Air India Express",
      referenceNumber: "PNR-6E8820-AI492",
    },
    {
      id: "doc_4",
      title: "Confirmed Heritage Villa Resort Booking Voucher",
      category: "Voucher",
      fileType: "PDF",
      fileSize: "980 KB",
      uploadedAt: "2027-10-21",
      verified: true,
      notes: "Confirmation Code: H-98231 with breakfast and dinner included.",
      issuer: "Heritage Villa & Resorts Goa",
      referenceNumber: "CONF-H-98231",
    },
    {
      id: "doc_5",
      title: "Medical Fitness & High Altitude Clearance Certificates",
      category: "Medical",
      fileType: "PDF",
      fileSize: "3.2 MB",
      uploadedAt: "2027-10-22",
      verified: true,
      notes: "Signed by licensed practitioner covering cardiac and pulmonary capacity.",
      issuer: "Apollo Medical Center & Sports Health Board",
      referenceNumber: "MED-FIT-8841-EXP",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modal States
  const [previewDoc, setPreviewDoc] = useState<TravelDocument | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // New Document Form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<TravelDocument["category"]>("Permit");
  const [newFileType, setNewFileType] = useState<TravelDocument["fileType"]>("PDF");
  const [newFileSize, setNewFileSize] = useState("1.5 MB");
  const [newIssuer, setNewIssuer] = useState("");
  const [newReference, setNewReference] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const categories = ["all", "Permit", "Insurance", "Ticket", "Voucher", "Medical"];

  const filteredDocs = docs.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.referenceNumber && d.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.issuer && d.issuer.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === "all" || d.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const handleDownload = (doc: TravelDocument) => {
    toast.success(`Downloading verified file: ${doc.title} (${doc.fileType})`);
  };

  const handlePrint = (doc: TravelDocument) => {
    toast.info(`Preparing print dialogue for ${doc.title}...`);
    window.print();
  };

  const handleCopyId = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied to clipboard: ${code}`);
  };

  const handleCreateDocument = () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a document title");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const newDoc: TravelDocument = {
      id: `doc_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      fileType: newFileType,
      fileSize: newFileSize.trim() || "1.2 MB",
      uploadedAt: today,
      verified: true,
      notes: newNotes.trim() || "Verified enterprise travel credential",
      issuer: newIssuer.trim() || "SplitLedger Travel Operations Hub",
      referenceNumber: newReference.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    setDocs([newDoc, ...docs]);
    setIsUploadOpen(false);
    setNewTitle("");
    setNewIssuer("");
    setNewReference("");
    setNewNotes("");
    toast.success(`"${newDoc.title}" successfully added to credentials vault!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-amber-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Credentials & Documents Vault
              </h2>
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 font-bold text-[10px] uppercase">
                {docs.length} Vault Items
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure travel permits, high-altitude medical waivers, flight PNRs, and group insurance policies
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsUploadOpen(true)}
          className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground shadow-xs self-end sm:self-center hover:shadow-md transition-all"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Upload Document</span>
        </Button>
      </div>

      {/* Search & Category Filter */}
      <div className="p-3 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search documents by title, policy number, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-slate-200/80 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto w-full sm:w-auto">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                selectedCategory === c
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Document Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.map((doc) => (
          <Card
            key={doc.id}
            onClick={() => setPreviewDoc(doc)}
            className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 shadow-xs hover:border-amber-500/60 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 group-hover:scale-105 transition-transform shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge variant="outline" className="text-[9px] uppercase font-bold py-0">
                        {doc.category}
                      </Badge>
                      <span className="font-mono text-[10px] text-slate-400">{doc.fileType} • {doc.fileSize}</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors leading-tight">
                      {doc.title}
                    </h4>
                  </div>
                </div>

                {doc.verified && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] uppercase font-bold shrink-0">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                {doc.notes}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 mt-2">
              <span className="text-[10px] font-mono">Uploaded: {doc.uploadedAt}</span>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewDoc(doc)}
                  className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-600 hover:bg-amber-500/10 rounded-xl"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(doc)}
                  className="h-8 text-xs font-bold gap-1 rounded-xl border-slate-200 dark:border-slate-800 hover:border-amber-500/50"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filteredDocs.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card/60">
            No travel documents found matching current search.
          </div>
        )}
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
          {previewDoc && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-0.5">
                    {previewDoc.category} Credentials
                  </Badge>
                  {previewDoc.verified && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> SHA-256 Verified
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-slate-100 text-left pt-2 leading-tight">
                  {previewDoc.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 text-left">
                  SplitLedger Secured Identity & Travel Operations Vault Item
                </DialogDescription>
              </DialogHeader>

              {/* Simulated Official Document Certificate Canvas */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner space-y-4 font-sans relative overflow-hidden">
                <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
                  <ShieldCheck className="h-44 w-44" />
                </div>

                {/* Certificate Top Header */}
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-amber-600" />
                    <div>
                      <h5 className="font-extrabold text-xs uppercase text-slate-800 dark:text-slate-200">
                        {previewDoc.issuer || "Authorized Travel Operations Authority"}
                      </h5>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Vault Token: SL-DOC-{previewDoc.id.toUpperCase()}-VERIFIED
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {previewDoc.fileType} • {previewDoc.fileSize}
                  </Badge>
                </div>

                {/* Main Information Block */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Reference / Policy</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                      {previewDoc.referenceNumber || "SL-VAL-882109"}
                      <button
                        type="button"
                        onClick={() => handleCopyId(previewDoc.referenceNumber || "SL-VAL-882109")}
                        className="text-slate-400 hover:text-primary transition-colors p-0.5"
                        title="Copy Reference"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Issue / Upload Date</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                      {previewDoc.uploadedAt}
                    </span>
                  </div>

                  <div className="col-span-2 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Verified Operational Notes</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed mt-1 p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                      {previewDoc.notes}
                    </p>
                  </div>
                </div>

                {/* Digital Verification Seal */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-emerald-500" /> End-to-End Encrypted Storage
                  </span>
                  <span className="font-mono">Status: Active & Valid</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrint(previewDoc)}
                  className="rounded-xl text-xs gap-1.5 w-full sm:w-auto h-9"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewDoc(null)}
                    className="rounded-xl text-xs w-full sm:w-auto h-9"
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(previewDoc)}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto h-9 shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Download File
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* UPLOAD DOCUMENT MODAL */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <UploadCloud className="h-4 w-4 text-amber-600" />
              <span>Upload Credentials & Travel Document</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Attach permits, insurance policies, flight boarding passes, or hotel vouchers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs py-2">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Document Title *</label>
              <Input
                placeholder="e.g. Forest Entry Permit / Flight PNR / Medical Certificate"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3 text-xs"
                >
                  <option value="Permit">Permit</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Ticket">Ticket</option>
                  <option value="Voucher">Voucher</option>
                  <option value="Medical">Medical</option>
                  <option value="Identity">Identity</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">File Format</label>
                <select
                  value={newFileType}
                  onChange={(e) => setNewFileType(e.target.value as any)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3 text-xs"
                >
                  <option value="PDF">PDF Document</option>
                  <option value="PNG">PNG Image</option>
                  <option value="JPG">JPG Image</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Issuing Authority / Agency</label>
                <Input
                  placeholder="e.g. State Forest Dept / IndiGo Airlines"
                  value={newIssuer}
                  onChange={(e) => setNewIssuer(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Policy / Reference No.</label>
                <Input
                  placeholder="e.g. PNR-6E9918 or POL-8820"
                  value={newReference}
                  onChange={(e) => setNewReference(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Operational Notes / Validity</label>
              <Input
                placeholder="e.g. Valid for all 6 members, covers medical emergency up to ₹10L"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateDocument}
                className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white h-9 px-4"
              >
                Upload to Vault
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

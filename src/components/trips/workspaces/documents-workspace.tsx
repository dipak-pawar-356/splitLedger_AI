"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  ShieldCheck,
  Download,
  Eye,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  ExternalLink,
  Copy,
  Calendar,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentsWorkspaceProps {
  tripName?: string;
}

interface TravelDocument {
  id: string;
  title: string;
  category: "Permit" | "Insurance" | "Ticket" | "Voucher" | "Identity" | "Medical";
  fileType: "PDF" | "PNG" | "JPG";
  fileSize: string;
  uploadedAt: string;
  verified: boolean;
  notes: string;
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
    },
    {
      id: "doc_2",
      title: "Comprehensive Group Travel & Evacuation Insurance",
      category: "Insurance",
      fileType: "PDF",
      fileSize: "4.1 MB",
      uploadedAt: "2027-10-18",
      verified: true,
      notes: "Policy #T-992011 covering medical evacuation up to ₹10,00,000.",
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
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = ["all", "Permit", "Insurance", "Ticket", "Voucher", "Medical"];

  const filteredDocs = docs.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || d.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const handleDownload = (doc: TravelDocument) => {
    toast.success(`Downloading ${doc.title} (${doc.fileType})`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          onClick={() => {
            toast.info("Upload travel document modal opened.");
          }}
          className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground shadow-xs self-end sm:self-center"
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
            className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 shadow-xs hover:shadow-lg hover:border-amber-500/40 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge variant="outline" className="text-[9px] uppercase font-bold py-0">
                        {doc.category}
                      </Badge>
                      <span className="font-mono text-[10px] text-slate-400">{doc.fileType} • {doc.fileSize}</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
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

              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/60 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                {doc.notes}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[10px] font-mono">Uploaded: {doc.uploadedAt}</span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast.info(`Viewing preview of ${doc.title}`)}
                  className="h-8 text-xs font-semibold"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(doc)}
                  className="h-8 text-xs font-bold gap-1 rounded-xl"
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
    </div>
  );
}

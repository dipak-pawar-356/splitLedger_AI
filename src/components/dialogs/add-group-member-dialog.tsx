"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Search, Shield, User } from "lucide-react";
import { addGroupMember } from "@/actions/group-members";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const addMemberSchema = z.object({
  memberType: z.enum(["contact", "user"]),
  memberId: z.number(),
  isAdmin: z.boolean().default(false),
});

type AddMemberFormData = z.infer<typeof addMemberSchema>;

interface AddGroupMemberDialogProps {
  trigger?: React.ReactNode;
  groupId: number;
  availableContacts?: Array<{ id: number; name: string; email?: string }>;
  availableUsers?: Array<{ id: number; name: string; email?: string }>;
  onSuccess?: () => void;
}

export function AddGroupMemberDialog({ 
  trigger, 
  groupId,
  availableContacts = [],
  availableUsers = [],
  onSuccess 
}: AddGroupMemberDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      memberType: "contact",
      memberId: 0,
      isAdmin: false,
    },
  });

  const memberType = watch("memberType");
  const isAdmin = watch("isAdmin");

  const filteredContacts = availableContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = availableUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = async (data: AddMemberFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await addGroupMember({
        groupId,
        [data.memberType === "contact" ? "contactId" : "userId"]: data.memberId,
        isAdmin: data.isAdmin,
      });

      toast.success("Member added successfully!");
      reset();
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add member";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Group Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Member Type Selection */}
            <div className="space-y-2">
              <Label>Member Type</Label>
              <Select
                value={memberType}
                onValueChange={(value) => {
                  setValue("memberType", value as "contact" | "user");
                  setValue("memberId", 0);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">Contact (Non-App User)</SelectItem>
                  <SelectItem value="user">App User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search {memberType === "contact" ? "Contacts" : "Users"}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="search"
                  placeholder={`Search by name or email...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Member Selection */}
            <div className="space-y-2">
              <Label>Select {memberType === "contact" ? "Contact" : "User"}</Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {(memberType === "contact" ? filteredContacts : filteredUsers).map((member) => (
                  <Card
                    key={member.id}
                    className={`cursor-pointer transition-colors ${
                      watch("memberId") === member.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                    onClick={() => setValue("memberId", member.id)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        {member.email && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">{member.email}</p>
                        )}
                      </div>
                      {watch("memberId") === member.id && (
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {(memberType === "contact" ? filteredContacts : filteredUsers).length === 0 && (
                  <p className="text-center text-slate-600 dark:text-slate-400 py-4 text-sm">
                    No {memberType === "contact" ? "contacts" : "users"} found
                  </p>
                )}
              </div>
              {errors.memberId && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.memberId.message}</p>
              )}
            </div>

            {/* Admin Role */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isAdmin"
                checked={isAdmin}
                onCheckedChange={(checked) => setValue("isAdmin", checked as boolean)}
              />
              <Label htmlFor="isAdmin" className="flex items-center gap-2 cursor-pointer">
                <Shield className="h-4 w-4" />
                Make this member an admin
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  reset();
                  setSearchQuery("");
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || watch("memberId") === 0}>
                {isLoading ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

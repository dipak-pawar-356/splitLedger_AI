"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Edit, Copy, UserPlus, Archive, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { deleteGroup } from "@/actions/groups";
import { DeleteGroupDialog } from "@/components/dialogs/delete-group-dialog";
import { GroupSettingsDialog } from "@/components/dialogs/group-settings-dialog";
import { UniqueGroupInvitationDialog } from "@/components/group/unique-group-invitation-dialog";

interface GroupSettingsMenuProps {
  groupId: number;
  publicId?: string;
  groupName: string;
  isOwner: boolean;
  isAdmin: boolean;
  memberCount: number;
  totalExpenses: number;
  outstandingBalance: number;
  initialData?: {
    name: string;
    description: string;
    currency: string;
    type: string;
    splitMethod: string;
    coverImage?: string;
  };
}

export function GroupSettingsMenu({
  groupId,
  publicId,
  groupName,
  isOwner,
  isAdmin,
  memberCount,
  totalExpenses,
  outstandingBalance,
  initialData,
}: GroupSettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const groupIdentifier = publicId || String(groupId);

  const handleCopyInviteLink = () => {
    const inviteLink = `${window.location.origin}/dashboard/groups/${groupIdentifier}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Group link copied to clipboard");
    setIsOpen(false);
  };

  const handleArchive = async () => {
    try {
      await deleteGroup(groupIdentifier);
      toast.success("Group archived successfully");
      setIsOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive group");
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <a href={`/dashboard/groups/${groupIdentifier}`} className="flex items-center cursor-pointer">
              <Eye className="h-4 w-4 mr-2" />
              View Group
            </a>
          </DropdownMenuItem>
          
          {(isOwner || isAdmin) && (
            <>
              <DropdownMenuItem onClick={() => { setIsOpen(false); setEditDialogOpen(true); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setIsOpen(false); setInviteDialogOpen(true); }}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyInviteLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Group Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive Group
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem onClick={() => { setIsOpen(false); setDeleteDialogOpen(true); }} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </DropdownMenuItem>
              )}
            </>
          )}
          
          {!isOwner && !isAdmin && (
            <>
              <DropdownMenuItem onClick={handleCopyInviteLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Group Link
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteGroupDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        groupId={groupIdentifier}
        groupName={groupName}
        memberCount={memberCount}
        totalExpenses={totalExpenses}
        outstandingBalance={outstandingBalance}
      />

      <GroupSettingsDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        groupId={groupId}
        publicId={groupIdentifier}
        initialData={initialData || {
          name: groupName,
          description: "",
          currency: "INR",
          type: "friends",
          splitMethod: "equal",
        }}
      />

      <UniqueGroupInvitationDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        groupId={groupIdentifier}
        groupName={groupName}
      />
    </>
  );
}

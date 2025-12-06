"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiRefreshCw } from "react-icons/fi";

export interface SwitchCVConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * Simple confirmation dialog shown when user is editing a WEB or DRAFT CV
 * and wants to switch to another CV.
 * 
 * This is a simple "Are you sure?" dialog since WEB/DRAFT CVs 
 * are already saved and won't be lost.
 */
export default function SwitchCVConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false
}: SwitchCVConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FiRefreshCw className="text-blue-500 w-6 h-6" />
            Switch CV?
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            You are currently editing another CV
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-gray-600 mb-2">
            You are currently editing another CV. Would you like to switch to this CV?
          </p>
          <p className="text-sm text-gray-500">
            Your current CV has been auto-saved.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FiRefreshCw className="mr-1.5 h-4 w-4" />
            Yes, Switch CV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

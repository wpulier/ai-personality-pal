import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export default function ClaimModal({ isOpen, onClose, onClaim, loading, error }: ClaimModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Claim Twin</DialogTitle>
          <DialogDescription>
            This will connect this twin to your account, allowing you to access it anytime.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <p>{error}</p>
            </div>
          )}
          
          <p className="text-sm text-gray-500">
            Once claimed, this twin will be associated with your account and you'll be able to customize its personality, preferences, and media connections.
          </p>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onClaim}
            disabled={loading}
            className={loading ? "opacity-70 cursor-not-allowed" : ""}
          >
            {loading ? "Claiming..." : "Claim Twin"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
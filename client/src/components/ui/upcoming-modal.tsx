import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface UpcomingModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
}

export function UpcomingModal({ isOpen, onClose, appName }: UpcomingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="upcoming-modal">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Coming Soon</DialogTitle>
          <DialogDescription className="mt-2">
            The <span className="font-medium text-foreground">{appName}</span> app is currently in development. 
            You will be notified once it's ready.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center mt-6">
          <Button 
            onClick={onClose} 
            className="w-full min-h-[44px]"
            data-testid="upcoming-modal-ok"
          >
            Ok
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useUpcomingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [appName, setAppName] = useState('');

  const showModal = (name: string) => {
    setAppName(name);
    setIsOpen(true);
  };

  const hideModal = () => {
    setIsOpen(false);
    setAppName('');
  };

  return {
    isOpen,
    appName,
    showModal,
    hideModal,
  };
}

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  fullscreen?: boolean;
}

export const Modal = ({ open, onClose, children, className, fullscreen = false }: ModalProps) => {
  const [isClosing, setIsClosing] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setIsClosing(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-200",
          isClosing ? "opacity-0" : "animate-fade-in"
        )}
        onClick={handleClose}
      />
      
      {/* Content */}
      <div
        className={cn(
          'relative z-10 transition-all duration-200',
          isClosing ? 'modal-exit' : 'modal-enter',
          fullscreen 
            ? 'w-full h-full' 
            : 'w-full max-w-lg mx-4',
          className
        )}
      >
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<{ onClose?: () => void }>, {
              onClose: handleClose
            });
          }
          return child;
        })}
      </div>
    </div>
  );
};

interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalContent = ({ children, className }: ModalContentProps) => (
  <div className={cn(
    'card-surface-elevated p-6 max-h-[90vh] overflow-y-auto scrollbar-thin',
    className
  )}>
    {children}
  </div>
);

interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const ModalHeader = ({ children, onClose, className }: ModalHeaderProps) => (
  <div className={cn('flex items-center justify-between mb-6', className)}>
    <div className="text-lg font-semibold">{children}</div>
    {onClose && (
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter = ({ children, className }: ModalFooterProps) => (
  <div className={cn('flex gap-3 mt-6 pt-4 border-t border-border', className)}>
    {children}
  </div>
);

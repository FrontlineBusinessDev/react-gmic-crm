import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ActionDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}

/** Thin, reusable wrapper around the Dialog chrome (open state, header, close
 * button) so multiple "create X" flows can share one dialog shell instead of
 * each hardcoding its own Dialog/DialogContent/DialogHeader boilerplate — the
 * shell only owns the chrome; the actual form content is passed in as children. */
export function ActionDialogShell({ open, onOpenChange, title, description, children }: ActionDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

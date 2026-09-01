import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { useCrmStore } from "@/store/crmStore";
import type { Client } from "@/types";

interface AddClientServiceDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddClientServiceDialog({ client, open, onOpenChange }: AddClientServiceDialogProps) {
  const { serviceCatalog, addClientService } = useCrmStore();
  const [serviceId, setServiceId] = useState("");
  const [notes, setNotes] = useState("");

  const activeServiceCatalog = serviceCatalog.filter((s) => (s.status ?? "active") === "active");

  function submit() {
    if (!serviceId) return;
    addClientService(client.id, { serviceId, notes: notes.trim() || undefined });
    setServiceId("");
    setNotes("");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setServiceId("");
          setNotes("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add services</DialogTitle>
          <DialogDescription>
            Log a service against {client.name}'s record.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Service</Label>
            <Combobox
              options={activeServiceCatalog.map((s) => ({ value: s.id, label: s.name, sublabel: s.description }))}
              value={serviceId}
              onChange={setServiceId}
              placeholder="Select a service..."
              searchPlaceholder="Search services..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!serviceId}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

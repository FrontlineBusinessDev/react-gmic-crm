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
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { useCrmStore } from "@/store/crmStore";
import type { Client, Unit } from "@/types";

interface AddUnitServicesDialogProps {
  client: Client;
  unit: Unit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUnitServicesDialog({ client, unit, open, onOpenChange }: AddUnitServicesDialogProps) {
  const { serviceCatalog, addServicesToUnit } = useCrmStore();
  const [serviceIds, setServiceIds] = useState<string[]>([]);

  const activeServiceCatalog = serviceCatalog.filter((s) => (s.status ?? "active") === "active");

  function submit() {
    if (serviceIds.length === 0) return;
    addServicesToUnit(client.id, unit.id, serviceIds);
    setServiceIds([]);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setServiceIds([]);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add services</DialogTitle>
          <DialogDescription>
            Log services against {unit.model}'s record.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Services</Label>
            <MultiCombobox
              options={activeServiceCatalog.map((s) => ({ value: s.id, label: s.name, sublabel: s.description }))}
              value={serviceIds}
              onChange={setServiceIds}
              placeholder="Select services..."
              searchPlaceholder="Search services..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={serviceIds.length === 0}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

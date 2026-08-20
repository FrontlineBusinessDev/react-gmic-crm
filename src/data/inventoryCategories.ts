import type { InventoryCategoryDefinition } from "@/types";

export const mockInventoryCategories: InventoryCategoryDefinition[] = [
  { id: "ac-unit", name: "AC Unit", status: "active", tracksSerials: true },
  { id: "material", name: "Material", status: "active" },
  { id: "spare-part", name: "Spare Part", status: "active" },
];

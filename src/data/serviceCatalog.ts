import type { ServiceCatalogItem } from "@/types";

export const mockServiceCatalog: ServiceCatalogItem[] = [
  {
    id: "svc-001",
    name: "Survey",
    description: "On-site assessment of the space and existing setup to recommend unit type, capacity, and placement before installation.",
    samplePrice: 0,
  },
  {
    id: "svc-002",
    name: "Cleaning (PMS)",
    description: "Preventive maintenance service — deep cleaning of indoor/outdoor coils, filters, and drain lines to keep units running efficiently.",
    samplePrice: 800,
  },
  {
    id: "svc-003",
    name: "Repair",
    description: "Diagnosis and repair of malfunctioning units, including part replacement labor for issues like leaks, noise, or cooling failure.",
    samplePrice: 1500,
  },
  {
    id: "svc-004",
    name: "Warranty Claim",
    description: "Service performed under manufacturer or workmanship warranty coverage at no or reduced cost to the client.",
    samplePrice: 0,
  },
  {
    id: "svc-005",
    name: "Inspection",
    description: "Routine check-up of unit condition, refrigerant levels, and electrical components to catch issues before they escalate.",
    samplePrice: 500,
  },
];

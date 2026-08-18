import type { User } from "@/types";

export const mockUsers: User[] = [
  {
    id: "u-admin",
    name: "Grace Miranda",
    email: "admin@gmiccares.ph",
    role: "admin",
    avatarColor: "bg-brand-blue-500",
    title: "Operations Director",
    password: "admin123",
    status: "active",
  },
  {
    id: "u-sales",
    name: "Marco Villanueva",
    email: "sales@gmiccares.ph",
    role: "sales",
    avatarColor: "bg-brand-crimson-500",
    title: "Sales & Client Relations",
    password: "sales123",
    status: "active",
  },
  {
    id: "u-tech",
    name: "Dindo Ramos",
    email: "tech@gmiccares.ph",
    role: "technician",
    avatarColor: "bg-brand-green-500",
    title: "Lead Technician",
    password: "tech123",
    status: "active",
  },
  {
    id: "u-tech2",
    name: "Jerome Suarez",
    email: "jerome@gmiccares.ph",
    role: "technician",
    avatarColor: "bg-brand-cyan-500",
    title: "Field Technician",
    password: "tech123",
    status: "active",
  },
];

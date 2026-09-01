import type { Expense } from "@/types";

export const mockExpenses: Expense[] = [
  {
    id: "exp-001",
    category: "Employee Salaries",
    amount: 42000,
    date: "2026-08-15",
    notes: "Weekly technician & admin payroll",
    createdBy: "Grace Miranda",
  },
  {
    id: "exp-002",
    category: "Gas/Fuel",
    amount: 3500,
    date: "2026-08-17",
    notes: "Service van refuel — Los Baños route",
    createdBy: "Grace Miranda",
  },
  {
    id: "exp-003",
    category: "Meal Allowances",
    amount: 1200,
    date: "2026-08-17",
    notes: "Field team meals — 2 installation jobs",
    createdBy: "Grace Miranda",
  },
  {
    id: "exp-004",
    category: "Employee Salaries",
    amount: 42000,
    date: "2026-08-08",
    notes: "Weekly technician & admin payroll",
    createdBy: "Grace Miranda",
  },
  {
    id: "exp-005",
    category: "Other",
    amount: 2800,
    date: "2026-08-12",
    notes: "Office supplies & printer ink",
    createdBy: "Grace Miranda",
  },
];

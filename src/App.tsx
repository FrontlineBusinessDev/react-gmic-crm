import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ClientsList from "@/pages/clients/ClientsList";
import ClientDetail from "@/pages/clients/ClientDetail";
import LeadsPipeline from "@/pages/leads/LeadsPipeline";
import Inventory from "@/pages/inventory/Inventory";
import Suppliers from "@/pages/suppliers/Suppliers";
import ServiceCatalog from "@/pages/service-catalog/ServiceCatalog";
import Schedule from "@/pages/technicians/Schedule";
import MyJobs from "@/pages/technicians/MyJobs";
import Parts from "@/pages/technicians/Parts";
import Billing from "@/pages/billing/Billing";
import Settings from "@/pages/settings/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/"
            element={
              <ProtectedRoute module="/">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-jobs"
            element={
              <ProtectedRoute module="/my-jobs">
                <MyJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parts"
            element={
              <ProtectedRoute module="/parts">
                <Parts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute module="/clients">
                <ClientsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/:id"
            element={
              <ProtectedRoute module="/clients">
                <ClientDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute module="/leads">
                <LeadsPipeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute module="/inventory">
                <Inventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute module="/suppliers">
                <Suppliers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-catalog"
            element={
              <ProtectedRoute module="/service-catalog">
                <ServiceCatalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute module="/schedule">
                <Schedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute module="/billing">
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute module="/settings">
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

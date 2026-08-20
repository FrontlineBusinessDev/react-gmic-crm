import { useMemo } from "react";
import { BarChart3, Boxes, Package, Users, Wrench, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { MobileList, MobileListCard, MobileListRow } from "@/components/shared/mobile-list";
import { EmptyState } from "@/components/shared/empty-state";
import { RecommendationSeverityBadge } from "@/components/shared/status-badge";
import { useCrmStore } from "@/store/crmStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getInventoryReport,
  getProductReport,
  getClientPurchaseReport,
  getClientServicesReport,
  getRecommendations,
} from "@/lib/reports";

export default function Reports() {
  const { inventory, invoices, clients, schedule } = useCrmStore();

  const inventoryReport = useMemo(() => getInventoryReport(inventory), [inventory]);
  const productReport = useMemo(() => getProductReport(inventory, invoices), [inventory, invoices]);
  const clientPurchaseReport = useMemo(() => getClientPurchaseReport(clients, invoices), [clients, invoices]);
  const clientServiceReport = useMemo(() => getClientServicesReport(clients, schedule), [clients, schedule]);
  const recommendations = useMemo(
    () => getRecommendations(clients, inventory, invoices, schedule),
    [clients, inventory, invoices, schedule]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Inventory, sales, and client insights computed live from current data." />

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">
            <Boxes className="h-3.5 w-3.5" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="h-3.5 w-3.5" /> Products
          </TabsTrigger>
          <TabsTrigger value="purchases">
            <Users className="h-3.5 w-3.5" /> Client Purchases
          </TabsTrigger>
          <TabsTrigger value="services">
            <Wrench className="h-3.5 w-3.5" /> Client Services
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Sparkles className="h-3.5 w-3.5" /> Recommendations
            {recommendations.length > 0 && (
              <Badge variant="warning" className="ml-1.5">{recommendations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card><CardContent className="p-5">
              <p className="text-xs font-medium uppercase text-ink-500">Total Stock Value</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink-800">{formatCurrency(inventoryReport.totalStockValue)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs font-medium uppercase text-ink-500">Low Stock Items</p>
              <p className="mt-1 font-display text-xl font-semibold text-brand-crimson-600">{inventoryReport.lowStockCount}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs font-medium uppercase text-ink-500">Categories</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink-800">{inventoryReport.byCategory.size}</p>
            </CardContent></Card>
          </div>
          {inventoryReport.rows.length === 0 ? (
            <EmptyState icon={Boxes} title="No active inventory items" description="Add items in the Inventory module to see this report." />
          ) : (
            <Card>
              <MobileList>
                {inventoryReport.rows.map((r) => (
                  <MobileListCard key={r.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink-800">{r.name}</p>
                        <p className="font-mono-data text-xs text-ink-400">{r.sku}</p>
                      </div>
                      <Badge variant="secondary">{r.category}</Badge>
                    </div>
                    <MobileListRow label="On hand">
                      <span className={r.low ? "font-semibold text-brand-crimson-600" : "text-ink-700"}>{r.quantityOnHand}</span>
                    </MobileListRow>
                    <MobileListRow label="Stock value">{formatCurrency(r.stockValue)}</MobileListRow>
                  </MobileListCard>
                ))}
              </MobileList>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>On Hand</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Stock Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryReport.rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium text-ink-800">{r.name}</p>
                          <p className="font-mono-data text-xs text-ink-400">{r.sku}</p>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{r.category}</Badge></TableCell>
                        <TableCell className={r.low ? "font-semibold text-brand-crimson-600" : "text-ink-700"}>{r.quantityOnHand}</TableCell>
                        <TableCell className="text-sm text-ink-600">{r.reorderLevel}</TableCell>
                        <TableCell>{formatCurrency(r.stockValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          {productReport.rows.length === 0 ? (
            <EmptyState icon={Package} title="No unit sales recorded yet" description="Invoice line items marked as a unit sale will appear here." />
          ) : (
            <Card>
              <MobileList>
                {productReport.rows.map((r) => (
                  <MobileListCard key={r.inventoryItemId}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink-800">{r.name}</p>
                        <p className="font-mono-data text-xs text-ink-400">{r.sku}</p>
                      </div>
                    </div>
                    <MobileListRow label="Units sold">{r.unitsSold}</MobileListRow>
                    <MobileListRow label="Revenue">{formatCurrency(r.revenue)}</MobileListRow>
                  </MobileListCard>
                ))}
              </MobileList>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Units Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productReport.rows.map((r) => (
                      <TableRow key={r.inventoryItemId}>
                        <TableCell>
                          <p className="font-medium text-ink-800">{r.name}</p>
                          <p className="font-mono-data text-xs text-ink-400">{r.sku}</p>
                        </TableCell>
                        <TableCell className="font-mono-data text-sm">{r.unitsSold}</TableCell>
                        <TableCell>{formatCurrency(r.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="space-y-6">
          {clientPurchaseReport.rows.length === 0 ? (
            <EmptyState icon={Users} title="No clients yet" description="Client purchase totals will appear here once clients are added." />
          ) : (
            <Card>
              <MobileList>
                {clientPurchaseReport.rows.map((r) => (
                  <MobileListCard key={r.clientId}>
                    <p className="font-medium text-ink-800">{r.clientName}</p>
                    <MobileListRow label="Invoices">{r.invoiceCount}</MobileListRow>
                    <MobileListRow label="Total billed">{formatCurrency(r.totalBilled)}</MobileListRow>
                    <MobileListRow label="Total paid">{formatCurrency(r.totalPaid)}</MobileListRow>
                    <MobileListRow label="Balance">
                      <span className={r.balance > 0 ? "font-medium text-brand-crimson-600" : "text-ink-500"}>{formatCurrency(r.balance)}</span>
                    </MobileListRow>
                  </MobileListCard>
                ))}
              </MobileList>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Invoices</TableHead>
                      <TableHead>Total Billed</TableHead>
                      <TableHead>Total Paid</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientPurchaseReport.rows.map((r) => (
                      <TableRow key={r.clientId}>
                        <TableCell className="font-medium text-ink-800">{r.clientName}</TableCell>
                        <TableCell className="font-mono-data text-sm">{r.invoiceCount}</TableCell>
                        <TableCell>{formatCurrency(r.totalBilled)}</TableCell>
                        <TableCell>{formatCurrency(r.totalPaid)}</TableCell>
                        <TableCell className={r.balance > 0 ? "font-medium text-brand-crimson-600" : "text-ink-500"}>{formatCurrency(r.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          {clientServiceReport.rows.length === 0 ? (
            <EmptyState icon={Wrench} title="No completed service jobs yet" description="Clients with a completed or installed job will appear here." />
          ) : (
            <Card>
              <MobileList>
                {clientServiceReport.rows.map((r) => (
                  <MobileListCard key={r.clientId}>
                    <p className="font-medium text-ink-800">{r.clientName}</p>
                    <MobileListRow label="Completed jobs">{r.completedJobs}</MobileListRow>
                    <MobileListRow label="Most requested">{r.mostRequestedType ?? "—"}</MobileListRow>
                  </MobileListCard>
                ))}
              </MobileList>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Completed Jobs</TableHead>
                      <TableHead>Most Requested Service</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientServiceReport.rows.map((r) => (
                      <TableRow key={r.clientId}>
                        <TableCell className="font-medium text-ink-800">{r.clientName}</TableCell>
                        <TableCell className="font-mono-data text-sm">{r.completedJobs}</TableCell>
                        <TableCell className="text-sm text-ink-600">{r.mostRequestedType ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {recommendations.length === 0 ? (
            <EmptyState icon={Sparkles} title="No recommendations right now" description="Nothing needs attention based on current stock, client activity, and warranty data." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recommendations.map((rec) => (
                <Card key={rec.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink-800">{rec.title}</p>
                      <RecommendationSeverityBadge severity={rec.severity} />
                    </div>
                    <p className="text-sm text-ink-600">{rec.detail}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
                      <BarChart3 className="h-3 w-3" /> System-generated · {formatDate(rec.generatedAt.slice(0, 10))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

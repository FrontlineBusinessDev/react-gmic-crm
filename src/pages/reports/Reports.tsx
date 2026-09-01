import { useMemo } from "react";
import { BarChart3, Boxes, Package, Users, Wrench } from "lucide-react";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { MobileList, MobileListCard, MobileListRow } from "@/components/shared/mobile-list";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { useCrmStore } from "@/store/crmStore";
import { formatCurrency } from "@/lib/utils";
import { CHART_COLORS, nivoTheme } from "@/lib/nivo-theme";
import { usePagination } from "@/lib/use-pagination";
import {
  getInventoryReport,
  getProductReport,
  getClientPurchaseReport,
  getClientServicesReport,
} from "@/lib/reports";

export default function Reports() {
  const { inventory, invoices, clients, schedule } = useCrmStore();

  const inventoryReport = useMemo(() => getInventoryReport(inventory), [inventory]);
  const productReport = useMemo(() => getProductReport(inventory, invoices), [inventory, invoices]);
  const clientPurchaseReport = useMemo(() => getClientPurchaseReport(clients, invoices), [clients, invoices]);
  const clientServiceReport = useMemo(() => getClientServicesReport(clients, schedule), [clients, schedule]);

  const totalRevenue = useMemo(
    () => productReport.rows.reduce((sum, r) => sum + r.revenue, 0),
    [productReport]
  );
  const totalOutstanding = useMemo(
    () => clientPurchaseReport.rows.reduce((sum, r) => sum + r.balance, 0),
    [clientPurchaseReport]
  );
  const totalPaid = useMemo(
    () => clientPurchaseReport.rows.reduce((sum, r) => sum + r.totalPaid, 0),
    [clientPurchaseReport]
  );

  const stockByCategoryData = useMemo(
    () =>
      Array.from(inventoryReport.byCategory.entries())
        .map(([category, data]) => ({ category, value: Math.round(data.value) }))
        .sort((a, b) => b.value - a.value),
    [inventoryReport]
  );

  const topProductsData = useMemo(
    () =>
      [...productReport.rows]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6)
        .map((r) => ({ name: r.name, revenue: Math.round(r.revenue) }))
        .reverse(),
    [productReport]
  );

  const paidVsBalanceData = useMemo(
    () => [
      { id: "Paid", label: "Paid", value: Math.round(totalPaid) },
      { id: "Balance", label: "Balance", value: Math.round(totalOutstanding) },
    ],
    [totalPaid, totalOutstanding]
  );

  const inventoryPagination = usePagination(inventoryReport.rows, 10);
  const productsPagination = usePagination(productReport.rows, 10);
  const purchasesPagination = usePagination(clientPurchaseReport.rows, 10);
  const servicesPagination = usePagination(clientServiceReport.rows, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Inventory, sales, and client insights computed live from current data." />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
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
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
            <Card><CardContent className="p-5">
              <p className="text-xs font-medium uppercase text-ink-500">Total Stock Value</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink-800">{formatCurrency(inventoryReport.totalStockValue)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs font-medium uppercase text-ink-500">Total Revenue</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink-800">{formatCurrency(totalRevenue)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs font-medium uppercase text-ink-500">Outstanding Balance</p>
              <p className="mt-1 font-display text-xl font-semibold text-brand-crimson-600">{formatCurrency(totalOutstanding)}</p>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Value by Category</CardTitle>
                <CardDescription>Current inventory value grouped by category</CardDescription>
              </CardHeader>
              <CardContent className="h-72 pt-2">
                {stockByCategoryData.length === 0 ? (
                  <EmptyState icon={Boxes} title="No inventory data" description="Add items in the Product module to see this chart." />
                ) : (
                  <ResponsiveBar
                    data={stockByCategoryData}
                    keys={["value"]}
                    indexBy="category"
                    margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
                    padding={0.35}
                    colors={CHART_COLORS[0]}
                    borderRadius={6}
                    theme={nivoTheme}
                    axisBottom={{ tickSize: 0, tickPadding: 8 }}
                    axisLeft={{ tickSize: 0, tickPadding: 8, format: (v) => `₱${(Number(v) / 1000).toFixed(0)}k` }}
                    enableLabel={false}
                    valueFormat={(v) => formatCurrency(Number(v))}
                    tooltipLabel={(d) => String(d.indexValue)}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Paid vs. Outstanding Balance</CardTitle>
                <CardDescription>Client payments received vs. remaining balance</CardDescription>
              </CardHeader>
              <CardContent className="h-72 pt-2">
                {paidVsBalanceData.every((d) => d.value === 0) ? (
                  <EmptyState icon={Users} title="No financial data" description="Client invoices will appear here once recorded." />
                ) : (
                  <ResponsivePie
                    data={paidVsBalanceData}
                    margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
                    innerRadius={0.55}
                    padAngle={1}
                    cornerRadius={4}
                    colors={[CHART_COLORS[3], CHART_COLORS[2]]}
                    theme={nivoTheme}
                    borderWidth={0}
                    arcLinkLabelsTextColor="#4b6478"
                    arcLinkLabelsColor={{ from: "color" }}
                    arcLabelsTextColor="#ffffff"
                    valueFormat={(v) => formatCurrency(Number(v))}
                    legends={[
                      {
                        anchor: "bottom",
                        direction: "row",
                        translateY: 36,
                        itemWidth: 90,
                        itemHeight: 14,
                        symbolShape: "circle",
                      },
                    ]}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Products by Revenue</CardTitle>
              <CardDescription>Best-selling products from recorded invoices</CardDescription>
            </CardHeader>
            <CardContent className="h-80 pt-2">
              {topProductsData.length === 0 ? (
                <EmptyState icon={Package} title="No product sales recorded yet" description="Invoice line items marked as a product sale will appear here." />
              ) : (
                <ResponsiveBar
                  data={topProductsData}
                  keys={["revenue"]}
                  indexBy="name"
                  layout="horizontal"
                  margin={{ top: 10, right: 30, bottom: 30, left: 140 }}
                  padding={0.35}
                  colors={CHART_COLORS[1]}
                  borderRadius={6}
                  theme={nivoTheme}
                  axisBottom={{ tickSize: 0, tickPadding: 8, format: (v) => `₱${(Number(v) / 1000).toFixed(0)}k` }}
                  axisLeft={{ tickSize: 0, tickPadding: 8 }}
                  enableGridY={false}
                  enableLabel={false}
                  valueFormat={(v) => formatCurrency(Number(v))}
                  tooltipLabel={(d) => String(d.indexValue)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
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
            <EmptyState icon={Boxes} title="No active inventory items" description="Add items in the Product module to see this report." />
          ) : (
            <Card>
              <MobileList>
                {inventoryPagination.pageItems.map((r) => (
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
                    {inventoryPagination.pageItems.map((r) => (
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
              <Pagination
                page={inventoryPagination.page}
                pageSize={inventoryPagination.pageSize}
                total={inventoryPagination.total}
                onPageChange={inventoryPagination.setPage}
                onPageSizeChange={inventoryPagination.setPageSize}
              />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          {productReport.rows.length === 0 ? (
            <EmptyState icon={Package} title="No unit sales recorded yet" description="Invoice line items marked as a unit sale will appear here." />
          ) : (
            <Card>
              <MobileList>
                {productsPagination.pageItems.map((r) => (
                  <MobileListCard key={r.inventoryItemId}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink-800">{r.name}</p>
                        <p className="font-mono-data text-xs text-ink-400">{r.sku}</p>
                      </div>
                    </div>
                    <MobileListRow label="Products sold">{r.unitsSold}</MobileListRow>
                    <MobileListRow label="Revenue">{formatCurrency(r.revenue)}</MobileListRow>
                  </MobileListCard>
                ))}
              </MobileList>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Products Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsPagination.pageItems.map((r) => (
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
              <Pagination
                page={productsPagination.page}
                pageSize={productsPagination.pageSize}
                total={productsPagination.total}
                onPageChange={productsPagination.setPage}
                onPageSizeChange={productsPagination.setPageSize}
              />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="space-y-6">
          {clientPurchaseReport.rows.length === 0 ? (
            <EmptyState icon={Users} title="No clients yet" description="Client purchase totals will appear here once clients are added." />
          ) : (
            <Card>
              <MobileList>
                {purchasesPagination.pageItems.map((r) => (
                  <MobileListCard key={r.clientId}>
                    <p className="font-medium text-ink-800">{r.clientName}</p>
                    <MobileListRow label="Invoices">{r.invoiceCount}</MobileListRow>
                    <MobileListRow label="Total contract price">{formatCurrency(r.totalBilled)}</MobileListRow>
                    <MobileListRow label="Total payment received">{formatCurrency(r.totalPaid)}</MobileListRow>
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
                      <TableHead>Total Contract Price</TableHead>
                      <TableHead>Total Payment Received</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchasesPagination.pageItems.map((r) => (
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
              <Pagination
                page={purchasesPagination.page}
                pageSize={purchasesPagination.pageSize}
                total={purchasesPagination.total}
                onPageChange={purchasesPagination.setPage}
                onPageSizeChange={purchasesPagination.setPageSize}
              />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          {clientServiceReport.rows.length === 0 ? (
            <EmptyState icon={Wrench} title="No completed service jobs yet" description="Clients with a completed or installed job will appear here." />
          ) : (
            <Card>
              <MobileList>
                {servicesPagination.pageItems.map((r) => (
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
                    {servicesPagination.pageItems.map((r) => (
                      <TableRow key={r.clientId}>
                        <TableCell className="font-medium text-ink-800">{r.clientName}</TableCell>
                        <TableCell className="font-mono-data text-sm">{r.completedJobs}</TableCell>
                        <TableCell className="text-sm text-ink-600">{r.mostRequestedType ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={servicesPagination.page}
                pageSize={servicesPagination.pageSize}
                total={servicesPagination.total}
                onPageChange={servicesPagination.setPage}
                onPageSizeChange={servicesPagination.setPageSize}
              />
            </Card>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}

import { Router, IRouter } from "express";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { db, ordersTable, orderItemsTable, productsTable, usersTable, categoriesTable, reviewsTable } from "@workspace/db";
import { eq, sql, desc, gte, and } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

async function fetchReportData(period: string) {
  const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [revenue] = await db.select({ total: sql<number>`coalesce(sum(total::numeric), 0)::float` }).from(ordersTable);
  const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable);
  const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
  const [customerCount] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "customer"));

  const salesByDay = await db.select({
    date: sql<string>`to_char(created_at, 'YYYY-MM-DD')`,
    revenue: sql<number>`coalesce(sum(total::numeric), 0)::float`,
    orders: sql<number>`count(*)::int`,
  }).from(ordersTable)
    .where(gte(ordersTable.createdAt, since))
    .groupBy(sql`to_char(created_at, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(created_at, 'YYYY-MM-DD')`);

  const topProducts = await db.select({
    productId: orderItemsTable.productId,
    productName: orderItemsTable.productName,
    totalSold: sql<number>`sum(order_items.quantity)::int`,
    revenue: sql<number>`sum(order_items.price::numeric * order_items.quantity)::float`,
  }).from(orderItemsTable)
    .groupBy(orderItemsTable.productId, orderItemsTable.productName)
    .orderBy(desc(sql`sum(order_items.price::numeric * order_items.quantity)`))
    .limit(20);

  const revenueByCategory = await db.select({
    categoryName: categoriesTable.name,
    revenue: sql<number>`coalesce(sum(order_items.price::numeric * order_items.quantity), 0)::float`,
    orders: sql<number>`count(distinct order_items.order_id)::int`,
  }).from(orderItemsTable)
    .leftJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .groupBy(categoriesTable.name)
    .orderBy(desc(sql`sum(order_items.price::numeric * order_items.quantity)`));

  const recentOrders = await db.select({
    id: ordersTable.id,
    userId: ordersTable.userId,
    status: ordersTable.status,
    total: ordersTable.total,
    createdAt: ordersTable.createdAt,
    customerName: usersTable.name,
    customerEmail: usersTable.email,
  }).from(ordersTable)
    .leftJoin(usersTable, eq(usersTable.id, ordersTable.userId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(50);

  const lowStock = await db.select({
    id: productsTable.id,
    name: productsTable.name,
    sku: productsTable.sku,
    stock: productsTable.stock,
    categoryId: productsTable.categoryId,
  }).from(productsTable)
    .where(sql`stock < 10`)
    .orderBy(productsTable.stock)
    .limit(50);

  return {
    generatedAt: new Date(),
    period,
    summary: {
      totalRevenue: revenue.total ?? 0,
      totalOrders: orderCount.count ?? 0,
      totalProducts: productCount.count ?? 0,
      totalCustomers: customerCount.count ?? 0,
    },
    salesByDay,
    topProducts,
    revenueByCategory,
    recentOrders,
    lowStock,
  };
}

// ─── PDF Report ────────────────────────────────────────────────────────────────

router.get("/reports/pdf", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const period = typeof req.query.period === "string" ? req.query.period : "30d";
  const data = await fetchReportData(period);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="ecostore-report-${period}-${Date.now()}.pdf"`);

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(res);

  const NAVY = "#0f172a";
  const INDIGO = "#4f46e5";
  const GRAY = "#64748b";
  const LIGHT_GRAY = "#f1f5f9";
  const WHITE = "#ffffff";
  const GREEN = "#16a34a";
  const RED = "#dc2626";

  function pageWidth() { return doc.page.width - 100; }

  function drawHeader() {
    doc.rect(0, 0, doc.page.width, 80).fill(NAVY);
    doc.fillColor(WHITE).fontSize(22).font("Helvetica-Bold").text("EcoStore", 50, 22);
    doc.fontSize(10).font("Helvetica").fillColor("#94a3b8").text("Analytics & Performance Report", 50, 48);
    const periodLabel = period === "7d" ? "Last 7 Days" : period === "90d" ? "Last 90 Days" : period === "1y" ? "Last Year" : "Last 30 Days";
    doc.fillColor(WHITE).fontSize(10).text(`Period: ${periodLabel}`, doc.page.width - 200, 28, { width: 150, align: "right" });
    doc.fillColor("#94a3b8").fontSize(8).text(`Generated: ${data.generatedAt.toLocaleString()}`, doc.page.width - 200, 44, { width: 150, align: "right" });
    doc.y = 100;
  }

  function sectionTitle(title: string) {
    doc.moveDown(0.5);
    doc.rect(50, doc.y, pageWidth(), 24).fill(INDIGO);
    doc.fillColor(WHITE).fontSize(11).font("Helvetica-Bold").text(title, 58, doc.y - 18);
    doc.moveDown(0.3);
  }

  function kpiRow(items: { label: string; value: string; sub?: string }[]) {
    const colW = pageWidth() / items.length;
    const startY = doc.y;
    const boxH = 54;
    items.forEach((item, i) => {
      const x = 50 + i * colW;
      doc.rect(x + 2, startY, colW - 4, boxH).fill(LIGHT_GRAY);
      doc.fillColor(GRAY).fontSize(8).font("Helvetica").text(item.label.toUpperCase(), x + 8, startY + 8, { width: colW - 16 });
      doc.fillColor(NAVY).fontSize(16).font("Helvetica-Bold").text(item.value, x + 8, startY + 20, { width: colW - 16 });
      if (item.sub) {
        doc.fillColor(GRAY).fontSize(8).font("Helvetica").text(item.sub, x + 8, startY + 40, { width: colW - 16 });
      }
    });
    doc.y = startY + boxH + 10;
  }

  function tableHeader(headers: { label: string; width: number }[]) {
    const startY = doc.y;
    let x = 50;
    doc.rect(50, startY, pageWidth(), 18).fill(NAVY);
    headers.forEach(h => {
      doc.fillColor(WHITE).fontSize(8).font("Helvetica-Bold").text(h.label, x + 4, startY + 5, { width: h.width - 8, ellipsis: true });
      x += h.width;
    });
    doc.y = startY + 18;
    return headers;
  }

  function tableRow(values: string[], widths: number[], rowIndex: number) {
    if (doc.y > doc.page.height - 80) {
      doc.addPage();
      drawHeader();
    }
    const startY = doc.y;
    const rowH = 16;
    if (rowIndex % 2 === 0) {
      doc.rect(50, startY, pageWidth(), rowH).fill(LIGHT_GRAY);
    }
    let x = 50;
    values.forEach((v, i) => {
      doc.fillColor(NAVY).fontSize(7.5).font("Helvetica").text(v, x + 4, startY + 4, { width: (widths[i] ?? 80) - 8, ellipsis: true });
      x += (widths[i] ?? 80);
    });
    doc.y = startY + rowH;
  }

  // ─── PAGE 1 ───────────────────────────────────────────────────────────────
  drawHeader();

  sectionTitle("Executive Summary");
  doc.moveDown(0.5);
  const avgOrder = data.summary.totalOrders > 0 ? data.summary.totalRevenue / data.summary.totalOrders : 0;
  kpiRow([
    { label: "Total Revenue", value: `$${data.summary.totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, sub: "All time" },
    { label: "Total Orders", value: data.summary.totalOrders.toLocaleString(), sub: "All time" },
    { label: "Avg Order Value", value: `$${avgOrder.toFixed(2)}`, sub: "Per order" },
    { label: "Customers", value: data.summary.totalCustomers.toLocaleString(), sub: "Registered" },
  ]);

  kpiRow([
    { label: "Products Listed", value: data.summary.totalProducts.toLocaleString(), sub: "Active catalog" },
    { label: "Low Stock Items", value: data.lowStock.length.toString(), sub: "< 10 units" },
    { label: "Sales Period Days", value: (period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30).toString(), sub: "Current report" },
    { label: "Daily Avg Revenue", value: `$${(data.salesByDay.reduce((a, r) => a + r.revenue, 0) / Math.max(data.salesByDay.length, 1)).toFixed(0)}`, sub: "Period average" },
  ]);

  // ─── SALES TABLE ─────────────────────────────────────────────────────────
  doc.moveDown(0.5);
  sectionTitle("Daily Sales Breakdown");
  doc.moveDown(0.3);
  const salesWidths = [120, 130, 110, 120];
  const salesHeaders = [
    { label: "Date", width: salesWidths[0]! },
    { label: "Revenue ($)", width: salesWidths[1]! },
    { label: "Orders", width: salesWidths[2]! },
    { label: "Avg Order Value ($)", width: salesWidths[3]! },
  ];
  tableHeader(salesHeaders);
  data.salesByDay.slice(0, 30).forEach((row, i) => {
    const avg = row.orders > 0 ? row.revenue / row.orders : 0;
    tableRow([
      row.date,
      row.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      row.orders.toString(),
      avg.toFixed(2),
    ], salesWidths, i);
  });

  // ─── PAGE 2: TOP PRODUCTS ─────────────────────────────────────────────────
  doc.addPage();
  drawHeader();

  sectionTitle("Top 20 Products by Revenue");
  doc.moveDown(0.3);
  const prodWidths = [220, 100, 120, 100];
  const prodHeaders = [
    { label: "Product Name", width: prodWidths[0]! },
    { label: "Units Sold", width: prodWidths[1]! },
    { label: "Revenue ($)", width: prodWidths[2]! },
    { label: "Avg Price ($)", width: prodWidths[3]! },
  ];
  tableHeader(prodHeaders);
  data.topProducts.forEach((row, i) => {
    const avg = row.totalSold > 0 ? row.revenue / row.totalSold : 0;
    tableRow([
      row.productName,
      row.totalSold.toString(),
      row.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      avg.toFixed(2),
    ], prodWidths, i);
  });

  doc.moveDown(1);
  sectionTitle("Revenue by Category");
  doc.moveDown(0.3);
  const catWidths = [200, 120, 100, 120];
  const catHeaders = [
    { label: "Category", width: catWidths[0]! },
    { label: "Revenue ($)", width: catWidths[1]! },
    { label: "Orders", width: catWidths[2]! },
    { label: "% of Total", width: catWidths[3]! },
  ];
  tableHeader(catHeaders);
  const totalCatRev = data.revenueByCategory.reduce((a, r) => a + (r.revenue ?? 0), 0);
  data.revenueByCategory.filter(r => r.categoryName).forEach((row, i) => {
    const pct = totalCatRev > 0 ? ((row.revenue ?? 0) / totalCatRev * 100).toFixed(1) : "0.0";
    tableRow([
      row.categoryName ?? "Unknown",
      (row.revenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      (row.orders ?? 0).toString(),
      `${pct}%`,
    ], catWidths, i);
  });

  // ─── PAGE 3: ORDERS & LOW STOCK ──────────────────────────────────────────
  doc.addPage();
  drawHeader();

  sectionTitle("Recent Orders (Last 50)");
  doc.moveDown(0.3);
  const ordWidths = [45, 130, 145, 80, 80];
  const ordHeaders = [
    { label: "#", width: ordWidths[0]! },
    { label: "Customer", width: ordWidths[1]! },
    { label: "Email", width: ordWidths[2]! },
    { label: "Total ($)", width: ordWidths[3]! },
    { label: "Status", width: ordWidths[4]! },
  ];
  tableHeader(ordHeaders);
  data.recentOrders.forEach((row, i) => {
    tableRow([
      row.id.toString(),
      row.customerName ?? "—",
      row.customerEmail ?? "—",
      Number(row.total).toFixed(2),
      row.status,
    ], ordWidths, i);
  });

  if (data.lowStock.length > 0) {
    doc.moveDown(1);
    if (doc.y > doc.page.height - 200) { doc.addPage(); drawHeader(); }
    sectionTitle(`Low Stock Alert (${data.lowStock.length} items below 10 units)`);
    doc.moveDown(0.3);
    const stockWidths = [50, 230, 120, 80];
    const stockHeaders = [
      { label: "ID", width: stockWidths[0]! },
      { label: "Product Name", width: stockWidths[1]! },
      { label: "SKU", width: stockWidths[2]! },
      { label: "Stock", width: stockWidths[3]! },
    ];
    tableHeader(stockHeaders);
    data.lowStock.forEach((row, i) => {
      tableRow([
        row.id.toString(),
        row.name,
        row.sku ?? "—",
        row.stock.toString(),
      ], stockWidths, i);
    });
  }

  // footer on last page
  doc.moveDown(2);
  doc.fontSize(7).fillColor(GRAY).font("Helvetica")
    .text(`EcoStore Report — Generated ${data.generatedAt.toISOString()} — Confidential`, 50, doc.page.height - 40, { align: "center", width: pageWidth() });

  doc.end();
});

// ─── Excel Report ──────────────────────────────────────────────────────────────

router.get("/reports/excel", authenticate, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const period = typeof req.query.period === "string" ? req.query.period : "30d";
  const data = await fetchReportData(period);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "EcoStore";
  workbook.created = new Date();

  const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  const ACCENT_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  const LIGHT_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  const WHITE_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
  const HEADER_FONT: Partial<ExcelJS.Font> = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const BODY_FONT: Partial<ExcelJS.Font> = { name: "Calibri", size: 10 };
  const BORDER: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  function applyHeaderRow(ws: ExcelJS.Worksheet, rowNum: number, columns: string[]) {
    const row = ws.getRow(rowNum);
    columns.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      cell.value = col;
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = BORDER;
    });
    row.height = 22;
    row.commit();
  }

  function applyDataRow(ws: ExcelJS.Worksheet, rowNum: number, values: (string | number | null)[], isAlt: boolean) {
    const row = ws.getRow(rowNum);
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.font = BODY_FONT;
      cell.fill = isAlt ? LIGHT_FILL : WHITE_FILL;
      cell.alignment = { vertical: "middle" };
      cell.border = BORDER;
    });
    row.height = 18;
    row.commit();
  }

  // ── Sheet 1: Summary ────────────────────────────────────────────────────
  const summaryWs = workbook.addWorksheet("Summary");
  summaryWs.mergeCells("A1:D1");
  const titleCell = summaryWs.getCell("A1");
  titleCell.value = "EcoStore Analytics Report";
  titleCell.font = { name: "Calibri", bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  titleCell.fill = ACCENT_FILL;
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  summaryWs.getRow(1).height = 36;

  summaryWs.mergeCells("A2:D2");
  const subtitleCell = summaryWs.getCell("A2");
  const periodLabel = period === "7d" ? "Last 7 Days" : period === "90d" ? "Last 90 Days" : period === "1y" ? "Last Year" : "Last 30 Days";
  subtitleCell.value = `Period: ${periodLabel}  |  Generated: ${data.generatedAt.toLocaleString()}`;
  subtitleCell.font = { name: "Calibri", italic: true, size: 10, color: { argb: "FF64748B" } };
  subtitleCell.alignment = { horizontal: "center" };
  summaryWs.getRow(2).height = 20;

  summaryWs.getRow(3).height = 10;

  applyHeaderRow(summaryWs, 4, ["Metric", "Value"]);
  const avgOrder = data.summary.totalOrders > 0 ? data.summary.totalRevenue / data.summary.totalOrders : 0;
  const summaryRows = [
    ["Total Revenue (All Time)", `$${data.summary.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ["Total Orders", data.summary.totalOrders],
    ["Average Order Value", `$${avgOrder.toFixed(2)}`],
    ["Registered Customers", data.summary.totalCustomers],
    ["Total Products Listed", data.summary.totalProducts],
    ["Low Stock Items (< 10 units)", data.lowStock.length],
    ["Period Sales Days", data.salesByDay.length],
    ["Period Revenue", `$${data.salesByDay.reduce((a, r) => a + r.revenue, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
    ["Period Orders", data.salesByDay.reduce((a, r) => a + r.orders, 0)],
    ["Daily Avg Revenue", `$${(data.salesByDay.reduce((a, r) => a + r.revenue, 0) / Math.max(data.salesByDay.length, 1)).toFixed(2)}`],
  ];
  summaryRows.forEach((row, i) => applyDataRow(summaryWs, 5 + i, row as (string | number)[], i % 2 === 0));
  summaryWs.getColumn(1).width = 36;
  summaryWs.getColumn(2).width = 24;

  // ── Sheet 2: Daily Sales ─────────────────────────────────────────────────
  const salesWs = workbook.addWorksheet("Daily Sales");
  applyHeaderRow(salesWs, 1, ["Date", "Revenue ($)", "Orders", "Avg Order Value ($)"]);
  data.salesByDay.forEach((row, i) => {
    const avg = row.orders > 0 ? row.revenue / row.orders : 0;
    applyDataRow(salesWs, 2 + i, [row.date, row.revenue, row.orders, Math.round(avg * 100) / 100], i % 2 === 0);
  });
  salesWs.getColumn(1).width = 16;
  salesWs.getColumn(2).width = 18;
  salesWs.getColumn(3).width = 12;
  salesWs.getColumn(4).width = 22;
  // add totals row
  const totalRow = data.salesByDay.length + 2;
  const totals = salesWs.getRow(totalRow);
  totals.getCell(1).value = "TOTAL";
  totals.getCell(1).font = { ...BODY_FONT, bold: true };
  totals.getCell(1).fill = LIGHT_FILL;
  totals.getCell(2).value = { formula: `SUM(B2:B${totalRow - 1})` };
  totals.getCell(2).font = { ...BODY_FONT, bold: true };
  totals.getCell(2).fill = LIGHT_FILL;
  totals.getCell(3).value = { formula: `SUM(C2:C${totalRow - 1})` };
  totals.getCell(3).font = { ...BODY_FONT, bold: true };
  totals.getCell(3).fill = LIGHT_FILL;
  totals.commit();

  // ── Sheet 3: Top Products ────────────────────────────────────────────────
  const productsWs = workbook.addWorksheet("Top Products");
  applyHeaderRow(productsWs, 1, ["Rank", "Product Name", "Units Sold", "Revenue ($)", "Avg Unit Price ($)"]);
  data.topProducts.forEach((row, i) => {
    const avg = row.totalSold > 0 ? row.revenue / row.totalSold : 0;
    applyDataRow(productsWs, 2 + i, [i + 1, row.productName, row.totalSold, Math.round(row.revenue * 100) / 100, Math.round(avg * 100) / 100], i % 2 === 0);
  });
  [8, 40, 14, 18, 20].forEach((w, i) => { productsWs.getColumn(i + 1).width = w; });

  // ── Sheet 4: Revenue by Category ─────────────────────────────────────────
  const catWs = workbook.addWorksheet("By Category");
  applyHeaderRow(catWs, 1, ["Category", "Revenue ($)", "Orders", "% of Total Revenue"]);
  const totalCatRev = data.revenueByCategory.reduce((a, r) => a + (r.revenue ?? 0), 0);
  data.revenueByCategory.filter(r => r.categoryName).forEach((row, i) => {
    const pct = totalCatRev > 0 ? Math.round((row.revenue ?? 0) / totalCatRev * 1000) / 10 : 0;
    applyDataRow(catWs, 2 + i, [row.categoryName, Math.round((row.revenue ?? 0) * 100) / 100, row.orders ?? 0, pct], i % 2 === 0);
  });
  [28, 18, 12, 22].forEach((w, i) => { catWs.getColumn(i + 1).width = w; });

  // ── Sheet 5: Recent Orders ───────────────────────────────────────────────
  const ordersWs = workbook.addWorksheet("Recent Orders");
  applyHeaderRow(ordersWs, 1, ["Order ID", "Customer Name", "Customer Email", "Total ($)", "Status", "Date"]);
  data.recentOrders.forEach((row, i) => {
    applyDataRow(ordersWs, 2 + i, [
      row.id,
      row.customerName ?? "—",
      row.customerEmail ?? "—",
      Math.round(Number(row.total) * 100) / 100,
      row.status,
      row.createdAt.toISOString().slice(0, 10),
    ], i % 2 === 0);
  });
  [12, 24, 30, 14, 14, 14].forEach((w, i) => { ordersWs.getColumn(i + 1).width = w; });

  // ── Sheet 6: Low Stock ───────────────────────────────────────────────────
  const stockWs = workbook.addWorksheet("Low Stock");
  applyHeaderRow(stockWs, 1, ["Product ID", "Product Name", "SKU", "Stock Remaining"]);
  data.lowStock.forEach((row, i) => {
    applyDataRow(stockWs, 2 + i, [row.id, row.name, row.sku ?? "—", row.stock], i % 2 === 0);
    if (row.stock === 0) {
      const r = stockWs.getRow(2 + i);
      r.getCell(4).font = { ...BODY_FONT, bold: true, color: { argb: "FFDC2626" } };
      r.commit();
    }
  });
  [12, 36, 18, 18].forEach((w, i) => { stockWs.getColumn(i + 1).width = w; });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="ecostore-report-${period}-${Date.now()}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

export default router;

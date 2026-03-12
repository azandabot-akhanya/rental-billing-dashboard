"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Printer, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { getApiUrl } from "@/lib/api-config"

export default function StockReportSuppliers() {
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0])
  const [supplierRecords, setSupplierRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [downloading, setDownloading] = useState(false)

  const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") || "1" : "1"

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(getApiUrl(`suppliers?company_id=${companyId}`))
      const data = await res.json()
      if (data.success) setSuppliers(data.suppliers || [])
    } catch (error) {
      console.error("Error fetching suppliers:", error)
    }
  }

  const fetchSupplierRecords = async () => {
    if (!selectedSupplier) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        company_id: companyId,
        supplier_id: selectedSupplier,
        start_date: fromDate,
        end_date: toDate,
      })
      const res = await fetch(getApiUrl(`stock/supplier?${params}`))
      const data = await res.json()
      setSupplierRecords(data.data || [])
    } catch (error) {
      console.error("Error fetching supplier records:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSuppliers() }, [])
  useEffect(() => { if (selectedSupplier) fetchSupplierRecords() }, [selectedSupplier, fromDate, toDate])

  const filteredRecords = supplierRecords.filter(
    (r) =>
      (r.name || r.stock_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.date || "").includes(searchTerm)
  )

  const formatNumber = (n: string | number) =>
    Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handlePrint = () => {
    const supplier = suppliers.find((s) => s.supplier_id === selectedSupplier)
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stock Report (Suppliers)</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              background: #fff;
              color: #1a1a1a;
            }

            .report-container {
              max-width: 1200px;
              margin: 0 auto;
              padding: 40px 20px;
            }

            .header {
              background: linear-gradient(135deg, #5B5BFF 0%, #4848CC 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
              margin-bottom: 0;
            }

            .header h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 8px;
            }

            .header p {
              font-size: 16px;
              opacity: 0.95;
            }

            .period-section {
              background: #f8f9fa;
              padding: 20px 30px;
              border-left: 4px solid #5B5BFF;
              border-right: 1px solid #e5e7eb;
              border-bottom: 1px solid #e5e7eb;
              margin-bottom: 30px;
            }

            .period-row {
              display: flex;
              gap: 40px;
              flex-wrap: wrap;
            }

            .period-item {
              flex: 1;
              min-width: 200px;
            }

            .period-label {
              font-size: 12px;
              font-weight: 600;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }

            .period-value {
              font-size: 16px;
              font-weight: 600;
              color: #1a1a1a;
            }

            .table-container {
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            thead {
              background: #5B5BFF;
            }

            th {
              color: white;
              font-weight: 600;
              font-size: 13px;
              text-align: left;
              padding: 14px 16px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            th.number-col {
              text-align: right;
            }

            tbody tr {
              border-bottom: 1px solid #e5e7eb;
            }

            tbody tr:last-child {
              border-bottom: none;
            }

            tbody tr:hover {
              background: #f9fafb;
            }

            td {
              padding: 12px 16px;
              font-size: 14px;
              color: #374151;
            }

            td.number-col {
              text-align: right;
              font-variant-numeric: tabular-nums;
              font-family: 'SF Mono', Monaco, 'Courier New', monospace;
            }

            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 13px;
            }

            .no-records {
              text-align: center;
              padding: 40px;
              color: #6b7280;
              font-size: 14px;
            }

            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }

              .report-container {
                padding: 0;
              }

              .header, thead {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }

              @page {
                margin: 1cm;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <h1>ThynkxPro</h1>
              <p>Stock Report (Suppliers)</p>
            </div>

            <div class="period-section">
              <div class="period-row">
                <div class="period-item">
                  <div class="period-label">Supplier</div>
                  <div class="period-value">${supplier?.name || "-"}</div>
                </div>
                <div class="period-item">
                  <div class="period-label">Period</div>
                  <div class="period-value">${fromDate} to ${toDate}</div>
                </div>
              </div>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Stock</th>
                    <th class="number-col">Received</th>
                    <th class="number-col">Issued</th>
                    <th class="number-col">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  ${supplierRecords.length > 0 ? supplierRecords.map(r => `
                    <tr>
                      <td>${r.name || r.stock_name || "-"}</td>
                      <td class="number-col">${formatNumber(r.total_received || r.received || 0)}</td>
                      <td class="number-col">${formatNumber(r.total_issued || r.issued || 0)}</td>
                      <td class="number-col">${formatNumber(r.balance || 0)}</td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="4" class="no-records">No records found for this supplier.</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>

            <div class="footer">
              🤖 Generated with ThynkXPro | ${new Date().toLocaleDateString()}
            </div>
          </div>
        </body>
      </html>
    `
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(printHTML)
      newWindow.document.close()
      newWindow.print()
    }
  }

  const handleExportPDF = async () => {
    if (!supplierRecords.length) return toast.warning("No records to export")
    setDownloading(true)
    try {
      const doc = new jsPDF("p", "mm", "a4")
      const pageWidth = doc.internal.pageSize.getWidth()
      const supplier = suppliers.find((s) => s.supplier_id === selectedSupplier)

      // Blue header banner
      doc.setFillColor(91, 91, 255)
      doc.rect(0, 0, pageWidth, 35, "F")

      // Title
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("ThynkxPro", pageWidth / 2, 15, { align: "center" })

      doc.setFontSize(14)
      doc.setFont("helvetica", "normal")
      doc.text("Stock Report (Suppliers)", pageWidth / 2, 25, { align: "center" })

      // Period info section
      let y = 45
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(248, 249, 250)
      doc.rect(14, y, pageWidth - 28, 20, "F")

      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(107, 114, 128)
      doc.text("SUPPLIER", 20, y + 7)
      doc.text("PERIOD", 20, y + 15)

      doc.setFont("helvetica", "normal")
      doc.setTextColor(26, 26, 26)
      doc.text(supplier?.name || "-", 60, y + 7)
      doc.text(`${fromDate} to ${toDate}`, 60, y + 15)

      // Stock records table
      y += 30

      const tableData = supplierRecords.map(r => [
        r.name || r.stock_name || "-",
        formatNumber(r.total_received || r.received || 0),
        formatNumber(r.total_issued || r.issued || 0),
        formatNumber(r.balance || 0)
      ])

      autoTable(doc, {
        startY: y,
        head: [["Stock", "Received", "Issued", "Balance"]],
        body: tableData,
        theme: "plain",
        headStyles: {
          fillColor: [91, 91, 255],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
          halign: "left",
          cellPadding: 4
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [55, 65, 81],
          cellPadding: 3
        },
        columnStyles: {
          0: { halign: "left", cellWidth: 70 },
          1: { halign: "right", cellWidth: 35 },
          2: { halign: "right", cellWidth: 35 },
          3: { halign: "right", cellWidth: 35 }
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        margin: { left: 14, right: 14 }
      })

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(9)
        doc.setTextColor(107, 114, 128)
        doc.text(
          `🤖 Generated with ThynkXPro | ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        )
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - 20,
          doc.internal.pageSize.getHeight() - 10,
          { align: "right" }
        )
      }

      doc.save("Stock_Report_Suppliers.pdf")
      toast.success("PDF exported successfully")
    } catch (error) {
      console.error(error)
      toast.error("Failed to generate PDF")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Stock Report (Suppliers)</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print</Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={downloading || !supplierRecords.length}>
            <Download className="w-4 h-4 mr-2" /> {downloading ? "Generating..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle>Report Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.supplier_id} value={s.supplier_id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="bg-blue-500 hover:bg-blue-600" onClick={fetchSupplierRecords} disabled={loading || !selectedSupplier}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Supplier Stock Records</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search records..." className="w-[300px] pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? filteredRecords.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.name || r.stock_name}</TableCell>
                    <TableCell>{formatNumber(r.total_received || r.received || 0)}</TableCell>
                    <TableCell>{formatNumber(r.total_issued || r.issued || 0)}</TableCell>
                    <TableCell>{formatNumber(r.balance || 0)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">No records found for this supplier.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

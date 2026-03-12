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

export default function StockReportPropertyTenant() {
  const [selectedProperty, setSelectedProperty] = useState("")
  const [selectedTenant, setSelectedTenant] = useState("")
  const [properties, setProperties] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0])
  const [stockRecords, setStockRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [downloading, setDownloading] = useState(false)

  const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") || "1" : "1"

  // Fetch ALL properties globally
  const fetchProperties = async () => {
    try {
      const res = await fetch(getApiUrl(`properties?company_id=${companyId}`))
      const data = await res.json()
      setProperties(Array.isArray(data) ? data.flat() : [])
    } catch (error) {
      console.error("Error fetching properties:", error)
    }
  }

  // Fetch tenants for dropdown (filtered by property if selected)
  const fetchTenants = async (propertyId?: string) => {
    try {
      let url = getApiUrl(`tenants?company_id=${companyId}`)
      if (propertyId) {
        url += `&property_id=${propertyId}`
      }
      const res = await fetch(url)
      const data = await res.json()
      const tenantsList = data.flat().filter((t: any) => t && t.full_name)
      setTenants(tenantsList)
    } catch (error) {
      console.error("Error fetching tenants:", error)
    }
  }

  // Fetch stock issued records - property required, tenant optional
  const fetchStockRecords = async () => {
    if (!selectedProperty) {
      toast.error("Please select a property")
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({
        property_id: selectedProperty,
        start_date: fromDate,
        end_date: toDate,
      })
      // Only add tenant_id if selected
      if (selectedTenant) {
        params.append("tenant_id", selectedTenant)
      }

      const res = await fetch(getApiUrl(`stock/property?${params}`))
      const data = await res.json()
      setStockRecords(data.data || [])
    } catch (error) {
      console.error("Error fetching stock records:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  // When property changes, fetch tenants for that property
  useEffect(() => {
    if (selectedProperty) {
      fetchTenants(selectedProperty)
      setSelectedTenant("") // Reset tenant selection
    }
  }, [selectedProperty])

  const filteredRecords = stockRecords.filter(
    r => (r.name || r.stock_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
         (r.property_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
         (r.tenant_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatNumber = (n: string | number) =>
    Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Print
  const handlePrint = () => {
    const property = properties.find(p => String(p.property_id) === selectedProperty)
    const tenant = tenants.find(t => t.tenant_id === selectedTenant)
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stock Report (Property/Tenant)</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; }
            .report-container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
            .header { background: linear-gradient(135deg, #5B5BFF 0%, #4848CC 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
            .header p { font-size: 16px; opacity: 0.95; }
            .period-section { background: #f8f9fa; padding: 20px 30px; border-left: 4px solid #5B5BFF; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin-bottom: 30px; }
            .period-row { display: flex; gap: 40px; flex-wrap: wrap; }
            .period-item { flex: 1; min-width: 150px; }
            .period-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
            .period-value { font-size: 16px; font-weight: 600; color: #1a1a1a; }
            .table-container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
            table { width: 100%; border-collapse: collapse; }
            thead { background: #5B5BFF; }
            th { color: white; font-weight: 600; font-size: 13px; text-align: left; padding: 14px 16px; text-transform: uppercase; letter-spacing: 0.5px; }
            th.number-col { text-align: right; }
            tbody tr { border-bottom: 1px solid #e5e7eb; }
            tbody tr:last-child { border-bottom: none; }
            tbody tr:hover { background: #f9fafb; }
            td { padding: 12px 16px; font-size: 14px; color: #374151; }
            td.number-col { text-align: right; font-variant-numeric: tabular-nums; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 13px; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .report-container { padding: 0; } @page { margin: 1cm; } }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <h1>ThynkxPro</h1>
              <p>Stock Report (Property/Tenant)</p>
            </div>
            <div class="period-section">
              <div class="period-row">
                <div class="period-item">
                  <div class="period-label">Property</div>
                  <div class="period-value">${property?.property_name || "All Properties"}</div>
                </div>
                <div class="period-item">
                  <div class="period-label">Tenant</div>
                  <div class="period-value">${tenant?.full_name || "All Tenants"}</div>
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
                    <th>Date</th>
                    <th>Stock</th>
                    <th>Property</th>
                    <th>Tenant</th>
                    <th>Issued To</th>
                    <th class="number-col">Qty Issued</th>
                  </tr>
                </thead>
                <tbody>
                  ${stockRecords.length > 0 ? stockRecords.map(r => `
                    <tr>
                      <td>${r.issued_date || "-"}</td>
                      <td>${r.name || r.stock_name || "-"}</td>
                      <td>${r.property_name || "-"}</td>
                      <td>${r.tenant_name || "-"}</td>
                      <td>${r.issued_to || "-"}</td>
                      <td class="number-col">${formatNumber(r.total_issued || r.quantity || 0)}</td>
                    </tr>
                  `).join('') : `
                    <tr><td colspan="6" style="text-align:center;padding:40px;">No records found.</td></tr>
                  `}
                </tbody>
              </table>
            </div>
            <div class="footer">Generated with ThynkXPro | ${new Date().toLocaleDateString()}</div>
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

  // Export PDF
  const handleExportPDF = async () => {
    if (!stockRecords.length) return toast.warning("No records to export")
    setDownloading(true)
    try {
      const doc = new jsPDF("l", "mm", "a4") // Landscape for more columns
      const pageWidth = doc.internal.pageSize.getWidth()
      const property = properties.find(p => String(p.property_id) === selectedProperty)
      const tenant = tenants.find(t => t.tenant_id === selectedTenant)

      // Blue header banner
      doc.setFillColor(91, 91, 255)
      doc.rect(0, 0, pageWidth, 35, "F")

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("ThynkxPro", pageWidth / 2, 15, { align: "center" })

      doc.setFontSize(14)
      doc.setFont("helvetica", "normal")
      doc.text("Stock Report (Property/Tenant)", pageWidth / 2, 25, { align: "center" })

      // Period info section
      let y = 45
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(248, 249, 250)
      doc.rect(14, y, pageWidth - 28, 20, "F")

      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(107, 114, 128)
      doc.text("PROPERTY", 20, y + 7)
      doc.text("TENANT", 100, y + 7)
      doc.text("PERIOD", 180, y + 7)

      doc.setFont("helvetica", "normal")
      doc.setTextColor(26, 26, 26)
      doc.text(property?.property_name || "All Properties", 20, y + 14)
      doc.text(tenant?.full_name || "All Tenants", 100, y + 14)
      doc.text(`${fromDate} to ${toDate}`, 180, y + 14)

      y += 30

      const tableData = stockRecords.map(r => [
        r.issued_date || "-",
        r.name || r.stock_name || "-",
        r.property_name || "-",
        r.tenant_name || "-",
        r.issued_to || "-",
        formatNumber(r.total_issued || r.quantity || 0)
      ])

      autoTable(doc, {
        startY: y,
        head: [["Date", "Stock", "Property", "Tenant", "Issued To", "Qty Issued"]],
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
          0: { cellWidth: 30 },
          1: { cellWidth: 50 },
          2: { cellWidth: 50 },
          3: { cellWidth: 50 },
          4: { cellWidth: 40 },
          5: { halign: "right", cellWidth: 30 }
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 14, right: 14 }
      })

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(9)
        doc.setTextColor(107, 114, 128)
        doc.text(`Generated with ThynkXPro | ${new Date().toLocaleDateString()}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" })
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: "right" })
      }

      doc.save("Stock_Report_Property_Tenant.pdf")
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Report (Property/Tenant)</h2>
          <p className="text-muted-foreground">View stock issued to properties and tenants</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={!stockRecords.length}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={downloading || !stockRecords.length}>
            <Download className="w-4 h-4 mr-2" /> {downloading ? "Generating..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle>Report Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Property *</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.property_id} value={String(p.property_id)}>{p.property_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tenant (Optional)</Label>
              <Select value={selectedTenant} onValueChange={(val) => setSelectedTenant(val === "all" ? "" : val)} disabled={!selectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedProperty ? "All tenants" : "Select property first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {tenants.map(t => (
                    <SelectItem key={t.tenant_id} value={t.tenant_id}>{t.full_name}</SelectItem>
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
              <Button className="bg-blue-500 hover:bg-blue-600" onClick={fetchStockRecords} disabled={loading || !selectedProperty}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stock Issued Records</CardTitle>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Issued To</TableHead>
                  <TableHead>Qty Issued</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? filteredRecords.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.issued_date}</TableCell>
                    <TableCell>{r.name || r.stock_name}</TableCell>
                    <TableCell>{r.property_name || "-"}</TableCell>
                    <TableCell>{r.tenant_name || "-"}</TableCell>
                    <TableCell>{r.issued_to || "-"}</TableCell>
                    <TableCell>{formatNumber(r.total_issued || r.quantity)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      {selectedProperty ? "No records found. Click 'Generate Report' to load data." : "Select a property and click 'Generate Report' to view records."}
                    </TableCell>
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

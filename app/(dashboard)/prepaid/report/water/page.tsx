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

export default function WaterReportPage() {
  const [selectedTenant, setSelectedTenant] = useState("")
  const [selectedProperty, setSelectedProperty] = useState("")
  const [tenants, setTenants] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0])
  const [readings, setReadings] = useState<any[]>([])
  const [summary, setSummary] = useState({
    opening_reading: 0,
    total_consumption: 0,
    closing_reading: 0,
    total_voucher_amount: 0
  })
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [downloading, setDownloading] = useState(false)

  const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") || "1" : "1"

  // 🔹 Fetch properties
  const fetchProperties = async () => {
    try {
      const res = await fetch(getApiUrl(`properties?company_id=${companyId}`))
      const data = await res.json()
      setProperties(Array.isArray(data) ? data.flat() : [])
    } catch (error) {
      console.error("Error fetching properties:", error)
    }
  }

  // 🔹 Fetch tenants (optionally filtered by property)
  const fetchTenants = async (propertyId?: string) => {
    try {
      let url = getApiUrl(`tenants?company_id=${companyId}`)
      if (propertyId) {
        url += `&property_id=${propertyId}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setTenants(Array.isArray(data) ? data.flat() : [])
    } catch (error) {
      console.error("Error fetching tenants:", error)
    }
  }

  // 🔹 Fetch water readings
  const fetchWaterReadings = async () => {
    if (!selectedProperty) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        company_id: companyId,
        utility_type: "water",
        start_date: fromDate,
        end_date: toDate,
        tenant_id: selectedTenant || "",
        property_id: selectedProperty || ""
      })
      const res = await fetch(getApiUrl(`utilities/meter-readings?${params}`))
      const data = await res.json()
      const sorted = (data.readings || []).sort((a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime())

      // 🔹 calculate consumption
      let prev = 0
      const readingsWithConsumption = sorted.map((r, i) => {
        const consumption = i === 0 ? 0 : r.reading - prev
        prev = r.reading
        return { ...r, consumption, voucher_amount: parseFloat(r.voucher_amount) || 0 }
      })

      const opening_reading = readingsWithConsumption?.[0]?.reading || 0
      const closing_reading = readingsWithConsumption?.[readingsWithConsumption.length - 1]?.reading || 0
      const total_consumption = readingsWithConsumption.reduce((acc, r) => acc + r.consumption, 0)
      const total_voucher_amount = data.total_voucher_amount || readingsWithConsumption.reduce((acc, r) => acc + (r.voucher_amount || 0), 0)

      setReadings(readingsWithConsumption)
      setSummary({ opening_reading, total_consumption, closing_reading, total_voucher_amount })
    } catch (error) {
      console.error("Error fetching water readings:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProperties()
    fetchTenants()
  }, [])

  // When property changes, refetch tenants and reset tenant selection
  useEffect(() => {
    if (selectedProperty) {
      fetchTenants(selectedProperty)
      setSelectedTenant("")
    }
  }, [selectedProperty])

  useEffect(() => {
    if (selectedProperty) fetchWaterReadings()
  }, [selectedTenant, selectedProperty, fromDate, toDate])

  const filteredReadings = readings.filter(
    (r) =>
      (r.reading_date || "").includes(searchTerm) ||
      (r.tenant_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatNumber = (n: string | number) =>
    Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // 🔹 Print report
  const handlePrint = () => {
    const companyName = localStorage.getItem("companyName") || "ThynkXPro"
    const selectedPropertyObj = properties.find(p => String(p.property_id) === selectedProperty)
    const selectedTenantObj = tenants.find(t => String(t.tenant_id) === selectedTenant)

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Water Report</title>
          <meta charset="utf-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #333;
              line-height: 1.6;
            }
            .page {
              max-width: 210mm;
              margin: 0 auto;
              padding: 20mm;
              background: white;
            }

            /* Professional Header */
            .header {
              background: linear-gradient(135deg, #5B5BFF 0%, #4040CC 100%);
              color: white;
              padding: 30px;
              text-align: center;
              margin: -20mm -20mm 20px -20mm;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header h1 {
              font-size: 32px;
              font-weight: 700;
              margin-bottom: 8px;
              letter-spacing: 1px;
            }
            .header h2 {
              font-size: 18px;
              font-weight: 400;
              opacity: 0.95;
            }

            /* Period Section */
            .period-section {
              background: #f8f9fa;
              padding: 15px 20px;
              border-radius: 8px;
              margin-bottom: 25px;
              border-left: 4px solid #5B5BFF;
            }
            .period-section p {
              font-size: 14px;
              color: #495057;
            }
            .period-section strong {
              color: #212529;
              font-weight: 600;
            }

            /* Summary Cards */
            .summary-section {
              margin-bottom: 30px;
            }
            .summary-title {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 15px;
              color: #212529;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 25px;
            }
            .summary-card {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              padding: 20px;
              border-radius: 10px;
              border: 1px solid #dee2e6;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .summary-card h3 {
              font-size: 12px;
              color: #6c757d;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
              font-weight: 600;
            }
            .summary-card .value {
              font-size: 24px;
              font-weight: 700;
              color: #5B5BFF;
            }

            /* Table Section */
            .table-section {
              margin-top: 30px;
            }
            .table-title {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 15px;
              color: #212529;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
              border-radius: 8px;
              overflow: hidden;
            }
            thead {
              background: linear-gradient(135deg, #5B5BFF 0%, #4040CC 100%);
              color: white;
            }
            th {
              padding: 14px 12px;
              text-align: left;
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            th.text-right {
              text-align: right;
            }
            tbody tr {
              border-bottom: 1px solid #e9ecef;
              transition: background-color 0.2s;
            }
            tbody tr:hover {
              background-color: #f8f9fa;
            }
            tbody tr:last-child {
              border-bottom: none;
            }
            td {
              padding: 12px;
              font-size: 13px;
              color: #495057;
            }
            td.text-right {
              text-align: right;
              font-weight: 500;
            }

            /* Footer */
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e9ecef;
              text-align: center;
            }
            .footer p {
              color: #6c757d;
              font-size: 11px;
              margin-bottom: 5px;
            }
            .footer .branding {
              color: #5B5BFF;
              font-weight: 600;
              font-size: 12px;
            }

            /* Print Styles */
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              .page {
                margin: 0;
                padding: 15mm;
              }
              .header {
                margin: -15mm -15mm 15mm -15mm;
                page-break-after: avoid;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              thead {
                display: table-header-group;
              }
              tfoot {
                display: table-footer-group;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <!-- Header -->
            <div class="header">
              <h1>${companyName}</h1>
              <h2>Water Report</h2>
            </div>

            <!-- Period & Report Info -->
            <div class="period-section">
              <p><strong>Report Period:</strong> ${fromDate} to ${toDate}</p>
              <p><strong>Property:</strong> ${selectedPropertyObj?.property_name || 'N/A'}</p>
              ${selectedTenant ? `<p><strong>Tenant:</strong> ${selectedTenantObj?.full_name || 'N/A'}</p>` : ''}
            </div>

            <!-- Summary -->
            <div class="summary-section">
              <h3 class="summary-title">Summary</h3>
              <div class="summary-grid" style="grid-template-columns: repeat(4, 1fr);">
                <div class="summary-card">
                  <h3>Opening Reading</h3>
                  <div class="value">${formatNumber(summary.opening_reading)}</div>
                </div>
                <div class="summary-card">
                  <h3>Total Consumption</h3>
                  <div class="value">${formatNumber(summary.total_consumption)}</div>
                </div>
                <div class="summary-card">
                  <h3>Closing Reading</h3>
                  <div class="value">${formatNumber(summary.closing_reading)}</div>
                </div>
                <div class="summary-card">
                  <h3>Total Voucher Amount</h3>
                  <div class="value" style="color: #3b82f6;">R ${formatNumber(summary.total_voucher_amount)}</div>
                </div>
              </div>
            </div>

            <!-- Readings Table -->
            <div class="table-section">
              <h3 class="table-title">Meter Readings</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th class="text-right">Reading</th>
                    <th class="text-right">Consumption</th>
                    <th class="text-right">Voucher Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${readings.map(r => `
                    <tr>
                      <td>${r.reading_date || 'N/A'}</td>
                      <td class="text-right">${formatNumber(r.reading)}</td>
                      <td class="text-right">${formatNumber(r.consumption)}</td>
                      <td class="text-right" style="color: #3b82f6;">R ${formatNumber(r.voucher_amount || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="branding">🤖 Generated with ThynkXPro</p>
              <p>This report was generated electronically and requires no signature.</p>
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(printHTML)
      newWindow.document.close()
      setTimeout(() => {
        newWindow.print()
      }, 250)
    }
  }

  // 🔹 PDF generation
  const handleExportPDF = async () => {
    if (!readings.length) return toast.warning("No readings to export")
    setDownloading(true)
    try {
      const doc = new jsPDF("p", "mm", "a4")
      const pageWidth = doc.internal.pageSize.getWidth()
      let yPos = 0

      // Professional Header - Blue Banner
      doc.setFillColor(91, 91, 255) // #5B5BFF - ThynkXPro blue
      doc.rect(0, 0, pageWidth, 40, 'F')

      // Company Name
      const companyName = localStorage.getItem("companyName") || "ThynkXPro"
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(companyName, pageWidth / 2, 20, { align: 'center' })

      // Document Title
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text('Water Report', pageWidth / 2, 32, { align: 'center' })

      yPos = 50

      // Report Info Section
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')

      const selectedPropertyObj = properties.find(p => String(p.property_id) === selectedProperty)
      const selectedTenantObj = tenants.find(t => String(t.tenant_id) === selectedTenant)

      doc.text(`Period: ${fromDate} to ${toDate}`, 14, yPos)
      yPos += 6
      doc.text(`Property: ${selectedPropertyObj?.property_name || 'N/A'}`, 14, yPos)
      if (selectedTenant) {
        yPos += 6
        doc.text(`Tenant: ${selectedTenantObj?.full_name || 'N/A'}`, 14, yPos)
      }
      yPos += 10

      // Summary Section
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary', 14, yPos)
      yPos += 8

      const summaryData = [
        ['Opening Reading', formatNumber(summary.opening_reading)],
        ['Total Consumption', formatNumber(summary.total_consumption)],
        ['Closing Reading', formatNumber(summary.closing_reading)],
        ['Total Voucher Amount', 'R ' + formatNumber(summary.total_voucher_amount)]
      ]

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: {
          fillColor: [91, 91, 255],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 10
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 80, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      })

      yPos = (doc as any).lastAutoTable.finalY + 15

      // Readings Table
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Meter Readings', 14, yPos)
      yPos += 5

      const tableData = readings.map(r => [
        r.reading_date || 'N/A',
        formatNumber(r.reading),
        formatNumber(r.consumption),
        'R ' + formatNumber(r.voucher_amount || 0)
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Reading', 'Consumption', 'Voucher Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [91, 91, 255],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 45, halign: 'right' },
          2: { cellWidth: 45, halign: 'right' },
          3: { cellWidth: 45, halign: 'right' }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer on every page
          const pageCount = (doc as any).internal.getNumberOfPages()
          const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber

          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          doc.setFont('helvetica', 'normal')
          doc.text(
            `🤖 Generated with ThynkXPro`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          )
          doc.text(
            `Page ${currentPage} of ${pageCount}`,
            pageWidth - 20,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'right' }
          )
        }
      })

      doc.save("Water_Report.pdf")
      toast.success("PDF generated successfully!")
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
          <h2 className="text-3xl font-bold tracking-tight">Water Reports</h2>
          <p className="text-muted-foreground">View detailed water readings and consumption trends</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print</Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={downloading || !readings.length}>
            <Download className="w-4 h-4 mr-2" /> {downloading ? "Generating..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 🔹 Property Dropdown (FIRST) */}
            <div className="space-y-2">
              <Label>Property *</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => <SelectItem key={p.property_id} value={String(p.property_id)}>{p.property_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* 🔹 Tenant Dropdown (SECOND - filtered by property) */}
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant} disabled={!selectedProperty}>
                <SelectTrigger><SelectValue placeholder={selectedProperty ? "Select tenant (optional)" : "Select property first"} /></SelectTrigger>
                <SelectContent>
                  {tenants.map(t => <SelectItem key={t.tenant_id} value={String(t.tenant_id)}>{t.full_name}</SelectItem>)}
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
              <Button className="bg-blue-500 hover:bg-blue-600" onClick={fetchWaterReadings} disabled={loading || !selectedProperty}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">💧</div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">Opening Reading</p>
              <p className="text-2xl font-bold">{formatNumber(summary.opening_reading)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-teal-100 rounded-full flex items-center justify-center">📈</div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">Total Consumption</p>
              <p className="text-2xl font-bold text-teal-600">{formatNumber(summary.total_consumption)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-blue-200 rounded-full flex items-center justify-center">💧</div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">Closing Reading</p>
              <p className="text-2xl font-bold">{formatNumber(summary.closing_reading)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">R</div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">Total Voucher Amount</p>
              <p className="text-2xl font-bold text-green-600">R {formatNumber(summary.total_voucher_amount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Readings Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Water Meter Readings</CardTitle>
            <p className="text-sm text-muted-foreground">Period: {fromDate} to {toDate}</p>
            {selectedProperty && (
              <div className="mt-2 text-sm">
                <span className="font-semibold">Property:</span> {properties.find(p => String(p.property_id) === selectedProperty)?.property_name || 'N/A'}
                {selectedTenant && (
                  <>
                    <span className="mx-2">|</span>
                    <span className="font-semibold">Tenant:</span> {tenants.find(t => String(t.tenant_id) === selectedTenant)?.full_name || 'N/A'}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search readings..." className="w-[300px] pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
                  <TableHead>Reading</TableHead>
                  <TableHead>Consumption</TableHead>
                  <TableHead>Voucher Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReadings.length > 0 ? (
                  filteredReadings.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.reading_date}</TableCell>
                      <TableCell className="font-medium">{formatNumber(r.reading)}</TableCell>
                      <TableCell className="font-medium">{formatNumber(r.consumption)}</TableCell>
                      <TableCell className="font-medium text-green-600">R {formatNumber(r.voucher_amount || 0)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      {selectedTenant || selectedProperty
                        ? "No readings found for the selected period."
                        : "Please select a tenant or property to view readings."}
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

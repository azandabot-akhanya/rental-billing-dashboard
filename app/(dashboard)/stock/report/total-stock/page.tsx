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

export default function TotalStockReportPage() {
  const [selectedStock, setSelectedStock] = useState("")
  const [stocks, setStocks] = useState<any[]>([])
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0])
  const [stockRecords, setStockRecords] = useState<any[]>([])
  const [summary, setSummary] = useState({ opening_stock: 0, total_received: 0, total_issued: 0, closing_stock: 0 })
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [downloading, setDownloading] = useState(false)

  const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") || "1" : "1"

  // 🔹 Fetch available stock names
  const fetchStocks = async () => {
    try {
      const res = await fetch(getApiUrl(`stock/total?company_id=${companyId}`))
      const data = await res.json()
      setStocks(data.data || [])
    } catch (error) {
      console.error("Error fetching stocks:", error)
    }
  }

  // 🔹 Fetch stock records (all or by selected stock)
  const fetchStockRecords = async () => {
    setLoading(true)
    try {
        const params = new URLSearchParams({
            company_id: companyId
          })

      const res = await fetch(getApiUrl(`stock/total?${params}`))
      const data = await res.json()
      let records = data.data || []

      // Filter by selected stock if one is selected
      if (selectedStock) {
        records = records.filter(r => r.name === selectedStock)
      }

      // Calculate summary from filtered records
      const total_received = records.reduce((acc, r) => acc + (Number(r.total_received) || 0), 0)
      const total_issued = records.reduce((acc, r) => acc + (Number(r.total_issued) || 0), 0)
      const balance = records.reduce((acc, r) => acc + (Number(r.balance) || 0), 0)
      const opening_stock = total_received - total_issued - balance

      setStockRecords(records)
      setSummary({
        opening_stock,
        total_received,
        total_issued,
        closing_stock: balance
      })
    } catch (error) {
      console.error("Error fetching stock records:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStocks()
    fetchStockRecords()
  }, [])

  useEffect(() => {
    fetchStockRecords()
  }, [selectedStock, fromDate, toDate])

  const filteredRecords = stockRecords.filter(
    (r) =>
      (r.date || "").includes(searchTerm) ||
      (r.stock_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatNumber = (n: string | number) =>
    Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // 🔹 Print report
  const handlePrint = () => {
    const companyName = localStorage.getItem("companyName") || "ThynkXPro"

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Total Stock Report</title>
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
              grid-template-columns: repeat(4, 1fr);
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
              <h2>Total Stock Report</h2>
            </div>

            <!-- Period & Report Info -->
            <div class="period-section">
              <p><strong>Stock:</strong> ${selectedStock || "All Stocks"}</p>
              <p><strong>Period:</strong> ${fromDate} to ${toDate}</p>
            </div>

            <!-- Summary -->
            <div class="summary-section">
              <h3 class="summary-title">Summary</h3>
              <div class="summary-grid">
                <div class="summary-card">
                  <h3>Opening Stock</h3>
                  <div class="value">${formatNumber(summary.opening_stock)}</div>
                </div>
                <div class="summary-card">
                  <h3>Total Received</h3>
                  <div class="value">${formatNumber(summary.total_received)}</div>
                </div>
                <div class="summary-card">
                  <h3>Total Issued</h3>
                  <div class="value">${formatNumber(summary.total_issued)}</div>
                </div>
                <div class="summary-card">
                  <h3>Closing Stock</h3>
                  <div class="value">${formatNumber(summary.closing_stock)}</div>
                </div>
              </div>
            </div>

            <!-- Stock Records Table -->
            <div class="table-section">
              <h3 class="table-title">Stock Records</h3>
              <table>
                <thead>
                  <tr>
                    <th>Stock</th>
                    <th class="text-right">Received</th>
                    <th class="text-right">Issued</th>
                    <th class="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  ${stockRecords.map(r => `
                    <tr>
                      <td>${r.name || 'N/A'}</td>
                      <td class="text-right">${formatNumber(r.total_received)}</td>
                      <td class="text-right">${formatNumber(r.total_issued)}</td>
                      <td class="text-right">${formatNumber(r.balance)}</td>
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
    if (!stockRecords.length) return toast.warning("No records to export")
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
      doc.text('Total Stock Report', pageWidth / 2, 32, { align: 'center' })

      yPos = 50

      // Report Info Section
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Stock: ${selectedStock || "All Stocks"}`, 14, yPos)
      yPos += 6
      doc.text(`Period: ${fromDate} to ${toDate}`, 14, yPos)
      yPos += 10

      // Summary Section
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary', 14, yPos)
      yPos += 8

      const summaryData = [
        ['Opening Stock', formatNumber(summary.opening_stock)],
        ['Total Received', formatNumber(summary.total_received)],
        ['Total Issued', formatNumber(summary.total_issued)],
        ['Closing Stock', formatNumber(summary.closing_stock)]
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

      // Stock Records Table
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Stock Records', 14, yPos)
      yPos += 5

      const tableData = stockRecords.map(r => [
        r.name || 'N/A',
        formatNumber(r.total_received),
        formatNumber(r.total_issued),
        formatNumber(r.balance)
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Stock', 'Received', 'Issued', 'Balance']],
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
          0: { cellWidth: 70, halign: 'left' },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 40, halign: 'right' }
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

      doc.save("Total_Stock_Report.pdf")
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
          <h2 className="text-3xl font-bold tracking-tight">Total Stock Reports</h2>
          <p className="text-muted-foreground">View detailed stock balances and movements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print</Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={downloading || !stockRecords.length}>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Stock</Label>
              <Select value={selectedStock} onValueChange={setSelectedStock}>
                <SelectTrigger><SelectValue placeholder="Select stock" /></SelectTrigger>
                <SelectContent>
                {stocks.map(s => (
                    <SelectItem key={s.stock_id} value={s.name}>
                    {s.name}
                    </SelectItem>
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
              <Button className="bg-blue-500 hover:bg-blue-600" onClick={fetchStockRecords} disabled={loading}>
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
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">📦</div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">Opening Stock</p>
              <p className="text-2xl font-bold">{formatNumber(summary.opening_stock)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">📥</div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">Total Received</p>
              <p className="text-2xl font-bold text-green-600">{formatNumber(summary.total_received)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">📤</div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">Total Issued</p>
              <p className="text-2xl font-bold text-red-600">{formatNumber(summary.total_issued)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">📦</div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">Closing Stock</p>
              <p className="text-2xl font-bold">{formatNumber(summary.closing_stock)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Records Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Stock Records</CardTitle>
            <p className="text-sm text-muted-foreground">Period: {fromDate} to {toDate}</p>
          </div>
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
                {stockRecords.length > 0 ? (
                    stockRecords.map((r, i) => (
                    <TableRow key={i}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="font-medium">{formatNumber(r.total_received)}</TableCell>
                        <TableCell className="font-medium">{formatNumber(r.total_issued)}</TableCell>
                        <TableCell className="font-medium">{formatNumber(r.balance)}</TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                        No stock records found.
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

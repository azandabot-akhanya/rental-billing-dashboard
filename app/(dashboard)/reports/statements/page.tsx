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
import html2canvas from "html2canvas"
import { getApiUrl } from "@/lib/api-config"

export default function TenantStatementsPage() {
  const [selectedTenant, setSelectedTenant] = useState("")
  const [selectedProperty, setSelectedProperty] = useState("")
  const [tenants, setTenants] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0])
  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState({
    opening_balance: 0,
    total_credits: 0,
    total_debits: 0,
    closing_balance: 0
  })
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [downloading, setDownloading] = useState(false)


  // 🔹 Fetch properties
  const fetchProperties = async () => {
    const companyId = localStorage.getItem("selectedCompanyId") || "1"

    try {
      const res = await fetch(getApiUrl(`properties?company_id=${companyId}`))
      const data = await res.json()
      const flattened = Array.isArray(data) ? data.flat() : []
      setProperties(flattened)
    } catch (error) {
      console.error("Error fetching properties:", error)
    }
  }

  // 🔹 Fetch tenants filtered by property
  const fetchTenants = async (propertyId?: string) => {
    const companyId = localStorage.getItem("selectedCompanyId") || "1"
    try {
      let url = getApiUrl(`tenants?company_id=${companyId}`)
      if (propertyId) {
        url += `&property_id=${propertyId}`
      }
      const res = await fetch(url)
      const data = await res.json()
      const flattened = Array.isArray(data) ? data.flat() : []
      setTenants(flattened)
    } catch (error) {
      console.error("Error fetching tenants:", error)
    }
  }

  // 🔹 Fetch statement for selected tenant
  const fetchTenantStatement = async () => {
    const companyId = localStorage.getItem("selectedCompanyId") || "1"

    if (!selectedTenant) return
    setLoading(true)

    try {
      const params = new URLSearchParams({
        company_id: companyId,
        start_date: fromDate,
        end_date: toDate
      })
      const response = await fetch(
        getApiUrl(`tenants/${selectedTenant}/statement?${params}`)
      )
      const data = await response.json()

      // ✅ Process summary data
      const summaryData = data.summary || {}
      const openingBal = parseFloat(summaryData.opening_balance || 0)
      const totalCredits = parseFloat(summaryData.total_credits || 0)
      const totalDebits = parseFloat(summaryData.total_debits || 0)
      const closingBal = openingBal + totalCredits - totalDebits

      setSummary({
        opening_balance: openingBal,
        total_credits: totalCredits,
        total_debits: totalDebits,
        closing_balance: closingBal
      })

      // ✅ Process transactions and add reference and running balance
      const rawTransactions = data.transactions || []
      let runningBalance = openingBal

      const processedTransactions = rawTransactions.map((t: any, index: number) => {
        const credit = parseFloat(t.credit || 0)
        const debit = parseFloat(t.debit || 0)
        runningBalance = runningBalance + credit - debit

        return {
          date: t.date,
          description: t.description || "N/A",
          reference: `TXN-${String(index + 1).padStart(4, '0')}`, // Generate reference
          debit: debit > 0 ? formatCurrency(debit) : "-",
          credit: credit > 0 ? formatCurrency(credit) : "-",
          balance: formatCurrency(runningBalance)
        }
      })

      setTransactions(processedTransactions)

      if (data.property_id) setSelectedProperty(String(data.property_id))
    } catch (error) {
      console.error("Error fetching tenant statement:", error)
      toast.error("Failed to fetch tenant statement")
    } finally {
      setLoading(false)
    }
  }
  

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    if (selectedProperty) {
      fetchTenants(selectedProperty)
      setSelectedTenant("") // Reset tenant when property changes
    }
  }, [selectedProperty])

  useEffect(() => {
    if (selectedTenant) fetchTenantStatement()
  }, [selectedTenant, fromDate, toDate])

  const filteredTransactions = transactions.filter(
    (t) =>
      (t.description || "").toLowerCase().includes  (searchTerm.toLowerCase()) ||
      (t.reference || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: string | number) =>
    `R ${parseFloat(amount || "0").toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  

  // 🔹 Print
  const handlePrint = () => {
    const tenant = tenants.find((t) => String(t.tenant_id) === selectedTenant)
    const property = properties.find((p) => String(p.property_id) === selectedProperty)
  
    // Build the professional HTML layout
    const printHTML = `
      <html>
        <head>
          <title>Tenant Statement</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background: #0b66ff; color: white; padding: 10px; text-align: center; }
            .summary { display: flex; justify-content: space-between; margin: 20px 0; }
            .summary div { background: #e6f3ff; padding: 10px; flex: 1; margin-right: 10px; border-radius: 5px; }
            .summary div:last-child { margin-right: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0b66ff; color: white; padding: 8px; text-align: left; }
            td { border: 1px solid #ddd; padding: 6px; }
            tfoot td { font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ThynkxPro</h1>
            <h2>Tenant Statement</h2>
          </div>
          <div>
            <p><strong>Tenant:</strong> ${tenant?.full_name || "-"}</p>
            <p><strong>Property:</strong> ${property?.property_name || "-"}</p>
            <p><strong>Period:</strong> ${fromDate} to ${toDate}</p>
          </div>
          <div class="summary">
            <div><strong>Opening Balance</strong><br>${formatCurrency(summary.opening_balance)}</div>
            <div><strong>Total Credits</strong><br>${formatCurrency(summary.total_credits)}</div>
            <div><strong>Total Debits</strong><br>${formatCurrency(summary.total_debits)}</div>
            <div><strong>Closing Balance</strong><br>${formatCurrency(summary.closing_balance)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${t.date}</td>
                  <td>${t.description || '-'}</td>
                  <td>${t.reference}</td>
                  <td style="color: red;">${formatCurrency(t.debit)}</td>
                  <td style="color: green;">${formatCurrency(t.credit)}</td>
                  <td>${formatCurrency(t.balance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            ThynkxPro © 2025 | Generated electronically, no signature required
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
  

  // 🔹 PDF generation
  // 🔹 PDF generation - professional ThynkXPro style
const generatePDF = async () => {
  const doc = new jsPDF("p", "mm", "a4")
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 0

  // --- Header - Blue Banner ---
  doc.setFillColor(91, 91, 255) // #5B5BFF - ThynkXPro blue
  doc.rect(0, 0, pageWidth, 40, "F")

  // Company Name (fetch from localStorage or use default)
  const companyName = localStorage.getItem("companyName") || "ThynkXPro"
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text(companyName, pageWidth / 2, 20, { align: "center" })

  // Document Title
  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.text("Tenant Statement", pageWidth / 2, 32, { align: "center" })

  y = 50

  // --- Tenant & Property Info Boxes ---
  const tenant = tenants.find((t) => String(t.tenant_id) === selectedTenant)
  const property = properties.find((p) => String(p.property_id) === selectedProperty)

  doc.setFillColor(248, 249, 250)
  doc.setDrawColor(91, 91, 255)
  doc.setLineWidth(0.5)

  const boxWidth = (pageWidth - 34) / 2

  // Tenant Info box
  doc.roundedRect(14, y, boxWidth, 25, 4, 4, "FD")
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(91, 91, 255)
  doc.text("TENANT INFORMATION", 18, y + 6)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  doc.text(`Name: ${tenant?.full_name || "N/A"}`, 18, y + 13)
  doc.text(`Email: ${tenant?.email || "N/A"}`, 18, y + 18)

  // Property Info box
  doc.roundedRect(pageWidth / 2 + 3, y, boxWidth, 25, 4, 4, "FD")
  doc.setFont("helvetica", "bold")
  doc.setTextColor(91, 91, 255)
  doc.text("PROPERTY & PERIOD", pageWidth / 2 + 7, y + 6)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  doc.text(`Property: ${property?.property_name || "N/A"}`, pageWidth / 2 + 7, y + 13)
  doc.text(`Period: ${fromDate} to ${toDate}`, pageWidth / 2 + 7, y + 18)

  y += 35

  // --- Summary Cards ---
  const summaryTableX = 14
  const summaryTableY = y
  const summaryColWidth = (pageWidth - 28) / 4
  const summaryHeight = 20

  const summaries = [
    { label: "Opening Balance", value: formatCurrency(summary.opening_balance) },
    { label: "Total Credits", value: formatCurrency(summary.total_credits) },
    { label: "Total Debits", value: formatCurrency(summary.total_debits) },
    { label: "Closing Balance", value: formatCurrency(summary.closing_balance) },
  ]

  summaries.forEach((s, i) => {
    const x = summaryTableX + i * summaryColWidth
    doc.setFillColor(248, 249, 250)
    doc.setDrawColor(91, 91, 255)
    doc.roundedRect(x, summaryTableY, summaryColWidth - 2, summaryHeight, 3, 3, "FD")

    doc.setTextColor(91, 91, 255)
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.text(s.label, x + 2, summaryTableY + 7)

    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(s.value, x + 2, summaryTableY + 15)
  })
  y = summaryTableY + summaryHeight + 10

  // --- Transactions Table ---
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Transaction Details", 14, y)
  y += 8

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  const tableColWidths = [25, 50, 30, 25, 25, 25]
  const tableHeaders = ["Date", "Description", "Reference", "Debit", "Credit", "Balance"]

  // Table header
  let x = 14
  doc.setFillColor(91, 91, 255)
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.rect(14, y, pageWidth - 28, 8, "F")

  tableHeaders.forEach((h, i) => {
    doc.text(h, x + 2, y + 6)
    x += tableColWidths[i]
  })
  y += 8

  // Table body
  doc.setFont("helvetica", "normal")
  doc.setDrawColor(229, 231, 235)
  transactions.forEach((t) => {
    x = 14
    const rowHeight = 7
    const cells = [
      t.date,
      t.description || "-",
      t.reference,
      t.debit, // Already formatted
      t.credit, // Already formatted
      t.balance, // Already formatted
    ]

    // Alternate row colors
    doc.setFillColor(255, 255, 255)
    doc.setTextColor(0, 0, 0)

    cells.forEach((c, i) => {
      doc.text(String(c), x + 2, y + 5)
      x += tableColWidths[i]
    })

    doc.line(14, y + rowHeight, pageWidth - 14, y + rowHeight)
    y += rowHeight

    // page break
    if (y > 270) {
      doc.addPage()
      y = 20
    }
  })

  // --- Footer ---
  const footerY = doc.internal.pageSize.getHeight() - 20

  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.5)
  doc.line(14, footerY, pageWidth - 14, footerY)

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text(companyName, pageWidth / 2, footerY + 5, { align: "center" })

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(107, 114, 128)
  doc.text("Thank you for your business!", pageWidth / 2, footerY + 10, { align: "center" })

  const generatedDate = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  })
  const generatedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true
  })
  doc.text(`This statement was generated on ${generatedDate} at ${generatedTime}`, pageWidth / 2, footerY + 14, { align: "center" })

  doc.setFont("helvetica", "italic")
  doc.text("Generated with ThynkXPro", pageWidth / 2, footerY + 18, { align: "center" })

  return doc
}


  const handleExportPDF = async () => {
    if (transactions.length === 0) return toast.warning("No transactions to export")
    setDownloading(true)
    try {
      const pdfDoc = await generatePDF()
      pdfDoc.save(`Tenant_${selectedTenant}_Statement.pdf`)
    } catch (error) {
      console.error(error)
      toast.error("Failed to generate PDF")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tenant Statements</h2>
          <p className="text-muted-foreground">View detailed tenant statements with balances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={downloading || !transactions.length}>
            <Download className="w-4 h-4 mr-2" /> {downloading ? "Generating..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Statement Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger><SelectValue placeholder="Select property first" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.property_id} value={String(p.property_id)}>{p.property_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant} disabled={!selectedProperty}>
                <SelectTrigger><SelectValue placeholder={selectedProperty ? "Select tenant" : "Select property first"} /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.tenant_id} value={String(t.tenant_id)}>{t.full_name}</SelectItem>
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
              <Button
                className="bg-blue-500 hover:bg-blue-600"
                onClick={fetchTenantStatement}
                disabled={loading || !selectedTenant}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Statement
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable Area */}
      <div id="printable-area">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">💰</div>
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Opening Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.opening_balance)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">↑</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_credits)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">↓</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Debits</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_debits)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">=</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Closing Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.closing_balance)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Tenant Statement</CardTitle>
              <p className="text-sm text-muted-foreground">
                Period: {fromDate} to {toDate}
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="w-[300px] pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((t, index) => (
                      <TableRow key={index}>
                        <TableCell>{t.date}</TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell>{t.reference}</TableCell>
                        <TableCell className="text-red-600 font-medium">{t.debit}</TableCell>
                        <TableCell className="text-green-600 font-medium">{t.credit}</TableCell>
                        <TableCell className="font-medium">{t.balance}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        {selectedTenant
                          ? "No transactions found for the selected period."
                          : "Please select a tenant to view statements."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

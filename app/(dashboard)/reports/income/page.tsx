"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Printer, Loader2 } from "lucide-react"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { getApiUrl } from "@/lib/api-config"

interface Transaction {
  ref: string
  date: string
  description: string
  debit: number
  credit: number
  balance: number
  type: 'invoice' | 'payment'
  originalData: any
}

export default function IncomeReportsPage() {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedProperty, setSelectedProperty] = useState("all")
  const [selectedTenant, setSelectedTenant] = useState("")
  const [properties, setProperties] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Fetch properties and tenants on mount
  useEffect(() => {
    fetchProperties()
    fetchTenants()
  }, [])

  // Refetch tenants when property changes
  useEffect(() => {
    if (selectedProperty) {
      fetchTenants(selectedProperty)
      setSelectedTenant("") // Reset tenant selection when property changes
    }
  }, [selectedProperty])

  const fetchProperties = async () => {
    const companyId = localStorage.getItem("selectedCompanyId")
    if (!companyId) return
  
    try {
      const response = await fetch(getApiUrl(`properties?company_id=${companyId}`))
      if (!response.ok) throw new Error("Failed to fetch properties")
      const data = await response.json()
  
      // ✅ Flatten the nested arrays
      const flattened = data.flat()
  
      const normalized = Array.isArray(flattened)
        ? flattened.map((p: any) => ({
            property_id: p.property_id ?? p.id ?? null,
            property_name: p.property_name ?? p.name ?? "Unnamed Property",
          }))
        : []
  
      setProperties(normalized)
      console.log("Fetched properties:", normalized)
    } catch (error) {
      console.error("Error fetching properties:", error)
    }
  }
  
  const fetchTenants = async (propertyId?: string) => {
    const companyId = localStorage.getItem("selectedCompanyId")
    if (!companyId) return

    try {
      let url = getApiUrl(`tenants?company_id=${companyId}`)
      if (propertyId && propertyId !== "all") {
        url += `&property_id=${propertyId}`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch tenants")
      const data = await response.json()

      // ✅ Flatten the nested arrays
      const flattened = data.flat()

      const normalized = Array.isArray(flattened)
        ? flattened.map((t: any) => ({
            tenant_id: t.tenant_id ?? t.id ?? null,
            full_name: t.full_name ?? t.name ?? "Unnamed Tenant",
            property_id: t.property_id ?? null,
          }))
        : []

      setTenants(normalized)
      console.log("Fetched tenants:", normalized)
    } catch (error) {
      console.error("Error fetching tenants:", error)
    }
  }
  

  // --- Transactions logic - processes invoices as debits and deposits as credits ---
  const processTransactionsWithDeposits = (invoices: any[], deposits: any[]) => {
    const processed: Transaction[] = []

    // Create invoice transactions (debits)
    const invoiceTransactions = invoices.map(invoice => ({
      ref: invoice.invoice_number,
      date: invoice.invoice_date,
      description: invoice.notes || `Invoice for ${invoice.invoice_date}`,
      debit: parseFloat(invoice.total_amount),
      credit: 0,
      type: 'invoice' as const,
      originalData: invoice
    }))

    // Create deposit transactions (credits)
    const depositTransactions = (Array.isArray(deposits) ? deposits : []).map(deposit => ({
      ref: deposit.reference_number || `DEP-${deposit.deposit_id}`,
      date: deposit.transaction_date,
      description: deposit.description || 'Payment received',
      debit: 0,
      credit: parseFloat(deposit.amount),
      type: 'payment' as const,
      originalData: deposit
    }))

    // Combine and sort by date
    const allTransactions = [...invoiceTransactions, ...depositTransactions].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Calculate running balance
    let runningBalance = 0
    allTransactions.forEach(tx => {
      runningBalance += tx.debit - tx.credit
      processed.push({
        ...tx,
        balance: runningBalance
      })
    })

    return processed
  }

  // Keep old function for backwards compatibility
  const processTransactions = (invoices: any[]) => {
    return processTransactionsWithDeposits(invoices, [])
  }

  const calculateAgingAnalysis = (transactions: Transaction[]) => {
    const today = new Date()
    const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }

    transactions.forEach(transaction => {
      if (transaction.type === 'invoice' && transaction.balance > 0) {
        const invoiceDate = new Date(transaction.date)
        const daysDiff = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff <= 30) aging.current += transaction.balance
        else if (daysDiff <= 60) aging.days30 += transaction.balance
        else if (daysDiff <= 90) aging.days60 += transaction.balance
        else if (daysDiff <= 120) aging.days90 += transaction.balance
        else aging.over90 += transaction.balance
      }
    })

    return aging
  }

  const fetchTenantInvoices = async () => {
    if (!selectedTenant) return;
    setLoading(true);

    try {
      const companyId = localStorage.getItem("selectedCompanyId")

      // Fetch both invoices and deposits in parallel
      const [invoicesRes, depositsRes] = await Promise.all([
        fetch(getApiUrl(`invoices/tenant/${selectedTenant}`)),
        fetch(getApiUrl(`deposits?company_id=${companyId}&tenant_id=${selectedTenant}`))
      ]);

      if (!invoicesRes.ok) throw new Error("Failed to fetch invoices");

      const invoicesData = await invoicesRes.json();
      const depositsData = await depositsRes.json();

      const invoicesList = invoicesData.invoices || invoicesData;
      const depositsList = depositsData.deposits || depositsData || [];

      setInvoices(invoicesList);
      const processedTransactions = processTransactionsWithDeposits(invoicesList, depositsList);
      setTransactions(processedTransactions);
      const agingAnalysis = calculateAgingAnalysis(processedTransactions);

      setSummary({
        ...invoicesData.summary,
        agingAnalysis,
        finalBalance:
          processedTransactions.length > 0
            ? processedTransactions[processedTransactions.length - 1].balance
            : 0
      });
    } catch (error) {
      console.error("Error fetching tenant invoices:", error);
    } finally {
      setLoading(false);
    }
  };
  

  const handleGenerateReport = () => {
    if (selectedTenant) fetchTenantInvoices()
  }

  const handlePrint = () => {
    const tenant = tenants.find((t) => String(t.tenant_id) === String(selectedTenant))
    const property = properties.find((p) => String(p.property_id) === String(selectedProperty))
    const firstUnitId = invoices.length > 0 ? invoices[0].unit_id : null
    const companyName = localStorage.getItem("companyName") || "ThynkXPro"

    const printHTML = `
      <html>
        <head>
          <title>Rental Ledger</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 1cm; }
            }
            body { font-family: Arial, sans-serif; margin: 20px; }

            /* Header */
            .header {
              background: #5B5BFF;
              color: white;
              padding: 30px;
              text-align: center;
              margin: -20px -20px 20px -20px;
            }
            .header h1 {
              margin: 0 0 10px 0;
              font-size: 28px;
              font-weight: bold;
            }
            .header h2 {
              margin: 0;
              font-size: 16px;
              font-weight: normal;
            }

            /* Info Section */
            .info-section {
              margin: 20px 0;
              padding: 15px;
              background: #f5f5fa;
              border-radius: 8px;
            }
            .info-section p {
              margin: 5px 0;
              color: #505050;
            }

            /* Table */
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background: #5B5BFF;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
              font-size: 11px;
            }
            td {
              border: 1px solid #e5e5ef;
              padding: 10px;
              font-size: 10px;
            }
            tr:nth-child(even) {
              background: #f5f5fa;
            }
            .debit {
              color: #dc2626;
              font-weight: 600;
              text-align: right;
            }
            .credit {
              color: #22c55e;
              font-weight: 600;
              text-align: right;
            }
            .balance {
              font-weight: bold;
              text-align: right;
            }

            /* Age Analysis */
            .age-analysis {
              margin: 30px 0;
              padding: 20px;
              background: #f5f5fa;
              border-radius: 8px;
            }
            .age-analysis h3 {
              margin: 0 0 15px 0;
              font-size: 14px;
              font-weight: bold;
            }
            .age-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .age-item {
              text-align: center;
            }
            .age-label {
              font-size: 10px;
              color: #6b7280;
              margin-bottom: 5px;
            }
            .age-value {
              font-size: 14px;
              font-weight: bold;
            }
            .final-balance {
              border-top: 2px solid #5B5BFF;
              padding-top: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .final-balance-label {
              font-size: 14px;
              font-weight: 600;
            }
            .final-balance-value {
              font-size: 18px;
              font-weight: bold;
            }

            /* Footer */
            .footer {
              text-align: center;
              margin-top: 40px;
              color: #9ca3af;
              font-size: 10px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyName}</h1>
            <h2>Rental Ledger</h2>
          </div>

          <div class="info-section">
            ${tenant ? `<p><strong>Tenant:</strong> ${tenant.full_name}</p>` : ''}
            ${property ? `<p><strong>Property:</strong> ${property.property_name}</p>` : ''}
            ${firstUnitId ? `<p><strong>Unit Number:</strong> ${firstUnitId}</p>` : ''}
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <h3 style="margin: 20px 0 10px 0; font-size: 16px;">Tenant Account Ledger</h3>

          <table>
            <thead>
              <tr>
                <th>REF</th>
                <th>DATE</th>
                <th>DESCRIPTION</th>
                <th>DEBIT</th>
                <th>CREDIT</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${t.ref}</td>
                  <td>${t.date}</td>
                  <td>${t.description}</td>
                  <td class="debit">${t.debit > 0 ? formatCurrency(t.debit) : ''}</td>
                  <td class="credit">${t.credit > 0 ? formatCurrency(t.credit) : ''}</td>
                  <td class="balance">${formatCurrency(t.balance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${summary && summary.agingAnalysis ? `
            <div class="age-analysis">
              <h3>Age Analysis</h3>
              <div class="age-grid">
                <div class="age-item">
                  <div class="age-label">Current<br/>(0-30 days)</div>
                  <div class="age-value" style="color: #22c55e;">${formatCurrency(summary.agingAnalysis.current)}</div>
                </div>
                <div class="age-item">
                  <div class="age-label">31-60 days</div>
                  <div class="age-value" style="color: #eab308;">${formatCurrency(summary.agingAnalysis.days30)}</div>
                </div>
                <div class="age-item">
                  <div class="age-label">61-90 days</div>
                  <div class="age-value" style="color: #f97316;">${formatCurrency(summary.agingAnalysis.days60)}</div>
                </div>
                <div class="age-item">
                  <div class="age-label">91-120 days</div>
                  <div class="age-value" style="color: #dc2626;">${formatCurrency(summary.agingAnalysis.days90)}</div>
                </div>
                <div class="age-item">
                  <div class="age-label">Over 120 days</div>
                  <div class="age-value" style="color: #991b1b;">${formatCurrency(summary.agingAnalysis.over90)}</div>
                </div>
              </div>
              <div class="final-balance">
                <span class="final-balance-label">Final Balance:</span>
                <span class="final-balance-value" style="color: ${summary.finalBalance > 0 ? '#dc2626' : '#22c55e'};">
                  ${formatCurrency(summary.finalBalance)}
                </span>
              </div>
            </div>
          ` : ''}

          <div class="footer">
            Generated with ThynkXPro
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

  const generatePDF = async () => {
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
    doc.text('Rental Ledger', pageWidth / 2, 32, { align: 'center' })

    yPos = 50

    // Document Info Section
    const tenant = tenants.find((t) => String(t.tenant_id) === String(selectedTenant))
    const property = properties.find((p) => String(p.property_id) === String(selectedProperty))
    const firstUnitId = invoices.length > 0 ? invoices[0].unit_id : null

    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    if (tenant) {
      doc.text(`Tenant: ${tenant.full_name}`, 14, yPos)
      yPos += 6
    }
    if (property) {
      doc.text(`Property: ${property.property_name}`, 14, yPos)
      yPos += 6
    }
    if (firstUnitId) {
      doc.text(`Unit Number: ${firstUnitId}`, 14, yPos)
      yPos += 6
    }
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, yPos - 12, { align: 'right' })

    yPos += 4

    // Horizontal line separator
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.line(14, yPos, pageWidth - 14, yPos)

    yPos += 10

    // Tenant Account Ledger Section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text("Tenant Account Ledger", 14, yPos)

    yPos += 5

    // Table Data
    const tableData = transactions.map((t) => [
      t.ref,
      t.date,
      t.description,
      t.debit > 0 ? formatCurrency(t.debit) : "",
      t.credit > 0 ? formatCurrency(t.credit) : "",
      formatCurrency(t.balance)
    ])

    autoTable(doc, {
      startY: yPos,
      head: [["REF", "DATE", "DESCRIPTION", "DEBIT", "CREDIT", "BALANCE"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [91, 91, 255],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: {
        fontSize: 9,
        cellPadding: 4
      },
      alternateRowStyles: {
        fillColor: [245, 245, 250]
      },
      columnStyles: {
        3: { halign: 'right', textColor: [220, 38, 38] }, // DEBIT - red
        4: { halign: 'right', textColor: [34, 197, 94] }, // CREDIT - green
        5: { halign: 'right', fontStyle: 'bold' } // BALANCE
      },
      margin: { left: 14, right: 14 }
    })

    // @ts-ignore - autoTable adds finalY
    yPos = doc.lastAutoTable.finalY + 10

    // Age Analysis Section
    if (summary && summary.agingAnalysis) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text("Age Analysis", 14, yPos)
      yPos += 8

      const agingData = [
        ["Current (0-30 days)", formatCurrency(summary.agingAnalysis.current)],
        ["31-60 days", formatCurrency(summary.agingAnalysis.days30)],
        ["61-90 days", formatCurrency(summary.agingAnalysis.days60)],
        ["91-120 days", formatCurrency(summary.agingAnalysis.days90)],
        ["Over 120 days", formatCurrency(summary.agingAnalysis.over90)]
      ]

      autoTable(doc, {
        startY: yPos,
        body: agingData,
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 3
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [80, 80, 80] },
          1: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      })

      // @ts-ignore
      yPos = doc.lastAutoTable.finalY + 8

      // Final Balance
      doc.setDrawColor(91, 91, 255)
      doc.setLineWidth(1)
      doc.line(14, yPos, pageWidth - 14, yPos)
      yPos += 8

      doc.setFontSize(12)
      doc.text("Final Balance:", 14, yPos)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      const balanceColor = summary.finalBalance > 0 ? [220, 38, 38] : [34, 197, 94]
      doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2])
      doc.text(formatCurrency(summary.finalBalance), pageWidth - 14, yPos, { align: 'right' })
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'italic')
    doc.text('Generated with ThynkXPro', pageWidth / 2, footerY, { align: 'center' })

    return doc
  }

  const handleExportPDF = async () => {
    if (transactions.length === 0) {
      toast.warning("No transactions available for this tenant.")
      return
    }
    setDownloading(true)
    try {
      const pdfDoc = await generatePDF()
      pdfDoc.save(`Tenant_${selectedTenant}_Ledger.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    } finally {
      setDownloading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    `R ${amount.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rental Ledger</h2>
          <p className="text-muted-foreground">Tenant account statement with Age Analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={downloading || transactions.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            {downloading ? "Generating..." : "Export PDF"}
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
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property">Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((property, index) =>
                    property?.property_id ? (
                      <SelectItem
                        key={property.property_id ?? index}
                        value={String(property.property_id)}
                      >
                        {property.property_name}
                      </SelectItem>
                    ) : null
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant">Tenant</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant, index) =>
                    tenant?.tenant_id ? (
                      <SelectItem
                        key={tenant.tenant_id ?? index}
                        value={String(tenant.tenant_id)}
                      >
                        {tenant.full_name}
                      </SelectItem>
                    ) : null
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="bg-blue-500 hover:bg-blue-600"
                onClick={handleGenerateReport}
                disabled={loading || !selectedTenant}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable Area */}
      <div id="printable-area">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Tenant Account Ledger</CardTitle>
          </CardHeader>
          <CardContent className="h-full">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>REF</TableHead>
                      <TableHead>DATE</TableHead>
                      <TableHead>DESCRIPTION</TableHead>
                      <TableHead>DEBIT</TableHead>
                      <TableHead>CREDIT</TableHead>
                      <TableHead>BALANCE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length > 0 ? (
                      transactions.map((transaction, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{transaction.ref}</TableCell>
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className={transaction.debit > 0 ? "text-red-600 font-medium" : ""}>
                            {transaction.debit > 0 ? formatCurrency(transaction.debit) : ""}
                          </TableCell>
                          <TableCell className={transaction.credit > 0 ? "text-green-600 font-medium" : ""}>
                            {transaction.credit > 0 ? formatCurrency(transaction.credit) : ""}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(transaction.balance)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          {selectedTenant
                            ? "No transactions found for this tenant"
                            : "Please select a tenant to view ledger"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Aging Analysis */}
                {summary && (
                  <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Age Analysis</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Current</div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(summary.agingAnalysis.current)}
                        </div>
                        <div className="text-xs">(0-30 days)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">31-60 days</div>
                        <div className="text-lg font-bold text-yellow-600">
                          {formatCurrency(summary.agingAnalysis.days30)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">61-90 days</div>
                        <div className="text-lg font-bold text-orange-600">
                          {formatCurrency(summary.agingAnalysis.days60)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">91-120 days</div>
                        <div className="text-lg font-bold text-red-600">
                          {formatCurrency(summary.agingAnalysis.days90)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Over 120 days</div>
                        <div className="text-lg font-bold text-red-700">
                          {formatCurrency(summary.agingAnalysis.over90)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Final Balance:</span>
                        <span className={`text-xl font-bold ${
                          summary.finalBalance > 0 ? "text-red-600" : "text-green-600"
                        }`}>
                          {formatCurrency(summary.finalBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Download, Printer, Search } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"

interface Transaction {
  transaction_id: number
  transaction_date: string
  transaction_type: string
  description: string
  reference_number: string
  this_month_amount: number
  total_amount: number
  account_name: string
  property_name: string
  unit_number: string
}

export default function BalanceSheetPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [summary, setSummary] = useState({
    totalDeposits: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    totalDepositCount: 0,
    totalExpenseCount: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [companyName, setCompanyName] = useState("Company Name")
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // First day of current month
    return date.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    fetchBalanceSheet()
    fetchCompanyName()
  }, [])

  async function fetchCompanyName() {
    try {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) return

      const res = await fetch(getApiUrl(`companies/${companyId}`))
      if (!res.ok) throw new Error("Failed to fetch company")
      const data = await res.json()

      if (data && data.company_name) {
        setCompanyName(data.company_name)
      }
    } catch (err) {
      console.error("Error fetching company name:", err)
    }
  }

  // Filter transactions when search term changes
  useEffect(() => {
    if (!searchTerm) {
      setFilteredTransactions(transactions)
      return
    }

    const filtered = transactions.filter(tx =>
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.transaction_type?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredTransactions(filtered)
  }, [searchTerm, transactions])

  async function fetchBalanceSheet() {
    setLoading(true)
    setError("")

    try {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) {
        toast.error("No company selected")
        setLoading(false)
        return
      }

      const res = await fetch(
        getApiUrl(`balance-sheet?company_id=${companyId}&from_date=${fromDate}&to_date=${toDate}`)
      )
      if (!res.ok) throw new Error("Failed to fetch balance sheet")
      const data = await res.json()

      if (data.success) {
        setTransactions(data.transactions || [])
        setFilteredTransactions(data.transactions || [])
        const totals = data.totals || {}
        setSummary({
          totalDeposits: parseFloat(totals.total_deposits) || 0,
          totalExpenses: parseFloat(totals.total_expenses) || 0,
          netCashFlow: parseFloat(totals.net_cash_flow) || 0,
          totalDepositCount: parseInt(totals.total_deposit_count) || 0,
          totalExpenseCount: parseInt(totals.total_expense_count) || 0,
        })
        toast.success("Balance sheet loaded successfully")
      } else {
        setError(data.message || "Unknown error occurred")
        toast.error(data.message || "Failed to load balance sheet")
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error occurred")
      toast.error(err.message || "Failed to load balance sheet")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: any) => {
    const numValue = parseFloat(value)
    return isNaN(numValue) ? 'R 0.00' : `R ${numValue.toFixed(2)}`
  }

  const calculateChange = (index: number) => {
    if (filteredTransactions.length === 0) return 0
    if (index === 0) return filteredTransactions[0].this_month_amount
    return filteredTransactions.slice(0, index + 1).reduce((sum, tx) => sum + parseFloat(tx.this_month_amount.toString()), 0)
  }

  const handlePrint = () => {
    toast.info("Opening print dialog...")
    window.print()
  }

  const handleExportPDF = () => {
    try {
      toast.info("Generating PDF...")
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      let yPos = 0

      // Professional Header - Blue Banner
      doc.setFillColor(91, 91, 255) // #5B5BFF - Professional blue
      doc.rect(0, 0, pageWidth, 40, 'F')

      // Company Name
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(companyName, pageWidth / 2, 20, { align: 'center' })

      // Document Title
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text('Balance B/F Report', pageWidth / 2, 32, { align: 'center' })

      yPos = 50

      // Document Info
      doc.setFontSize(10)
      doc.setTextColor(80, 80, 80)
      doc.text(`Report Period: ${formatDateRange()}`, 14, yPos)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, yPos, { align: 'right' })

      yPos += 10

      // Horizontal line separator
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.line(14, yPos, pageWidth - 14, yPos)

      yPos += 10

      // Financial Summary Section
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text("Financial Summary", 14, yPos)

      yPos += 8

      autoTable(doc, {
        startY: yPos,
        head: [['Category', 'Amount (ZAR)', 'Count']],
        body: [
          ['Total Deposits', `R ${summary.totalDeposits.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, summary.totalDepositCount.toString()],
          ['Total Expenses', `R ${summary.totalExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, summary.totalExpenseCount.toString()],
          ['Net Cash Flow', `R ${summary.netCashFlow.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, '-'],
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [91, 91, 255],
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          fontSize: 10,
          cellPadding: 5
        },
        alternateRowStyles: {
          fillColor: [245, 245, 250]
        }
      })

      if (filteredTransactions.length > 0) {
        yPos = (doc as any).lastAutoTable.finalY + 15

        // Transaction Details Section
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text("Transaction Details", 14, yPos)

        yPos += 5

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Type', 'Description', 'Amount', 'Total', 'Change', 'Account', 'Property', 'Unit']],
          body: filteredTransactions.map((tx, i) => [
            new Date(tx.transaction_date).toLocaleDateString('en-ZA'),
            tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1),
            tx.description || tx.reference_number || 'N/A',
            `R ${Number(tx.this_month_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `R ${Number(tx.total_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `R ${calculateChange(i).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            tx.account_name,
            tx.property_name || 'N/A',
            tx.unit_number || 'N/A'
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: [91, 91, 255],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'left'
          },
          styles: {
            fontSize: 8,
            cellPadding: 3
          },
          alternateRowStyles: {
            fillColor: [245, 245, 250]
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 18 },
            2: { cellWidth: 35 },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 25 },
            7: { cellWidth: 22 },
            8: { cellWidth: 15 }
          }
        })
      }

      // Footer
      const finalY = (doc as any).lastAutoTable.finalY || yPos
      const footerY = doc.internal.pageSize.getHeight() - 15
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text('Generated with ThynkXPro', pageWidth / 2, footerY, { align: 'center' })

      doc.save(`Balance_BF_Report_${fromDate}_to_${toDate}.pdf`)
      toast.success("PDF exported successfully!")
    } catch (err) {
      console.error("PDF export error:", err)
      toast.error("Failed to export PDF")
    }
  }

  const formatDateRange = () => {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    if (fromDate === toDate) {
      return from.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
    return `${from.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${to.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Balance B/F Report</h2>
          <p className="text-muted-foreground">
            Financial transactions for {formatDateRange()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={loading}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={loading || filteredTransactions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="flex items-end">
              <Button
                onClick={fetchBalanceSheet}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 w-full"
              >
                {loading ? "Loading..." : "Apply Filter"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">D</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Deposits</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalDeposits)}</p>
              <p className="text-xs text-muted-foreground">{summary.totalDepositCount} transactions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold">E</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
              <p className="text-xs text-muted-foreground">{summary.totalExpenseCount} transactions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">N</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Net Cash Flow</p>
              <p className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(summary.netCashFlow)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">T</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold text-purple-600">{summary.totalDepositCount + summary.totalExpenseCount}</p>
              <p className="text-xs text-muted-foreground">Selected period</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction Details</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="w-[300px] pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-center py-8">Loading transactions...</p>}
          {error && <p className="text-red-500 text-center py-8">{error}</p>}
          {!loading && !error && filteredTransactions.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm ? "No transactions match your search." : "No transactions found for this period."}
            </p>
          )}
          {!loading && !error && filteredTransactions.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>This Month</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx, i) => {
                    const change = calculateChange(i)
                    return (
                      <TableRow key={tx.transaction_id || i}>
                        <TableCell>{new Date(tx.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={tx.transaction_type === "deposit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                          >
                            {tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.description || tx.reference_number || 'N/A'}</TableCell>
                        <TableCell className={tx.this_month_amount >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          {formatCurrency(tx.this_month_amount)}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(tx.total_amount)}</TableCell>
                        <TableCell className={change >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          {formatCurrency(change)}
                        </TableCell>
                        <TableCell>{tx.account_name}</TableCell>
                        <TableCell>{tx.property_name || 'N/A'}</TableCell>
                        <TableCell>{tx.unit_number || 'N/A'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

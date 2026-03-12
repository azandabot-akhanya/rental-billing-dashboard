"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Printer, Search, Filter } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { getApiUrl } from "@/lib/api-config"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [filteredExpenses, setFilteredExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // First day of current month
    return date.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10))
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchExpenses()
  }, [fromDate, toDate])

  useEffect(() => {
    filterExpenses()
  }, [expenses, searchTerm, statusFilter])

  async function fetchExpenses() {
    setLoading(true)
    setError("")

    try {
      const companyId = localStorage.getItem("selectedCompanyId") || 1

      const res = await fetch(
        getApiUrl(`transactions/details?company_id=${companyId}`)
      )
      
      if (!res.ok) throw new Error("Failed to fetch expenses")
      const data = await res.json()

      if (data.success) {
        // Filter to show only expenses/payments (not deposits)
        const expenseTransactions = (data.transactions || []).filter(
          tx => tx.transaction_type === 'expense' || tx.transaction_type === 'Expense' || tx.type === 'expense'
        )

        setExpenses(expenseTransactions)
      } else {
        setError(data.message || "Unknown error occurred")
      }
    } catch (err) {
      setError(err.message || "Unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const filterExpenses = () => {
    let filtered = expenses.filter(expense => {
      // Filter by date range
      const expenseDate = new Date(expense.transaction_date)
      const from = new Date(fromDate)
      const to = new Date(toDate)
      to.setHours(23, 59, 59, 999) // Include entire end date

      if (expenseDate < from || expenseDate > to) {
        return false
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          (expense.description && expense.description.toLowerCase().includes(searchLower)) ||
          (expense.reference_number && expense.reference_number.toLowerCase().includes(searchLower)) ||
          (expense.vendor_name && expense.vendor_name.toLowerCase().includes(searchLower)) ||
          (expense.category_name && expense.category_name.toLowerCase().includes(searchLower)) ||
          (expense.account_name && expense.account_name.toLowerCase().includes(searchLower))
        
        if (!matchesSearch) return false
      }

      // Filter by status (if you have a status field)
      if (statusFilter !== "all" && expense.status !== statusFilter) {
        return false
      }

      return true
    })

    setFilteredExpenses(filtered)
  }

  const formatCurrency = (value) => isNaN(value) ? 'R 0.00' : `R ${Math.abs(Number(value)).toFixed(2)}`

  const calculateTotalExpenses = () => {
    return filteredExpenses.reduce((total, expense) => total + Math.abs(parseFloat(expense.amount || 0)), 0)
  }

  const handlePrint = () => window.print()

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`Expenses Report - ${fromDate} to ${toDate}`, 14, 20)

    doc.setFontSize(12)
    doc.text(`Total Expenses: R ${calculateTotalExpenses().toLocaleString()}`, 14, 30)
    doc.text(`Number of Expenses: ${filteredExpenses.length}`, 14, 40)

    if (filteredExpenses.length > 0) {
      autoTable(doc, {
        startY: 50,
        head: [['Date', 'Vendor', 'Category', 'Description', 'Reference', 'Amount', 'Payment Method', 'Property', 'Unit']],
        body: filteredExpenses.map(expense => [
          new Date(expense.transaction_date).toLocaleDateString(),
          expense.vendor_name || 'N/A',
          expense.category_name || 'N/A',
          expense.description || 'N/A',
          expense.reference_number || 'N/A',
          `R ${Math.abs(Number(expense.amount)).toLocaleString()}`,
          expense.payment_method_name || 'N/A',
          expense.property_name || 'N/A',
          expense.unit_number || 'N/A'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 8 },
      })
    }

    doc.save(`expenses_report_${fromDate}_to_${toDate}.pdf`)
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
          <h2 className="text-3xl font-bold tracking-tight">Payments & Purchases</h2>
          <p className="text-muted-foreground">
            Expense transactions for {formatDateRange()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
          <Button variant="outline" onClick={handleExportPDF}><Download className="w-4 h-4 mr-2" />Export PDF</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
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
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search expenses..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button 
              onClick={fetchExpenses}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Filter className="w-4 h-4 mr-2" />
              {loading ? "Loading..." : "Apply Filters"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold">E</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(calculateTotalExpenses())}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">T</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Number of Expenses</p>
              <p className="text-2xl font-bold text-blue-600">{filteredExpenses.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">A</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Average Expense</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredExpenses.length > 0 
                  ? formatCurrency(calculateTotalExpenses() / filteredExpenses.length)
                  : 'R 0.00'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading expenses...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && filteredExpenses.length === 0 && (
            <p className="text-muted-foreground">No expenses found for this period.</p>
          )}
          {!loading && !error && filteredExpenses.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense, index) => (
                    <TableRow key={expense.transaction_id || index}>
                      <TableCell>{new Date(expense.transaction_date).toLocaleDateString()}</TableCell>
                      <TableCell>{expense.vendor_name || 'N/A'}</TableCell>
                      <TableCell>{expense.category_name || 'N/A'}</TableCell>
                      <TableCell>{expense.description || 'N/A'}</TableCell>
                      <TableCell>{expense.reference_number || 'N/A'}</TableCell>
                      <TableCell className="text-red-600 font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>{expense.payment_method_name || 'N/A'}</TableCell>
                      <TableCell>{expense.property_name || 'N/A'}</TableCell>
                      <TableCell>{expense.unit_number || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          expense.status === 'paid' ? 'bg-green-100 text-green-800' :
                          expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          expense.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {expense.status || 'N/A'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Filter, Download, Eye } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { getApiUrl } from "@/lib/api-config"
import { toast } from "sonner"

export default function ViewTransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [viewReceiptUrl, setViewReceiptUrl] = useState("")

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      setError(null);

      try {
        const companyId = localStorage.getItem("selectedCompanyId")
        const startDate = new Date().toISOString().slice(0, 10);
        const endDate = new Date().toISOString().slice(0, 10);

        const res = await fetch(
          getApiUrl(`transactions?company_id=${companyId}&start_date=${startDate}&end_date=${endDate}`)
        );

        if (!res.ok) throw new Error("Failed to fetch transactions");

        const data = await res.json();
        console.log(data.transactions);

        setTransactions(data.transactions || []);
      } catch (err) {
        setError(err.message || "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      // API returns 'type' not 'transaction_type'
      const txnType = txn.type || txn.transaction_type
      const matchesType = filterType === "all" || txnType === filterType
      const matchesSearch =
        txn.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesType && matchesSearch
    })
  }, [transactions, filterType, searchTerm])

  function exportCSV() {
    const headers = [
      "Transaction ID",
      "Date",
      "Type",
      "Description",
      "Account",
      "Tenant",
      "Amount",
      "Status",
      "Reference",
    ]
    const rows = filteredTransactions.map((txn) => [
      txn.id || txn.transaction_id,
      txn.date || txn.transaction_date,
      txn.type || txn.transaction_type,
      txn.description,
      txn.account_name,
      txn.tenant_name || "",
      txn.amount,
      txn.status,
      txn.reference || txn.reference_number,
    ])
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.map((v) => `"${v}"`).join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `transactions_${new Date().toISOString()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function calculateTotal(type) {
    return filteredTransactions
      .filter((t) => (t.type || t.transaction_type) === type)
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      .toLocaleString()
  }

  const handleViewClick = async (transaction) => {
    try {
      setSelectedTransaction(transaction)
      toast.info("Loading receipt...")

      // Get the correct ID - API returns 'id', could also be deposit_id, expense_id, or transaction_id
      let numericId = transaction.id || transaction.deposit_id || transaction.expense_id || transaction.transaction_id

      // If it's a string like "DEP-15" or "EXP-42", extract the number
      if (numericId && typeof numericId === 'string' && numericId.includes('-')) {
        numericId = numericId.split('-').pop()
      }

      if (!numericId) {
        toast.error("Cannot find transaction ID")
        return
      }

      // API returns 'type' not 'transaction_type'
      const txnType = transaction.type || transaction.transaction_type
      const endpoint = txnType === "deposit"
        ? `deposits/${numericId}/receipt`
        : `expenses/${numericId}/receipt`

      const pdfRes = await fetch(getApiUrl(endpoint))
      const pdfData = await pdfRes.json()

      if (pdfData.success) {
        // Use full production URL
        const fullPdfUrl = pdfData.pdf_url.startsWith('http')
          ? pdfData.pdf_url
          : `https://thynkxpro-dpl.co.za${pdfData.pdf_url.startsWith('/') ? pdfData.pdf_url : `/${pdfData.pdf_url}`}`
        setViewReceiptUrl(fullPdfUrl)
        setIsViewModalOpen(true)
        toast.success("Receipt loaded successfully")
      } else {
        toast.error("Failed to load receipt preview")
      }
    } catch (error) {
      console.error("Error loading receipt:", error)
      toast.error("Failed to load receipt")
    }
  }

  const handleDownloadClick = async (transaction) => {
    try {
      toast.info("Generating receipt PDF...")

      // Get the correct ID - API returns 'id', could also be deposit_id, expense_id, or transaction_id
      let numericId = transaction.id || transaction.deposit_id || transaction.expense_id || transaction.transaction_id

      // If it's a string like "DEP-15" or "EXP-42", extract the number
      if (numericId && typeof numericId === 'string' && numericId.includes('-')) {
        numericId = numericId.split('-').pop()
      }

      if (!numericId) {
        toast.error("Cannot find transaction ID")
        return
      }

      // API returns 'type' not 'transaction_type'
      const txnType = transaction.type || transaction.transaction_type
      const endpoint = txnType === "deposit"
        ? `deposits/${numericId}/receipt`
        : `expenses/${numericId}/receipt`

      const pdfRes = await fetch(getApiUrl(endpoint))
      const pdfData = await pdfRes.json()

      if (pdfData.success) {
        // Use full production URL
        const fullPdfUrl = pdfData.pdf_url.startsWith('http')
          ? pdfData.pdf_url
          : `https://thynkxpro-dpl.co.za${pdfData.pdf_url.startsWith('/') ? pdfData.pdf_url : `/${pdfData.pdf_url}`}`
        window.open(fullPdfUrl, '_blank')
        toast.success("Receipt PDF opened in new tab")
      } else {
        toast.error("Failed to generate receipt PDF")
      }
    } catch (error) {
      console.error("Error generating receipt PDF:", error)
      toast.error("Failed to generate receipt PDF")
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">
            View and manage all your financial transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={loading || filteredTransactions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link href="/transactions/deposit">
            <Button className="bg-green-500 hover:bg-green-600">
              <Plus className="w-4 h-4 mr-2" />
              New Deposit
            </Button>
          </Link>
          <Link href="/transactions/expense">
            <Button className="bg-red-500 hover:bg-red-600">
              <Plus className="w-4 h-4 mr-2" />
              New Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">↑</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Income</p>
              <p className="text-2xl font-bold text-green-600">R {calculateTotal("deposit")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold">↓</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">R {calculateTotal("expense")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">⇄</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Transfers</p>
              <p className="text-2xl font-bold text-blue-600">R {calculateTotal("transfer")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-bold">=</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Net Balance</p>
              <p className="text-2xl font-bold">
                R {(
                  filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
                ).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Transactions</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="w-[300px] pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={filterType}
                onValueChange={(value) => setFilterType(value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" disabled>
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading transactions...</p>}
          {error && <p className="text-red-600">Error: {error}</p>}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
                {filteredTransactions.map((transaction) => {
                  // API returns 'id', 'type', 'date', 'reference' instead of 'transaction_id', 'transaction_type', 'transaction_date', 'reference_number'
                  const txnId = transaction.id || transaction.transaction_id
                  const txnType = transaction.type || transaction.transaction_type
                  const txnDate = transaction.date || transaction.transaction_date
                  const txnRef = transaction.reference || transaction.reference_number

                  return (
                  <TableRow key={txnId}>
                    <TableCell>{txnDate ? new Date(txnDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          txnType === "deposit"
                            ? "bg-green-100 text-green-800"
                            : txnType === "expense"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      >
                        {txnType}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.description || 'N/A'}</TableCell>
                    <TableCell>{txnRef || 'N/A'}</TableCell>
                    <TableCell>{transaction.account_name || 'N/A'}</TableCell>
                    <TableCell>{transaction.category_name || 'N/A'}</TableCell>
                    <TableCell>{transaction.property_name || 'N/A'}</TableCell>
                    <TableCell>{transaction.tenant_name || 'N/A'}</TableCell>
                    <TableCell
                      className={
                        txnType === "deposit"
                          ? "text-green-600 font-medium"
                          : txnType === "expense"
                          ? "text-red-600 font-medium"
                          : "font-medium"
                      }
                    >
                      R {parseFloat(transaction.amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClick(transaction)}
                          title="View Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadClick(transaction)}
                          title="Download Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Receipt Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>
              {(selectedTransaction?.type || selectedTransaction?.transaction_type) === "deposit" ? "Deposit" : "Expense"} Receipt
            </DialogTitle>
            <DialogDescription>
              Receipt for {selectedTransaction?.type || selectedTransaction?.transaction_type} - {selectedTransaction?.reference || selectedTransaction?.reference_number || `#${selectedTransaction?.id || selectedTransaction?.transaction_id}`}
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[70vh] overflow-auto p-6">
            {viewReceiptUrl && (
              <iframe
                src={viewReceiptUrl}
                className="w-full h-full border-0 rounded"
                title="Receipt Preview"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 p-6 pt-0 border-t">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (viewReceiptUrl) {
                  window.open(viewReceiptUrl, '_blank')
                }
              }}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Printer, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const allExpenseTransactions = [
  {
    id: "EXP-001",
    date: "2025-01-15",
    vendor: "ABC Maintenance",
    property: "Sunset Apartments",
    amount: "R 1,200.00",
    category: "Maintenance",
    method: "Bank Transfer",
    status: "Paid",
    reference: "REF-001",
  },
  {
    id: "EXP-002",
    date: "2025-01-14",
    vendor: "City Power",
    property: "All Properties",
    amount: "R 800.00",
    category: "Utilities",
    method: "Debit Order",
    status: "Paid",
    reference: "REF-002",
  },
  {
    id: "EXP-003",
    date: "2025-01-13",
    vendor: "Insurance Co",
    property: "All Properties",
    amount: "R 500.00",
    category: "Insurance",
    method: "Bank Transfer",
    status: "Paid",
    reference: "REF-003",
  },
  {
    id: "EXP-004",
    date: "2025-01-12",
    vendor: "Property Management",
    property: "Ocean View Complex",
    amount: "R 300.00",
    category: "Management",
    method: "EFT",
    status: "Paid",
    reference: "REF-004",
  },
  {
    id: "EXP-005",
    date: "2025-01-11",
    vendor: "Garden Services",
    property: "Downtown Lofts",
    amount: "R 450.00",
    category: "Maintenance",
    method: "Cash",
    status: "Paid",
    reference: "REF-005",
  },
  {
    id: "EXP-006",
    date: "2025-01-10",
    vendor: "Security Company",
    property: "All Properties",
    amount: "R 750.00",
    category: "Security",
    method: "Bank Transfer",
    status: "Pending",
    reference: "REF-006",
  },
]

export default function AllExpensesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All Expenses</h2>
          <p className="text-muted-foreground">Complete list of all expense transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold">R</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">R 4,000</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">#</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">6</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Average Amount</p>
              <p className="text-2xl font-bold">R 667</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-orange-600">1</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Expense Transactions</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search transactions..." className="w-[300px] pl-8" />
              </div>
              <Select>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allExpenseTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.id}</TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>{transaction.vendor}</TableCell>
                  <TableCell>{transaction.property}</TableCell>
                  <TableCell className="font-medium text-red-600">{transaction.amount}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        transaction.category === "Maintenance"
                          ? "border-blue-200 text-blue-800"
                          : transaction.category === "Utilities"
                            ? "border-orange-200 text-orange-800"
                            : transaction.category === "Insurance"
                              ? "border-green-200 text-green-800"
                              : "border-purple-200 text-purple-800"
                      }
                    >
                      {transaction.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.method}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        transaction.status === "Paid"
                          ? "bg-green-100 text-green-800"
                          : transaction.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.reference}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expense Summary by Category */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R 1,650</div>
            <p className="text-sm text-muted-foreground">2 transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Utilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">R 800</div>
            <p className="text-sm text-muted-foreground">1 transaction</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Other Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">R 1,550</div>
            <p className="text-sm text-muted-foreground">3 transactions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Printer, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const allTransactions = [
  {
    id: "TXN-001",
    date: "2025-01-15",
    type: "Income",
    description: "Rental Payment - Unit 101",
    account: "Main Bank Account",
    party: "John Doe",
    amount: "R 5,000.00",
    status: "Completed",
    reference: "REF-001",
  },
  {
    id: "TXN-002",
    date: "2025-01-15",
    type: "Expense",
    description: "Property Maintenance",
    account: "Main Bank Account",
    party: "ABC Maintenance",
    amount: "R 1,200.00",
    status: "Completed",
    reference: "REF-002",
  },
  {
    id: "TXN-003",
    date: "2025-01-14",
    type: "Income",
    description: "Rental Payment - Unit 205",
    account: "Main Bank Account",
    party: "Jane Smith",
    amount: "R 3,500.00",
    status: "Completed",
    reference: "REF-003",
  },
  {
    id: "TXN-004",
    date: "2025-01-14",
    type: "Expense",
    description: "Utility Bills",
    account: "Main Bank Account",
    party: "City Power",
    amount: "R 800.00",
    status: "Completed",
    reference: "REF-004",
  },
  {
    id: "TXN-005",
    date: "2025-01-13",
    type: "Transfer",
    description: "Transfer to Savings",
    account: "Savings Account",
    party: "Internal Transfer",
    amount: "R 10,000.00",
    status: "Completed",
    reference: "REF-005",
  },
  {
    id: "TXN-006",
    date: "2025-01-13",
    type: "Income",
    description: "Security Deposit - Unit 301",
    account: "Security Deposits",
    party: "David Brown",
    amount: "R 7,000.00",
    status: "Completed",
    reference: "REF-006",
  },
  {
    id: "TXN-007",
    date: "2025-01-12",
    type: "Expense",
    description: "Property Management Fee",
    account: "Main Bank Account",
    party: "Property Management",
    amount: "R 300.00",
    status: "Pending",
    reference: "REF-007",
  },
]

export default function AllTransactionsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All Transactions</h2>
          <p className="text-muted-foreground">Complete list of all financial transactions</p>
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
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">#</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">7</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">↑</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Income</p>
              <p className="text-2xl font-bold text-green-600">R 15,500</p>
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
              <p className="text-2xl font-bold text-red-600">R 2,300</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">=</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Net Balance</p>
              <p className="text-2xl font-bold text-purple-600">R 13,200</p>
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
                <Input placeholder="Search transactions..." className="w-[300px] pl-8" />
              </div>
              <Select>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.id}</TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        transaction.type === "Income"
                          ? "bg-green-100 text-green-800"
                          : transaction.type === "Expense"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                      }
                    >
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>{transaction.account}</TableCell>
                  <TableCell>{transaction.party}</TableCell>
                  <TableCell
                    className={
                      transaction.type === "Income"
                        ? "text-green-600 font-medium"
                        : transaction.type === "Expense"
                          ? "text-red-600 font-medium"
                          : "font-medium"
                    }
                  >
                    {transaction.amount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={transaction.status === "Completed" ? "default" : "secondary"}
                      className={
                        transaction.status === "Completed"
                          ? "bg-green-500"
                          : transaction.status === "Pending"
                            ? "bg-yellow-500"
                            : "bg-red-500"
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

      {/* Transaction Summary by Type */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Income Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R 15,500</div>
            <p className="text-sm text-muted-foreground">3 transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R 2,300</div>
            <p className="text-sm text-muted-foreground">3 transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transfer Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">R 10,000</div>
            <p className="text-sm text-muted-foreground">1 transaction</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

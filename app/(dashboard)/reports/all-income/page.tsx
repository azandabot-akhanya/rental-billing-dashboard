"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Printer, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const allIncomeTransactions = [
  {
    id: "INC-001",
    date: "2025-01-15",
    tenant: "John Doe",
    property: "Sunset Apartments - Unit 101",
    amount: "R 5,000.00",
    type: "Rental Payment",
    method: "Bank Transfer",
    status: "Received",
    reference: "REF-001",
  },
  {
    id: "INC-002",
    date: "2025-01-14",
    tenant: "Jane Smith",
    property: "Ocean View Complex - Unit 205",
    amount: "R 3,500.00",
    type: "Rental Payment",
    method: "EFT",
    status: "Received",
    reference: "REF-002",
  },
  {
    id: "INC-003",
    date: "2025-01-13",
    tenant: "Mike Johnson",
    property: "Downtown Lofts - Unit 302",
    amount: "R 4,200.00",
    type: "Rental Payment",
    method: "Cash",
    status: "Received",
    reference: "REF-003",
  },
  {
    id: "INC-004",
    date: "2025-01-12",
    tenant: "Sarah Wilson",
    property: "Sunset Apartments - Unit 205",
    amount: "R 500.00",
    type: "Late Fee",
    method: "Bank Transfer",
    status: "Received",
    reference: "REF-004",
  },
  {
    id: "INC-005",
    date: "2025-01-11",
    tenant: "David Brown",
    property: "Ocean View Complex - Unit 301",
    amount: "R 7,000.00",
    type: "Security Deposit",
    method: "EFT",
    status: "Received",
    reference: "REF-005",
  },
  {
    id: "INC-006",
    date: "2025-01-10",
    tenant: "Lisa Davis",
    property: "Downtown Lofts - Unit 101",
    amount: "R 2,800.00",
    type: "Rental Payment",
    method: "Debit Order",
    status: "Pending",
    reference: "REF-006",
  },
]

export default function AllIncomePage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All Income</h2>
          <p className="text-muted-foreground">Complete list of all income transactions</p>
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
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">R</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Income</p>
              <p className="text-2xl font-bold text-green-600">R 23,000</p>
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
              <p className="text-2xl font-bold">R 3,833</p>
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
            <CardTitle>All Income Transactions</CardTitle>
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
                  <SelectItem value="rental">Rental Payment</SelectItem>
                  <SelectItem value="deposit">Security Deposit</SelectItem>
                  <SelectItem value="late-fee">Late Fee</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
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
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allIncomeTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.id}</TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>{transaction.tenant}</TableCell>
                  <TableCell>{transaction.property}</TableCell>
                  <TableCell className="font-medium text-green-600">{transaction.amount}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        transaction.type === "Rental Payment"
                          ? "border-blue-200 text-blue-800"
                          : transaction.type === "Security Deposit"
                            ? "border-purple-200 text-purple-800"
                            : "border-orange-200 text-orange-800"
                      }
                    >
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.method}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        transaction.status === "Received"
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

      {/* Income Summary by Type */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rental Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R 15,500</div>
            <p className="text-sm text-muted-foreground">4 transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">R 7,000</div>
            <p className="text-sm text-muted-foreground">1 transaction</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Late Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">R 500</div>
            <p className="text-sm text-muted-foreground">1 transaction</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

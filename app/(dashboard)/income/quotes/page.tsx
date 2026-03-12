"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Eye, Edit, Trash2, Send } from "lucide-react"
import Link from "next/link"

const quotes = [
  {
    id: "QUO-001",
    client: "John Doe",
    property: "Sunset Apartments - Unit 101",
    amount: "R 5,000.00",
    date: "2025-01-15",
    validUntil: "2025-02-15",
    status: "Sent",
    type: "Rental Quote",
  },
  {
    id: "QUO-002",
    client: "Jane Smith",
    property: "Ocean View Complex - Unit 205",
    amount: "R 3,500.00",
    date: "2025-01-14",
    validUntil: "2025-02-14",
    status: "Accepted",
    type: "Rental Quote",
  },
  {
    id: "QUO-003",
    client: "Mike Johnson",
    property: "Downtown Lofts - Unit 302",
    amount: "R 1,200.00",
    date: "2025-01-13",
    validUntil: "2025-02-13",
    status: "Draft",
    type: "Maintenance Quote",
  },
]

export default function QuotesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quotes</h2>
          <p className="text-muted-foreground">Manage quotes and estimates</p>
        </div>
        <Link href="/income/quotes/new">
          <Button className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Create New Quote
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">📄</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Quotes</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">✓</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Accepted</p>
              <p className="text-2xl font-bold text-green-600">1</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 font-bold">📤</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Sent</p>
              <p className="text-2xl font-bold text-yellow-600">1</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">R</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">R 9,700</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Quotes</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search quotes..." className="w-[300px] pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.id}</TableCell>
                  <TableCell>{quote.client}</TableCell>
                  <TableCell>{quote.property}</TableCell>
                  <TableCell className="font-medium">{quote.amount}</TableCell>
                  <TableCell>{quote.date}</TableCell>
                  <TableCell>{quote.validUntil}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        quote.status === "Accepted"
                          ? "bg-green-100 text-green-800"
                          : quote.status === "Sent"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }
                    >
                      {quote.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{quote.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

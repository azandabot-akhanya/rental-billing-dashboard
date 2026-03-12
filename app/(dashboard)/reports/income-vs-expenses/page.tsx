"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Printer, TrendingUp, TrendingDown } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Bar, BarChart, PieChart, Pie, Cell } from "recharts"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { getApiUrl } from "@/lib/api-config"

export default function IncomeVsExpensesPage() {
  const reportRef = useRef(null)

  const [monthlyData, setMonthlyData] = useState([])
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0, total_profit: 0 })
  const [propertyPerformance, setPropertyPerformance] = useState([])
  const [profitMarginData, setProfitMarginData] = useState([])
  const [incomeDetails, setIncomeDetails] = useState<any[]>([])
  const [expenseDetails, setExpenseDetails] = useState<any[]>([])
  const [properties, setProperties] = useState([])
  const [filters, setFilters] = useState({
    fromDate: "2025-09-01",
    toDate: "2025-11-30",
    propertyId: null
  })

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

  const fetchData = async () => {
    const companyId = localStorage.getItem("selectedCompanyId") || "1"

    try {
      const params = new URLSearchParams({
        company_id: companyId,
        property_id: filters.propertyId || "",
        start_date: filters.fromDate,
        end_date: filters.toDate
      })

      const res = await fetch(getApiUrl(`profit-loss?${params.toString()}`))
      const data = await res.json()
      if (data.success) {
        setMonthlyData(data.monthlyData || [])
        setSummary(data.summary || { total_income: 0, total_expenses: 0, total_profit: 0 })
        setPropertyPerformance(data.propertyPerformance || [])
        setIncomeDetails(data.incomeDetails || [])
        setExpenseDetails(data.expenseDetails || [])

        const totalIncome = parseFloat(data.summary?.total_income) || 0
        const totalExpenses = parseFloat(data.summary?.total_expenses) || 0
        setProfitMarginData([
          { name: "Income", value: totalIncome, color: "#22c55e" },
          { name: "Expenses", value: totalExpenses, color: "#ef4444" }
        ])
      }
    } catch (err) {
      console.error("Failed to fetch profit & loss:", err)
    }
  }

  useEffect(() => {
    fetchProperties()
    fetchData()
  }, [])

  const profitMarginPercent = summary.total_income > 0
    ? Math.round((summary.total_profit / summary.total_income) * 100)
    : 0

  const totalPie = summary.total_income + summary.total_expenses || 1

  // --- PRINT FUNCTION ---
  const handlePrint = () => {
    if (!reportRef.current) return
    const printContents = reportRef.current.innerHTML
    const originalContents = document.body.innerHTML

    document.body.innerHTML = printContents
    window.print()
    document.body.innerHTML = originalContents
    window.location.reload()
  }

  // --- EXPORT PDF FUNCTION ---
  const handleExportPDF = async () => {
    if (!reportRef.current) return
    const element = reportRef.current

    const canvas = await html2canvas(element, { scale: 2 })
    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF("p", "mm", "a4")

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
    pdf.save("Income_vs_Expenses.pdf")
  }

  return (
    <div ref={reportRef} className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Income vs Expenses</h2>
          <p className="text-muted-foreground">Compare income and expenses to analyze profitability</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-2" /> Export PDF
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
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property">Property</Label>
              <Select
                value={filters.propertyId || "all"}
                onValueChange={(val) => setFilters({ ...filters, propertyId: val === "all" ? null : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.property_id} value={String(p.property_id)}>
                      {p.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="bg-blue-500 hover:bg-blue-600" onClick={fetchData}>Generate Report</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Income", value: summary.total_income, color: "green", icon: "↑" },
          { label: "Total Expenses", value: summary.total_expenses, color: "red", icon: "↓" },
          { label: "Net Profit", value: summary.total_profit, color: "blue", icon: "💰" },
          { label: "Profit Margin", value: `${profitMarginPercent}%`, color: "purple", icon: "%" },
        ].map((card, idx) => (
          <Card key={idx}>
            <CardContent className="flex items-center p-6">
              <div className={`h-8 w-8 bg-${card.color}-100 rounded-full flex items-center justify-center`}>
                <span className={`text-${card.color}-600 font-bold`}>{card.icon}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <p className={`text-2xl font-bold text-${card.color}-600`}>R {card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Income & Expense Details Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Income Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Income Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No income transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    incomeDetails.map((item, idx) => (
                      <TableRow key={`income-${idx}`}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.description || 'N/A'}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          R {parseFloat(item.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {incomeDetails.length > 0 && (
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{incomeDetails.length} transaction(s)</span>
                <span className="font-bold text-green-600">
                  Total: R {parseFloat(summary.total_income).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Expense Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No expense transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenseDetails.map((item, idx) => (
                      <TableRow key={`expense-${idx}`}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.description || 'N/A'}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          R {parseFloat(item.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {expenseDetails.length > 0 && (
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{expenseDetails.length} transaction(s)</span>
                <span className="font-bold text-red-600">
                  Total: R {parseFloat(summary.total_expenses).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Income vs Expenses */}
        <Card>
          <CardHeader><CardTitle>Monthly Income vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                income: { label: "Income", color: "#22c55e" },
                expenses: { label: "Expenses", color: "#ef4444" },
                profit: { label: "Profit", color: "#3b82f6" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill="#22c55e" />
                  <Bar dataKey="expenses" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Profit Trend */}
        <Card>
          <CardHeader><CardTitle>Profit Trend</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer
              config={{ profit: { label: "Profit", color: "#3b82f6" } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart and Property Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Income vs Expenses Distribution */}
        <Card>
          <CardHeader><CardTitle>Income vs Expenses Distribution</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer
              config={{ income: { color: "#22c55e" }, expenses: { color: "#ef4444" } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={profitMarginData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {profitMarginData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex justify-center gap-6 mt-4">
              {profitMarginData.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-sm">
                    {entry.name} ({Math.round((entry.value / totalPie) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Property Performance */}
        <Card>
          <CardHeader><CardTitle>Property Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {propertyPerformance.map((property) => (
                <div key={property.property_id} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">{property.property}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Income:</span> <span className="ml-2 font-medium text-green-600">R {property.income}</span></div>
                    <div><span className="text-muted-foreground">Expenses:</span> <span className="ml-2 font-medium text-red-600">R {property.expenses}</span></div>
                    <div><span className="text-muted-foreground">Profit:</span> <span className="ml-2 font-medium text-blue-600">R {property.profit}</span></div>
                    <div><span className="text-muted-foreground">Margin:</span> <span className="ml-2 font-medium">{property.margin}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

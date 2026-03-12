"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Printer, Search, Loader2 } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { getApiUrl } from "@/lib/api-config"

export default function SupplierStatementPage() {
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [selectedProperty, setSelectedProperty] = useState("")
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [companyName, setCompanyName] = useState("Company Name")


  // Fetch properties
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

  // Fetch suppliers filtered by property
  const fetchSuppliers = async (propertyId?: string) => {
    const companyId = localStorage.getItem("selectedCompanyId") || "1"

    try {
      let url = getApiUrl(`suppliers?company_id=${companyId}`)
      if (propertyId) {
        url += `&property_id=${propertyId}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setSuppliers(data.suppliers || [])
    } catch (error) {
      console.error("Error fetching suppliers:", error)
    }
  }

  // Fetch supplier statement
  const fetchSupplierStatement = async () => {
    const companyId = localStorage.getItem("selectedCompanyId") || "1"

    if (!selectedSupplier) return
    setLoading(true)
    try {
      const res = await fetch(getApiUrl(`suppliers/${selectedSupplier}?statement=1&company_id=${companyId}&start_date=${fromDate}&end_date=${toDate}`))
      const data = await res.json()
      if (data.success) {
        setTransactions(data.statement || [])
      }
    } catch (error) {
      console.error("Error fetching supplier statement:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(
    (t) =>
      (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.reference_number || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: string | number) =>
    `R ${parseFloat(amount || "0").toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fetchCompanyName = async () => {
    try {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) return

      const res = await fetch(getApiUrl(`companies/${companyId}`))
      if (!res.ok) throw new Error("Failed to fetch company")
      const data = await res.json()

      if (data && data.company_name) {
        setCompanyName(data.company_name)
      }
    } catch (error) {
      console.error("Error fetching company name:", error)
    }
  }

  const handlePrint = () => {
    const supplier = suppliers.find((s) => String(s.supplier_id) === selectedSupplier)
    const property = properties.find((p) => String(p.property_id) === selectedProperty)

    const printHTML = `
      <html>
        <head>
          <title>Supplier Statement</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0b66ff; color: white; padding: 8px; text-align: left; }
            td { border: 1px solid #ddd; padding: 6px; }
          </style>
        </head>
        <body>
          <h2>Supplier Statement</h2>
          <p><strong>Supplier:</strong> ${supplier?.name || "-"}</p>
          <p><strong>Property:</strong> ${property?.property_name || "-"}</p>
          <p><strong>Period:</strong> ${fromDate} to ${toDate}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Tenant</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${t.transaction_date}</td>
                  <td>${t.description || '-'}</td>
                  <td>${t.reference_number}</td>
                  <td>${formatCurrency(t.amount)}</td>
                  <td>${t.tenant_name || '-'}</td>
                  <td>${t.category_name || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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

  const exportPDF = () => {
    const supplier = suppliers.find((s) => String(s.supplier_id) === selectedSupplier)
    const property = properties.find((p) => String(p.property_id) === selectedProperty)

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
    doc.text('Supplier Statement', pageWidth / 2, 32, { align: 'center' })

    yPos = 50

    // Document Info Section
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text(`Supplier: ${supplier?.name || "-"}`, 14, yPos)
    yPos += 6
    doc.text(`Property: ${property?.property_name || "-"}`, 14, yPos)
    yPos += 6
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, yPos)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, yPos, { align: 'right' })

    yPos += 10

    // Horizontal line separator
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.line(14, yPos, pageWidth - 14, yPos)

    yPos += 10

    // Statement Details Section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text("Transaction Details", 14, yPos)

    yPos += 5

    // Table
    const tableData = filteredTransactions.map((t) => [
      t.transaction_date,
      t.description || "-",
      t.reference_number,
      formatCurrency(t.amount),
      t.tenant_name || "-",
      t.category_name || "-"
    ])

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Description", "Reference", "Amount", "Tenant", "Category"]],
      body: tableData,
      theme: "striped",
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
      },
      margin: { left: 14, right: 14 }
    })

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text('Generated with ThynkXPro', pageWidth / 2, footerY, { align: 'center' })

    doc.save(`Supplier_Statement_${supplier?.name || "supplier"}_${fromDate}_to_${toDate}.pdf`)
  }

  useEffect(() => {
    fetchProperties()
    fetchCompanyName()
  }, [])
  useEffect(() => { fetchSuppliers(selectedProperty) }, [selectedProperty])
  useEffect(() => { if (selectedSupplier) fetchSupplierStatement() }, [selectedSupplier, fromDate, toDate])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Supplier Statements</h2>
        <div className="flex">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" onClick={exportPDF} className="ml-2">
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Statement Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.supplier_id} value={String(s.supplier_id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.property_id} value={String(p.property_id)}>{p.property_name}</SelectItem>
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
                onClick={fetchSupplierStatement}
                disabled={loading || !selectedSupplier}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Statement
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Supplier Statement</CardTitle>
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
                <TableHead>Amount</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t, index) => (
                  <TableRow key={index}>
                    <TableCell>{t.transaction_date}</TableCell>
                    <TableCell>{t.description || 'N/A'}</TableCell>
                    <TableCell>{t.reference_number}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(t.amount)}</TableCell>
                    <TableCell>{t.tenant_name || 'N/A'}</TableCell>
                    <TableCell>{t.category_name || 'N/A'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {selectedSupplier
                      ? "No transactions found for the selected period."
                      : "Please select a supplier to view statements."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

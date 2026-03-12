"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"
import { Plus, Trash2, Package, FileText, Printer } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface StockItem {
  stock_id: string
  stock_name: string
  quantity: string
}

export default function StockIssuedPage() {
  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    issuedDate: new Date().toISOString().split("T")[0],
    issuedTo: "",
  })

  const [items, setItems] = useState<StockItem[]>([{ stock_id: "", stock_name: "", quantity: "" }])
  const [stocks, setStocks] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null)
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([])
  const [lastIssuedData, setLastIssuedData] = useState<any>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : "1"

  const fetchStocks = async () => {
    try {
      const res = await fetch(getApiUrl(`stock?company_id=${companyId}`))
      const data = await res.json()
      setStocks(Array.isArray(data) ? data : data?.data || [])
    } catch (err) {
      console.error("Error fetching stocks:", err)
    }
  }

  const fetchTenants = async (propertyId?: string) => {
    try {
      let url = getApiUrl(`tenants?company_id=${companyId}`)
      if (propertyId) url += `&property_id=${propertyId}`
      const res = await fetch(url)
      const data = await res.json()
      setTenants(Array.isArray(data) ? data.flat() : [])
    } catch (err) {
      console.error("Error fetching tenants:", err)
    }
  }

  const fetchProperties = async () => {
    try {
      const res = await fetch(getApiUrl(`properties?company_id=${companyId}`))
      const data = await res.json()
      setProperties(Array.isArray(data) ? data.flat() : [])
    } catch (err) {
      console.error("Error fetching properties:", err)
    }
  }

  useEffect(() => {
    fetchStocks()
    fetchTenants()
    fetchProperties()
  }, [])

  useEffect(() => {
    if (formData.propertyId) {
      fetchTenants(formData.propertyId)
      setFormData(prev => ({ ...prev, tenantId: "" }))
    }
  }, [formData.propertyId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleStockNameChange = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], stock_name: value, stock_id: "" }
    setItems(newItems)

    if (value.trim().length > 0) {
      const filtered = stocks.filter(stock =>
        stock.name.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0 ? index : null)
    } else {
      setFilteredSuggestions([])
      setShowSuggestions(null)
    }
  }

  const selectSuggestion = (index: number, stock: any) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      stock_id: String(stock.stock_id),
      stock_name: stock.name
    }
    setItems(newItems)
    setShowSuggestions(null)
  }

  const handleQuantityChange = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], quantity: value }
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { stock_id: "", stock_name: "", quantity: "" }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async () => {
    if (!companyId) return toast.error("Company ID not found")

    const validItems = items.filter(item => (item.stock_id || item.stock_name) && item.quantity && Number(item.quantity) > 0)
    if (validItems.length === 0) return toast.error("Please add at least one item with quantity")

    const payload = {
      company_id: companyId,
      property_id: formData.propertyId || null,
      tenant_id: formData.tenantId || null,
      issued_date: formData.issuedDate || new Date().toISOString().split("T")[0],
      issued_to: formData.issuedTo || null,
      items: validItems.map(item => ({
        stock_id: item.stock_id || null,
        stock_name: item.stock_name || null,
        quantity: Number(item.quantity)
      }))
    }

    try {
      const res = await fetch(getApiUrl("stock/issued"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save")

      // Save for receipt generation
      const selectedProperty = properties.find(p => String(p.property_id) === formData.propertyId)
      const selectedTenant = tenants.find(t => String(t.tenant_id) === formData.tenantId)

      setLastIssuedData({
        items: validItems,
        property: selectedProperty?.property_name || "N/A",
        tenant: selectedTenant?.full_name || "N/A",
        issuedTo: formData.issuedTo || "N/A",
        issuedDate: formData.issuedDate,
        companyName: localStorage.getItem("companyName") || "ThynkX Pro"
      })

      toast.success(`${validItems.length} stock item(s) issued successfully!`)
      setFormData({ propertyId: "", tenantId: "", issuedDate: new Date().toISOString().split("T")[0], issuedTo: "" })
      setItems([{ stock_id: "", stock_name: "", quantity: "" }])
      fetchStocks()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Generate receipt letter
  const generateReceipt = () => {
    if (!lastIssuedData) {
      toast.error("No stock issue to generate receipt for. Please issue stock first.")
      return
    }

    const { items, property, tenant, issuedTo, issuedDate, companyName } = lastIssuedData

    const doc = new jsPDF("p", "mm", "a4")
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header
    doc.setFillColor(91, 91, 255)
    doc.rect(0, 0, pageWidth, 40, 'F')
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(companyName, pageWidth / 2, 18, { align: 'center' })
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('Stock Issue Receipt', pageWidth / 2, 30, { align: 'center' })

    let yPos = 55
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)

    // Details
    doc.text(`Date: ${issuedDate}`, 14, yPos)
    yPos += 8
    doc.text(`Property: ${property}`, 14, yPos)
    yPos += 8
    if (tenant !== "N/A") {
      doc.text(`Tenant: ${tenant}`, 14, yPos)
      yPos += 8
    }
    doc.text(`Received By: ${issuedTo}`, 14, yPos)
    yPos += 15

    // Items table
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Items Issued:', 14, yPos)
    yPos += 5

    const tableData = items.map((item: StockItem) => [
      item.stock_name,
      item.quantity
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Stock Item', 'Quantity']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [91, 91, 255],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    })

    yPos = (doc as any).lastAutoTable.finalY + 30

    // Signature section
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('I acknowledge receipt of the above items:', 14, yPos)
    yPos += 20

    doc.line(14, yPos, 100, yPos)
    doc.text('Signature', 14, yPos + 5)

    doc.line(pageWidth - 100, yPos, pageWidth - 14, yPos)
    doc.text('Date', pageWidth - 100, yPos + 5)

    yPos += 20
    doc.line(14, yPos, 100, yPos)
    doc.text('Print Name', 14, yPos + 5)

    // Footer
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text('Generated with ThynkXPro', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })

    doc.save(`Stock_Issue_Receipt_${issuedDate}.pdf`)
    toast.success("Receipt generated successfully!")
  }

  // Print receipt
  const printReceipt = () => {
    if (!lastIssuedData) {
      toast.error("No stock issue to print. Please issue stock first.")
      return
    }

    const { items, property, tenant, issuedTo, issuedDate, companyName } = lastIssuedData

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stock Issue Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { background: #5B5BFF; color: white; padding: 20px; text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header h2 { margin: 5px 0 0; font-size: 16px; font-weight: normal; }
            .details { margin-bottom: 20px; }
            .details p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #5B5BFF; color: white; }
            .signature-section { margin-top: 50px; }
            .signature-line { display: flex; justify-content: space-between; margin: 30px 0; }
            .signature-box { width: 45%; }
            .signature-box .line { border-bottom: 1px solid #333; height: 30px; margin-bottom: 5px; }
            .signature-box .label { font-size: 12px; color: #666; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyName}</h1>
            <h2>Stock Issue Receipt</h2>
          </div>
          <div class="details">
            <p><strong>Date:</strong> ${issuedDate}</p>
            <p><strong>Property:</strong> ${property}</p>
            ${tenant !== "N/A" ? `<p><strong>Tenant:</strong> ${tenant}</p>` : ''}
            <p><strong>Received By:</strong> ${issuedTo}</p>
          </div>
          <h3>Items Issued:</h3>
          <table>
            <thead>
              <tr><th>Stock Item</th><th>Quantity</th></tr>
            </thead>
            <tbody>
              ${items.map((item: StockItem) => `<tr><td>${item.stock_name}</td><td style="text-align:center">${item.quantity}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="signature-section">
            <p>I acknowledge receipt of the above items:</p>
            <div class="signature-line">
              <div class="signature-box"><div class="line"></div><div class="label">Signature</div></div>
              <div class="signature-box"><div class="line"></div><div class="label">Date</div></div>
            </div>
            <div class="signature-line">
              <div class="signature-box"><div class="line"></div><div class="label">Print Name</div></div>
            </div>
          </div>
          <div class="footer">Generated with ThynkXPro</div>
        </body>
      </html>
    `

    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(printHTML)
      newWindow.document.close()
      setTimeout(() => newWindow.print(), 250)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Issued</h2>
          <p className="text-muted-foreground">Record stock issued to properties/tenants</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printReceipt} disabled={!lastIssuedData}>
            <Printer className="w-4 h-4 mr-2" /> Print Receipt
          </Button>
          <Button variant="outline" onClick={generateReceipt} disabled={!lastIssuedData}>
            <FileText className="w-4 h-4 mr-2" /> Generate PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Record Stock Issued
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Property, Tenant, Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select
                value={formData.propertyId}
                onValueChange={(val) => setFormData({ ...formData, propertyId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.property_id} value={String(p.property_id)}>
                      {p.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select
                value={formData.tenantId}
                onValueChange={(val) => setFormData({ ...formData, tenantId: val })}
                disabled={!formData.propertyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.propertyId ? "Select tenant (optional)" : "Select property first"} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.tenant_id} value={String(t.tenant_id)}>
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={formData.issuedDate}
                onChange={(e) => setFormData({ ...formData, issuedDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Issued To (Receiver Name) *</Label>
              <Input
                value={formData.issuedTo}
                onChange={(e) => setFormData({ ...formData, issuedTo: e.target.value })}
                placeholder="Name of person receiving stock"
              />
            </div>
          </div>

          {/* Stock Items Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Stock Item *</TableHead>
                  <TableHead className="w-[30%]">Quantity *</TableHead>
                  <TableHead className="w-[20%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="relative" ref={showSuggestions === index ? suggestionsRef : null}>
                        <Input
                          value={item.stock_name}
                          onChange={(e) => handleStockNameChange(index, e.target.value)}
                          onFocus={() => {
                            if (item.stock_name.trim().length > 0) {
                              const filtered = stocks.filter(stock =>
                                stock.name.toLowerCase().includes(item.stock_name.toLowerCase())
                              )
                              if (filtered.length > 0) {
                                setFilteredSuggestions(filtered)
                                setShowSuggestions(index)
                              }
                            }
                          }}
                          placeholder="Type stock item name..."
                          autoComplete="off"
                        />
                        {showSuggestions === index && filteredSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                            {filteredSuggestions.map((stock) => (
                              <div
                                key={stock.stock_id}
                                className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                                onClick={() => selectSuggestion(index, stock)}
                              >
                                <div className="font-medium">{stock.name}</div>
                                <div className="text-xs text-gray-500">
                                  Available: {stock.quantity || 0} units
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.stock_id && (
                          <div className="text-xs text-green-600 mt-1">Existing item selected</div>
                        )}
                        {item.stock_name && !item.stock_id && (
                          <div className="text-xs text-blue-600 mt-1">New item will be created</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        placeholder="Qty"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Add Item Button */}
          <Button variant="outline" onClick={addItem} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Add Another Item
          </Button>

          {/* Submit Button */}
          <Button className="bg-blue-500 hover:bg-blue-600 w-full" onClick={handleSubmit}>
            Issue Stock ({items.filter(i => i.stock_name && i.quantity).length} items)
          </Button>

          {/* Receipt indicator */}
          {lastIssuedData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">Stock issued successfully!</p>
              <p className="text-green-600 text-sm">You can now print or generate a PDF receipt using the buttons above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

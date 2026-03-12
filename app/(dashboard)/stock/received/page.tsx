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
import { Plus, Trash2, Package } from "lucide-react"

interface StockItem {
  stock_id: string
  stock_name: string
  quantity: string
}

export default function StockReceivedPage() {
  const [formData, setFormData] = useState({
    supplierId: "",
    receivedDate: new Date().toISOString().split("T")[0],
    receivedBy: "",
  })

  const [items, setItems] = useState<StockItem[]>([{ stock_id: "", stock_name: "", quantity: "" }])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [stocks, setStocks] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null)
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([])
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : "1"

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(getApiUrl(`suppliers?company_id=${companyId}`))
      const data = await res.json()
      setSuppliers(data?.suppliers || data?.data || [])
    } catch (err) {
      console.error("Error fetching suppliers:", err)
    }
  }

  const fetchStocks = async () => {
    try {
      // Fetch all stocks globally
      const res = await fetch(getApiUrl(`stock?company_id=${companyId}`))
      const data = await res.json()
      setStocks(Array.isArray(data) ? data : data?.data || [])
    } catch (err) {
      console.error("Error fetching stocks:", err)
    }
  }

  useEffect(() => {
    fetchSuppliers()
    fetchStocks()
  }, [])

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
    if (!formData.supplierId) return toast.error("Please select a supplier")

    const validItems = items.filter(item => (item.stock_id || item.stock_name) && item.quantity && Number(item.quantity) > 0)
    if (validItems.length === 0) return toast.error("Please add at least one item with quantity")

    const payload = {
      company_id: companyId,
      supplier_id: formData.supplierId,
      received_date: formData.receivedDate || new Date().toISOString().split("T")[0],
      received_by: formData.receivedBy || null,
      items: validItems.map(item => ({
        stock_id: item.stock_id || null,
        stock_name: item.stock_name || null,
        quantity: Number(item.quantity)
      }))
    }

    try {
      const res = await fetch(getApiUrl("stock/received"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save")

      toast.success(`${validItems.length} stock item(s) received successfully!`)
      setFormData({ supplierId: "", receivedDate: new Date().toISOString().split("T")[0], receivedBy: "" })
      setItems([{ stock_id: "", stock_name: "", quantity: "" }])
      fetchStocks() // Refresh stock list
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Received</h2>
          <p className="text-muted-foreground">Record stock received from suppliers</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Record Stock Received
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Supplier and Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select
                value={formData.supplierId}
                onValueChange={(val) => setFormData({ ...formData, supplierId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.supplier_id} value={String(s.supplier_id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Received Date</Label>
              <Input
                type="date"
                value={formData.receivedDate}
                onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Received By</Label>
              <Input
                value={formData.receivedBy}
                onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
                placeholder="Name of person who received stock"
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
            Save Stock Received ({items.filter(i => i.stock_name && i.quantity).length} items)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

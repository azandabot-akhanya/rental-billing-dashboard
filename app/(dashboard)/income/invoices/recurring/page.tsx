"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
  total: number
}

interface Tenant {
  tenant_id: number
  full_name: string
  property_id?: number
}

interface Property {
  property_id: number
  property_name: string
}

interface Category {
  category_id: number
  name: string
  description: string
  type: string
}

export default function NewRecurringInvoicePage() {
  const [formData, setFormData] = useState({
    tenant: "",
    property: "",
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: "",
    terms: "",
    notes: "",
    include_banking_details: "",
    frequency: "monthly",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    reminderDays: "3",
    autoSend: true,
    taxEnabled: false,
    taxRate: 15, // Default 15% VAT
    taxAmount: 0,
  })

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      description: "",
      quantity: 1,
      rate: 0,
      total: 0,
    },
  ])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
  const [companyBankingDetails, setCompanyBankingDetails] = useState("")
  const [categories, setCategories] = useState<Category[]>([])

  // Calculate totals whenever items or tax settings change
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = formData.taxEnabled ? (subtotal * formData.taxRate) / 100 : 0
  const total = subtotal + taxAmount

  // Update tax amount when subtotal or tax rate changes
  useEffect(() => {
    const newTaxAmount = formData.taxEnabled ? (subtotal * formData.taxRate) / 100 : 0
    setFormData(prev => ({ ...prev, taxAmount: newTaxAmount }))
  }, [subtotal, formData.taxEnabled, formData.taxRate])

  // Fetch next invoice number on component mount
  useEffect(() => {
    async function fetchNextInvoiceNumber() {
      const companyId = localStorage.getItem("selectedCompanyId");
      if (!companyId) return;

      setLoading(true);
      try {
        const res = await fetch(
          getApiUrl(`invoices/next-number?company_id=${companyId}`)
        );

        if (!res.ok) throw new Error("Failed to fetch invoice number");

        const data = await res.json();

        // Adjust depending on your API response
        const nextNumber = data.invoice_number || data.next_number;

        setFormData((prev) => ({
          ...prev,
          invoiceNumber: nextNumber ?? `RINV-${Date.now().toString().slice(-4)}`
        }));
      } catch (err) {
        console.error("Error fetching invoice number:", err);

        // fallback value
        const fallback = `RINV-${Date.now().toString().slice(-4)}`;
        setFormData((prev) => ({
          ...prev,
          invoiceNumber: fallback
        }));
      } finally {
        setLoading(false);
      }
    }

    fetchNextInvoiceNumber();
  }, []);

  // Fetch company banking details
  useEffect(() => {
    async function fetchCompanyDetails() {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) return

      try {
        const res = await fetch(getApiUrl(`companies/${companyId}`))
        if (!res.ok) throw new Error("Failed to fetch company details")
        const data = await res.json()

        if (data.banking_details) {
          setCompanyBankingDetails(data.banking_details)
          setFormData(prev => ({ ...prev, include_banking_details: data.banking_details }))
        }
      } catch (err) {
        console.error("Error fetching company details:", err)
      }
    }
    fetchCompanyDetails()
  }, [])

  useEffect(() => {
    async function fetchTenants() {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) return

      try {
        const res = await fetch(getApiUrl(`tenants?company_id=${companyId}`))
        if (!res.ok) throw new Error("Failed to fetch tenants")
        const data = await res.json()
        setAllTenants(data.flat())
      } catch (err) {
        console.error("Error fetching tenants:", err)
        toast.error("Failed to fetch tenants")
      }
    }
    fetchTenants()
  }, [])

  // Filter tenants when property changes
  useEffect(() => {
    if (!formData.property) {
      setFilteredTenants([])
      return
    }

    const propertyId = formData.property
    const tenantsForProperty = allTenants.filter(t => t.property_id?.toString() === propertyId)
    setFilteredTenants(tenantsForProperty)

    // Reset tenant selection if current tenant is not in this property
    if (formData.tenant) {
      const tenantId = parseInt(formData.tenant)
      const tenantStillValid = tenantsForProperty.some(t => t.tenant_id === tenantId)
      if (!tenantStillValid) {
        setFormData(prev => ({ ...prev, tenant: "" }))
      }
    }
  }, [formData.property, allTenants])
  
  useEffect(() => {
    async function fetchProperties() {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) return

      try {
        const res = await fetch(getApiUrl(`properties?company_id=${companyId}`))
        if (!res.ok) throw new Error("Failed to fetch properties")
        const data = await res.json()
        setProperties(data.flat()) // <-- flatten here
      } catch (err) {
        console.error("Error fetching properties:", err)
        toast.error("Failed to fetch properties")
      }
    }
    fetchProperties()
  }, [])

  // Fetch categories/products
  useEffect(() => {
    async function fetchCategories() {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) return

      try {
        const res = await fetch(getApiUrl(`categories?company_id=${companyId}`))
        if (!res.ok) throw new Error("Failed to fetch categories")
        const data = await res.json()
        if (data.success) {
          // Get both income and expense categories for invoice items
          setCategories(data.categories)
        }
      } catch (err) {
        console.error("Error fetching categories:", err)
      }
    }
    fetchCategories()
  }, [])
  

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      rate: 0,
      total: 0,
    }
    setItems([...items, newItem])
  }

  const addProductFromCategory = (categoryName: string) => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: categoryName,
      quantity: 1,
      rate: 0, // User will need to fill in the rate
      total: 0,
    }
    setItems([...items, newItem])
    toast.success(`Added "${categoryName}" to invoice items`)
  }

  const removeItem = (id: string) => {
    if (items.length === 1) return
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          if (field === "quantity" || field === "rate") {
            updatedItem.total = updatedItem.quantity * updatedItem.rate
          }
          return updatedItem
        }
        return item
      }),
    )
  }

  const handleTaxToggle = (enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      taxEnabled: enabled,
      taxAmount: enabled ? (subtotal * prev.taxRate) / 100 : 0
    }))
  }

  const handleTaxRateChange = (rate: number) => {
    setFormData(prev => ({
      ...prev,
      taxRate: rate,
      taxAmount: prev.taxEnabled ? (subtotal * rate) / 100 : 0
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.tenant) {
      toast.error("Please select a tenant")
      return false
    }
    if (!formData.invoiceNumber) {
      toast.error("Please enter an invoice number")
      return false
    }
    if (!formData.startDate) {
      toast.error("Please select a start date")
      return false
    }
    if (items.some(item => !item.description || item.rate <= 0)) {
      toast.error("Please fill in all item descriptions and rates")
      return false
    }
    return true
  }

  const calculateDueDate = (startDate: string, frequency: string): string => {
    const date = new Date(startDate)
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'quarterly':
        date.setMonth(date.getMonth() + 3)
        break
      case 'semi-annually':
        date.setMonth(date.getMonth() + 6)
        break
      case 'annually':
        date.setFullYear(date.getFullYear() + 1)
        break
      default:
        date.setMonth(date.getMonth() + 1)
    }
    return date.toISOString().split('T')[0]
  }

  async function saveRecurringInvoice() {
    const companyId = localStorage.getItem("selectedCompanyId")
    if (!companyId) {
      toast.error("No company selected")
      return null
    }

    if (!validateForm()) {
      return null
    }

    const dueDate = calculateDueDate(formData.startDate, formData.frequency)

    const payload = {
      company_id: parseInt(companyId),
      invoice_number: formData.invoiceNumber,
      tenant_id: parseInt(formData.tenant),
      unit_id: formData.property ? parseInt(formData.property) : null,
      invoice_date: formData.startDate,
      due_date: dueDate,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      status: "draft",
      notes: formData.notes,
      include_banking_details: formData.include_banking_details,
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate
      })),
      is_recurring: true,
      frequency: formData.frequency,
      start_date: formData.startDate,
      end_date: formData.endDate || null,
      reminder_days: parseInt(formData.reminderDays),
      tax_enabled: formData.taxEnabled,
      tax_rate: formData.taxRate,
    }

    try {
      const res = await fetch(getApiUrl("invoices"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        return data.invoice_id
      } else {
        throw new Error(data.message || "Failed to save recurring invoice")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving recurring invoice")
      return null
    }
  }

  async function handleSaveRecurringInvoice() {
    setSaving(true)

    try {
      const invoiceId = await saveRecurringInvoice()

      if (!invoiceId) {
        return
      }

      // Generate PDF for the invoice
      toast.info("Generating PDF...")
      try {
        const pdfRes = await fetch(getApiUrl(`invoices/${invoiceId}/pdf`))
        const pdfData = await pdfRes.json()

        if (pdfData.success) {
          toast.success("PDF generated successfully!")

          // Open PDF in new window for viewing/saving
          // The storage folder is served from the root, not through the API
          const pdfUrl = pdfData.pdf_url.startsWith('/') ? pdfData.pdf_url : `/${pdfData.pdf_url}`
          window.open(pdfUrl, '_blank')

          // If auto-send is enabled, send the email
          if (formData.autoSend) {
            toast.info("Sending invoice email...")
            const emailRes = await fetch(getApiUrl(`invoices/${invoiceId}/send`))
            const emailData = await emailRes.json()

            if (emailData.success) {
              toast.success(`Invoice sent to ${emailData.recipient}`)
            } else {
              toast.warning("Invoice created but email failed to send")
            }
          }
        } else {
          toast.warning("Invoice created but PDF generation failed")
        }
      } catch (pdfError) {
        console.error("PDF/Email error:", pdfError)
        toast.warning("Invoice created but PDF/email processing failed")
      }

      toast.success("Recurring invoice created successfully!")

      // Redirect or reset form
      setFormData({
        tenant: "",
        property: "",
        invoiceNumber: "",
        date: new Date().toISOString().split("T")[0],
        dueDate: "",
        terms: "",
        notes: "",
        include_banking_details: "",
        frequency: "monthly",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        reminderDays: "3",
        autoSend: true,
        taxEnabled: false,
        taxRate: 15,
        taxAmount: 0,
      })
      setItems([{
        id: "1",
        description: "",
        quantity: 1,
        rate: 0,
        total: 0,
      }])

    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to create recurring invoice")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Recurring Invoice</h2>
          <p className="text-muted-foreground">Set up automatic recurring invoices for tenants</p>
        </div>
        <Button 
          onClick={handleSaveRecurringInvoice} 
          disabled={saving} 
          className="bg-blue-500 hover:bg-blue-600"
        >
          {saving ? "Saving..." : "Create Recurring Invoice"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Left Column - Invoice Details */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="property">Property *</Label>
                  <Select
                    value={formData.property}
                    onValueChange={(value) => setFormData({ ...formData, property: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a property first" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.property_id} value={property.property_id.toString()}>
                          {property.property_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Select a property to see available tenants</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant">Tenant *</Label>
                  <Select
                    value={formData.tenant}
                    onValueChange={(value) => setFormData({ ...formData, tenant: value })}
                    disabled={!formData.property || filteredTenants.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.property
                          ? "Select a property first"
                          : filteredTenants.length === 0
                          ? "No tenants in this property"
                          : "Select a tenant"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTenants.map((tenant) => (
                        <SelectItem key={tenant.tenant_id} value={tenant.tenant_id.toString()}>
                          {tenant.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.property && filteredTenants.length === 0 && (
                    <p className="text-xs text-red-500">No tenants found for this property</p>
                  )}
                  {filteredTenants.length > 0 && (
                    <p className="text-xs text-muted-foreground">{filteredTenants.length} tenant(s) available</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                  <Input
                    id="invoiceNumber"
                    value={loading ? "Loading..." : formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    readOnly={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="semi-annually">Semi-Annually</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Tax Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="taxEnabled"
                      checked={formData.taxEnabled}
                      onChange={(e) => handleTaxToggle(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="taxEnabled" className="text-sm font-medium">
                      Include Tax/VAT
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.taxRate}
                    onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                    disabled={!formData.taxEnabled}
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="include_banking_details">Banking Details</Label>
                <Textarea
                  id="include_banking_details"
                  value={formData.include_banking_details}
                  onChange={(e) => setFormData({ ...formData, include_banking_details: e.target.value })}
                  placeholder="Enter banking details"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes for the tenant..."
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoSend"
                    checked={formData.autoSend}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoSend: checked })}
                  />
                  <Label htmlFor="autoSend">Automatically send invoices to tenant</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminderDays">Send reminder (days before due date)</Label>
                  <Select
                    value={formData.reminderDays}
                    onValueChange={(value) => setFormData({ ...formData, reminderDays: value })}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Invoice Items</CardTitle>
              <div className="flex gap-2">
                <Select onValueChange={(value) => addProductFromCategory(value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add from Products" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <SelectItem value="none" disabled>No products available</SelectItem>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category.category_id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Blank Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Quantity</TableHead>
                    <TableHead className="w-32">Rate (R)</TableHead>
                    <TableHead className="w-32">Amount (R)</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="Item description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.total.toFixed(2)}
                          readOnly
                          className="bg-muted"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R {subtotal.toFixed(2)}</span>
                </div>
                
                {formData.taxEnabled && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax ({formData.taxRate}%):</span>
                    <span>R {taxAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>R {total.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2 pt-4">
                <div className="text-sm text-muted-foreground">
                  <div>Frequency: {formData.frequency}</div>
                  <div>Next invoice: {formData.startDate && calculateDueDate(formData.startDate, formData.frequency)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
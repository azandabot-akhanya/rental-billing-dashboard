"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"

interface Category {
  category_id: number
  name: string
  type: string
}

interface Property {
  property_id: number
  property_name: string
}

interface Supplier {
  supplier_id: number
  name: string
}

interface Tenant {
  tenant_id: number
  full_name: string
  name?: string
  property_id?: number
}

export default function NewExpensePage() {
  const [formData, setFormData] = useState({
    amount: "",
    account: "",
    vendor: "",
    property: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    description: "",
    paymentMethod: "",
    recurring: false,
    tenant: "",
  })

  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])

  // ✅ Helper function for safe array extraction
  const safeArray = (data: any): any[] => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.categories)) return data.categories
    if (Array.isArray(data?.suppliers)) return data.suppliers
    if (Array.isArray(data?.tenants)) return data.tenants
    if (Array.isArray(data?.[0])) return data[0]
    return []
  }

  // Generate reference number on component mount
  useEffect(() => {
    const generateReferenceNumber = () => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')

      return `EXP-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`
    }

    setFormData(prev => ({ ...prev, reference: generateReferenceNumber() }))
  }, [])

  useEffect(() => {
    async function fetchProperties() {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) return

      try {
        const res = await fetch(getApiUrl(`properties?company_id=${companyId}`))
        if (!res.ok) throw new Error("Failed to fetch properties")
        const data = await res.json()
        console.log("Fetched properties:", data)
        setProperties(safeArray(data))
      } catch (err) {
        console.error("Error fetching properties:", err)
        setProperties([])
      }
    }
    fetchProperties()
  }, [])

  useEffect(() => {
    async function fetchTenants() {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) return

      try {
        const res = await fetch(getApiUrl(`tenants?company_id=${companyId}`))
        if (!res.ok) throw new Error("Failed to fetch tenants")
        const data = await res.json()
        console.log("Fetched tenants:", data)
        setAllTenants(safeArray(data))
      } catch (err) {
        console.error("Error fetching tenants:", err)
        setAllTenants([])
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
    async function fetchExpenseCategories() {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) return

      try {
        const res = await fetch(getApiUrl(`categories?company_id=${companyId}&type=expense`))
        if (!res.ok) throw new Error("Failed to fetch expense categories")
        const data = await res.json()
        console.log("Fetched categories:", data)
        setExpenseCategories(safeArray(data))
      } catch (err) {
        console.error("Error fetching expense categories:", err)
        setExpenseCategories([])
      }
    }
    fetchExpenseCategories()
  }, [])

  useEffect(() => {
    async function fetchSuppliers() {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) return

      try {
        const res = await fetch(getApiUrl(`suppliers?company_id=${companyId}`))
        if (!res.ok) throw new Error("Failed to fetch suppliers")
        const data = await res.json()
        console.log("Fetched suppliers:", data)
        setSuppliers(safeArray(data))
      } catch (err) {
        console.error("Error fetching suppliers:", err)
        setSuppliers([])
      }
    }
    fetchSuppliers()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (
      !formData.amount ||
      !formData.account ||
      !formData.date ||
      !formData.category ||
      !formData.description ||
      !formData.paymentMethod
    ) {
      toast.error("Please fill in all required fields.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(getApiUrl("expenses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          account_id: formData.account,
          vendor_id: formData.vendor || null,
          tenant_id: formData.tenant || null,
          property_id: formData.property || null,
          category_id: formData.category,
          transaction_date: formData.date,
          reference_number: formData.reference,
          description: formData.description,
          payment_method_id: formData.paymentMethod,
          recurring: formData.recurring,
          company_id: localStorage.getItem("selectedCompanyId"),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "Failed to save expense")
      }

      const data = await res.json()
      toast.success("Expense saved successfully! Expense ID: " + data.expense_id)

      // Reset form with new reference number
      const newRefNumber = (() => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        return `EXP-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`
      })()

      setFormData({
        amount: "",
        account: "",
        vendor: "",
        property: "",
        category: "",
        date: new Date().toISOString().split("T")[0],
        reference: newRefNumber,
        description: "",
        paymentMethod: "",
        recurring: false,
        tenant: "",
      })
    } catch (err: any) {
      toast.error("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Expense</h2>
          <p className="text-muted-foreground">Record a new expense transaction</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit}>
            {/* Amount & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (ZAR) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter expense amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            {/* Account & Vendor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account">Account *</Label>
                <Select
                  value={formData.account}
                  onValueChange={(value) => setFormData({ ...formData, account: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Main Bank Account</SelectItem>
                    <SelectItem value="2">Savings Account</SelectItem>
                    <SelectItem value="3">Cash Account</SelectItem>
                    <SelectItem value="4">Expenses Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor/Supplier</Label>
                <Select
                  value={formData.vendor}
                  onValueChange={(value) => setFormData({ ...formData, vendor: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(suppliers) && suppliers.length === 0 ? (
                      <SelectItem value="none" disabled>No vendors available</SelectItem>
                    ) : (
                      suppliers.map((supplier) => (
                        <SelectItem key={supplier.supplier_id} value={supplier.supplier_id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(expenseCategories) && expenseCategories.length === 0 ? (
                    <SelectItem value="none" disabled>No categories available</SelectItem>
                  ) : (
                    expenseCategories.map((category) => (
                      <SelectItem key={category.category_id} value={category.category_id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Property & Tenant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property">Property</Label>
                <Select
                  value={formData.property}
                  onValueChange={(value) => setFormData({ ...formData, property: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(properties) && properties.length === 0 ? (
                      <SelectItem value="none" disabled>No properties available</SelectItem>
                    ) : (
                      properties.map((property) => (
                        <SelectItem key={property.property_id} value={property.property_id.toString()}>
                          {property.property_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Select a property to see available tenants</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant">Tenant</Label>
                <Select
                  value={formData.tenant || ""}
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
                        {tenant.full_name || tenant.name}
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
            </div>

            {/* Payment Method & Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Bank Transfer</SelectItem>
                    <SelectItem value="2">Cash</SelectItem>
                    <SelectItem value="3">Cheque</SelectItem>
                    <SelectItem value="4">Credit Card</SelectItem>
                    <SelectItem value="5">Debit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference Number (Auto-generated)</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                  placeholder="Auto-generated reference number"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter expense description"
                rows={3}
              />
            </div>

            {/* Recurring Checkbox */}
            <div className="flex items-center space-x-2">
              <input
                id="recurring"
                type="checkbox"
                checked={formData.recurring}
                onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
              />
              <Label htmlFor="recurring" className="cursor-pointer">
                Recurring Expense
              </Label>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mt-4">
              <Button className="bg-blue-500 hover:bg-blue-600" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Expense"}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  const newRefNumber = (() => {
                    const now = new Date()
                    const year = now.getFullYear()
                    const month = String(now.getMonth() + 1).padStart(2, '0')
                    const day = String(now.getDate()).padStart(2, '0')
                    const hours = String(now.getHours()).padStart(2, '0')
                    const minutes = String(now.getMinutes()).padStart(2, '0')
                    const seconds = String(now.getSeconds()).padStart(2, '0')
                    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
                    return `EXP-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`
                  })()

                  setFormData({
                    amount: "",
                    account: "",
                    vendor: "",
                    property: "",
                    category: "",
                    date: new Date().toISOString().split("T")[0],
                    reference: newRefNumber,
                    description: "",
                    paymentMethod: "",
                    recurring: false,
                    tenant: "",
                  })
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
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
import { useEffect } from "react"
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

interface Tenant {
  tenant_id: number
  full_name: string
  name?: string
  property_id?: number
}

export default function NewDepositPage() {
  const [formData, setFormData] = useState({
    amount: "",
    account: "",
    tenant: "",
    property: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    description: "",
    paymentMethod: "",
  })

  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([])

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

      return `DEP-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`
    }

    setFormData(prev => ({ ...prev, reference: generateReferenceNumber() }))
  }, [])

  useEffect(() => {
    async function fetchTenants() {
      const companyId = localStorage.getItem("selectedCompanyId")
  
      if (!companyId) return
  
      try {
        const res = await fetch(getApiUrl(`tenants?company_id=${companyId}`), {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
  
        if (!res.ok) throw new Error("Failed to fetch tenants")
  
        const data = await res.json()

        // Flatten nested arrays and filter out empty arrays
        const flatTenants = data.flat(2).filter(Boolean)
        setAllTenants(flatTenants)
      } catch (err) {
        console.error("Error fetching tenants:", err)
        setAllTenants([])
      }
    }

    fetchTenants()
  }, [])
  
  
  useEffect(() => {
    async function fetchProperties() {
      const companyId = localStorage.getItem("selectedCompanyId")
  
      if (!companyId) return
  
      try {
        const res = await fetch(getApiUrl(`properties?company_id=${companyId}`), {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
  
        if (!res.ok) throw new Error("Failed to fetch properties")
  
        const data = await res.json()
  
        // Flatten the nested arrays and remove any empty arrays
        const flatProperties = data.flat().filter(Boolean)
        setProperties(flatProperties)
      } catch (err) {
        console.error("Error fetching properties:", err)
        setProperties([])
      }
    }

    fetchProperties()
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
    async function fetchIncomeCategories() {
      const companyId = localStorage.getItem("selectedCompanyId")
  
      if (!companyId) return
  
      try {
        const res = await fetch(getApiUrl(`categories?company_id=${companyId}&type=income`), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
  
        if (!res.ok) throw new Error("Failed to fetch income categories")
  
        const data = await res.json()
        if (data.success) {
          setIncomeCategories(data.categories)
        }
      } catch (err) {
        console.error("Error fetching income categories:", err)
      }
    }
  
    fetchIncomeCategories()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()

    // Basic validation example
    if (
      !formData.amount ||
      !formData.account ||
      !formData.date ||
      !formData.paymentMethod
    ) {
      toast.error("Please fill in all required fields: Amount, Account, Date, and Payment Method.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch(getApiUrl("deposits"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          account_id: formData.account,
          tenant_id: formData.tenant || null,
          property_id: formData.property || null,
          category_id: formData.category || null,
          transaction_date: formData.date,
          reference_number: formData.reference,
          description: formData.description,
          payment_method_id: formData.paymentMethod,
          company_id: localStorage.getItem("selectedCompanyId"),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "Failed to save deposit")
      }

      const data = await res.json()
      toast.success("Deposit saved successfully! Deposit ID: " + data.deposit_id)

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
        return `DEP-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`
      })()

      setFormData({
        amount: "",
        account: "",
        tenant: "",
        property: "",
        category: "",
        date: new Date().toISOString().split("T")[0],
        reference: newRefNumber,
        description: "",
        paymentMethod: "",
      })
    } catch (err) {
      toast.error("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Deposit</h2>
          <p className="text-muted-foreground">Record a new deposit transaction</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deposit Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Wrap inputs inside a form */}
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
                  placeholder="Enter deposit amount"
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

            {/* Account & Payment Method */}
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
                    <SelectItem value="4">Rental Income Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    <SelectItem value="4">EFT</SelectItem>
                    <SelectItem value="5">Debit Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(incomeCategories) && incomeCategories.length === 0 ? (
                    <SelectItem value="none" disabled>No categories available</SelectItem>
                  ) : (
                    incomeCategories.map((category) => (
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

            {/* Reference Number */}
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter transaction description"
                rows={3}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                className="bg-blue-500 hover:bg-blue-600"
                type="submit"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Deposit"}
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
                    return `DEP-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`
                  })()

                  setFormData({
                    amount: "",
                    account: "",
                    tenant: "",
                    property: "",
                    category: "",
                    date: new Date().toISOString().split("T")[0],
                    reference: newRefNumber,
                    description: "",
                    paymentMethod: "",
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
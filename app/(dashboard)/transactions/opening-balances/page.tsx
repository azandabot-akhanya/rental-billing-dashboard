"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, Download, Upload, Search, Calculator, TrendingUp, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"

interface Tenant {
  tenant_id: number
  full_name: string
  property_id?: number
}

interface Property {
  property_id: number
  property_name: string
}

interface OpeningBalance {
  opening_balance_id: number
  company_id: number
  tenant_id: number
  property_id: number | null
  conversion_date: string
  financial_year: number
  opening_balance: number
  outstanding_rent: number
  outstanding_utilities: number
  outstanding_other: number
  advance_payments: number
  notes: string | null
  tenant_name?: string
  property_name?: string
}

export default function OpeningBalancesPage() {
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingBalance, setEditingBalance] = useState<OpeningBalance | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Form state
  const [formData, setFormData] = useState({
    tenant_id: "",
    property_id: "",
    conversion_date: new Date().toISOString().split("T")[0],
    financial_year: new Date().getFullYear(),
    opening_balance: 0,
    outstanding_rent: 0,
    outstanding_utilities: 0,
    outstanding_other: 0,
    advance_payments: 0,
    notes: ""
  })

  const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") || "1" : "1"

  useEffect(() => {
    fetchOpeningBalances()
    fetchTenants()
    fetchProperties()
  }, [])

  const fetchOpeningBalances = async () => {
    try {
      setLoading(true)
      const res = await fetch(getApiUrl(`opening-balances/list?company_id=${companyId}`))
      const data = await res.json()

      if (data.success) {
        setOpeningBalances(data.opening_balances || [])
      }
    } catch (error) {
      console.error("Error fetching opening balances:", error)
      toast.error("Failed to fetch opening balances")
    } finally {
      setLoading(false)
    }
  }

  const fetchTenants = async () => {
    try {
      const res = await fetch(getApiUrl(`tenants?company_id=${companyId}`))
      const data = await res.json()
      setTenants(Array.isArray(data) ? data.flat() : [])
    } catch (error) {
      console.error("Error fetching tenants:", error)
    }
  }

  const fetchProperties = async () => {
    try {
      const res = await fetch(getApiUrl(`properties?company_id=${companyId}`))
      const data = await res.json()
      setProperties(Array.isArray(data) ? data.flat() : [])
    } catch (error) {
      console.error("Error fetching properties:", error)
    }
  }

  const checkDuplicateBalance = () => {
    const exists = openingBalances.find(
      b => b.tenant_id.toString() === formData.tenant_id &&
           b.financial_year === formData.financial_year &&
           (!editingBalance || b.opening_balance_id !== editingBalance.opening_balance_id)
    )
    return exists
  }

  const handleSave = async () => {
    if (!formData.tenant_id || !formData.conversion_date) {
      toast.error("Please select a tenant and conversion date")
      return
    }

    // Check for duplicates
    if (checkDuplicateBalance()) {
      toast.error("This tenant already has an opening balance for this financial year")
      return
    }

    try {
      setSaving(true)

      // Calculate the actual opening balance
      const calculatedBalance = calculateTotal()
      const finalOpeningBalance = formData.opening_balance !== 0
        ? formData.opening_balance
        : calculatedBalance

      const payload = {
        company_id: parseInt(companyId),
        tenant_id: parseInt(formData.tenant_id),
        property_id: formData.property_id ? parseInt(formData.property_id) : null,
        conversion_date: formData.conversion_date,
        financial_year: formData.financial_year,
        opening_balance: finalOpeningBalance,
        outstanding_rent: parseFloat(formData.outstanding_rent.toString()) || 0,
        outstanding_utilities: parseFloat(formData.outstanding_utilities.toString()) || 0,
        outstanding_other: parseFloat(formData.outstanding_other.toString()) || 0,
        advance_payments: parseFloat(formData.advance_payments.toString()) || 0,
        notes: formData.notes,
        created_by: "user"
      }

      const url = editingBalance
        ? getApiUrl(`opening-balances/tenant/${editingBalance.opening_balance_id}`)
        : getApiUrl("opening-balances/tenant")

      const method = editingBalance ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (data.success) {
        toast.success(editingBalance ? "Opening balance updated!" : "Opening balance created!")
        setOpenDialog(false)
        resetForm()
        fetchOpeningBalances()
      } else {
        throw new Error(data.message || "Failed to save opening balance")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error saving opening balance")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (balance: OpeningBalance) => {
    setEditingBalance(balance)
    setFormData({
      tenant_id: balance.tenant_id.toString(),
      property_id: balance.property_id?.toString() || "",
      conversion_date: balance.conversion_date,
      financial_year: balance.financial_year,
      opening_balance: balance.opening_balance,
      outstanding_rent: balance.outstanding_rent,
      outstanding_utilities: balance.outstanding_utilities,
      outstanding_other: balance.outstanding_other,
      advance_payments: balance.advance_payments,
      notes: balance.notes || ""
    })
    setOpenDialog(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this opening balance?")) return

    try {
      setDeleting(id)
      const res = await fetch(getApiUrl(`opening-balances/tenant/${id}`), {
        method: "DELETE"
      })

      const data = await res.json()

      if (data.success) {
        toast.success("Opening balance deleted!")
        fetchOpeningBalances()
      } else {
        throw new Error(data.message || "Failed to delete")
      }
    } catch (error) {
      toast.error("Error deleting opening balance")
    } finally {
      setDeleting(null)
    }
  }

  const handleTenantChange = (tenantId: string) => {
    const tenant = tenants.find(t => t.tenant_id.toString() === tenantId)
    setFormData({
      ...formData,
      tenant_id: tenantId,
      property_id: tenant?.property_id?.toString() || formData.property_id
    })
  }

  const resetForm = () => {
    setFormData({
      tenant_id: "",
      property_id: "",
      conversion_date: new Date().toISOString().split("T")[0],
      financial_year: new Date().getFullYear(),
      opening_balance: 0,
      outstanding_rent: 0,
      outstanding_utilities: 0,
      outstanding_other: 0,
      advance_payments: 0,
      notes: ""
    })
    setEditingBalance(null)
  }

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const calculateTotal = () => {
    const rent = parseFloat(formData.outstanding_rent?.toString()) || 0
    const utilities = parseFloat(formData.outstanding_utilities?.toString()) || 0
    const other = parseFloat(formData.outstanding_other?.toString()) || 0
    const advance = parseFloat(formData.advance_payments?.toString()) || 0
    return rent + utilities + other - advance
  }

  const filteredBalances = openingBalances.filter(balance =>
    balance.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    balance.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    balance.conversion_date.includes(searchTerm)
  )

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Balance B/F (Brought Forward)</h2>
          <p className="text-muted-foreground">Manage opening balances for tenants</p>
        </div>
        <Button onClick={() => { resetForm(); setOpenDialog(true) }} className="bg-blue-500 hover:bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Opening Balance
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            What is Balance B/F?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800">
            <strong>Balance Brought Forward (B/F)</strong> is the closing balance from one accounting period that becomes the opening balance for the next period.
            Use this feature when backdating your system or migrating from another platform. The opening balance represents all outstanding amounts (rent, utilities, etc.)
            that tenants owed as of your conversion date (e.g., March 1, 2025).
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tenant, property, or date..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Opening Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Opening Balances</CardTitle>
          <CardDescription>
            {filteredBalances.length} opening balance{filteredBalances.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filteredBalances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No opening balances found. Click "Add Opening Balance" to create one.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Conversion Date</TableHead>
                  <TableHead className="text-right">Rent Arrears</TableHead>
                  <TableHead className="text-right">Utilities</TableHead>
                  <TableHead className="text-right">Other</TableHead>
                  <TableHead className="text-right">Advance</TableHead>
                  <TableHead className="text-right">Total B/F</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.map((balance) => (
                  <TableRow key={balance.opening_balance_id}>
                    <TableCell className="font-medium">{balance.tenant_name}</TableCell>
                    <TableCell>{balance.property_name || "-"}</TableCell>
                    <TableCell>{balance.conversion_date}</TableCell>
                    <TableCell className="text-right">{formatCurrency(balance.outstanding_rent)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(balance.outstanding_utilities)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(balance.outstanding_other)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(balance.advance_payments)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(balance.opening_balance)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(balance)} disabled={deleting === balance.opening_balance_id}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDelete(balance.opening_balance_id)} disabled={deleting === balance.opening_balance_id}>
                          {deleting === balance.opening_balance_id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBalance ? "Edit Opening Balance" : "Create Opening Balance"}</DialogTitle>
            <DialogDescription>
              Enter the opening balance details for the tenant as of the conversion date
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tenant *</Label>
                <Select value={formData.tenant_id} onValueChange={handleTenantChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.tenant_id} value={tenant.tenant_id.toString()}>
                        {tenant.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Property</Label>
                <Select value={formData.property_id || undefined} onValueChange={(val) => setFormData({ ...formData, property_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.property_id} value={property.property_id.toString()}>
                        {property.property_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conversion Date *</Label>
                <Input
                  type="date"
                  value={formData.conversion_date}
                  onChange={(e) => setFormData({ ...formData, conversion_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">The date from which you start tracking in this system</p>
              </div>

              <div className="space-y-2">
                <Label>Financial Year *</Label>
                <Input
                  type="number"
                  value={formData.financial_year}
                  onChange={(e) => setFormData({ ...formData, financial_year: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Balance Breakdown
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Outstanding Rent (R)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.outstanding_rent}
                    onChange={(e) => setFormData({ ...formData, outstanding_rent: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Outstanding Utilities (R)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.outstanding_utilities}
                    onChange={(e) => setFormData({ ...formData, outstanding_utilities: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Other Outstanding (R)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.outstanding_other}
                    onChange={(e) => setFormData({ ...formData, outstanding_other: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Advance Payments (R)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.advance_payments}
                    onChange={(e) => setFormData({ ...formData, advance_payments: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Credits/prepayments to subtract</p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-blue-900">Calculated Opening Balance:</span>
                  <span className="text-2xl font-bold text-blue-600">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label>Manual Opening Balance Override (R)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                  placeholder="Leave as 0 to use calculated total"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Enter a specific amount to override the calculated balance
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this opening balance..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenDialog(false); resetForm() }} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-blue-500 hover:bg-blue-600" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>{editingBalance ? "Update" : "Create"} Opening Balance</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"

interface Category {
  category_id: number
  company_id: number
  name: string
  type: 'income' | 'expense'
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Supplier {
  supplier_id: number
  company_id: number
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  bank_details: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CategoryFormData {
  name: string
  type: 'income' | 'expense'
  description: string
}

interface SupplierFormData {
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  bank_details: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("categories")
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: "",
    type: "income",
    description: ""
  })

  const [supplierForm, setSupplierForm] = useState<SupplierFormData>({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    bank_details: ""
  })

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "categories") {
      fetchCategories()
    } else {
      fetchSuppliers()
    }
  }, [activeTab])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) {
        toast.error("No company selected")
        return
      }

      const res = await fetch(getApiUrl(`categories?company_id=${companyId}`))
      if (!res.ok) throw new Error("Failed to fetch categories")
      
      const data = await res.json()
      if (data.success) {
        setCategories(data.categories)
      } else {
        toast.error(data.message || "Failed to fetch categories")
      }
    } catch (err) {
      toast.error("Failed to fetch categories")
      console.error("Error fetching categories:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) {
        toast.error("No company selected")
        return
      }

      const res = await fetch(getApiUrl(`suppliers?company_id=${companyId}`))
      if (!res.ok) throw new Error("Failed to fetch suppliers")
      
      const data = await res.json()
      if (data.success) {
        setSuppliers(data.suppliers)
      } else {
        toast.error(data.message || "Failed to fetch suppliers")
      }
    } catch (err) {
      toast.error("Failed to fetch suppliers")
      console.error("Error fetching suppliers:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) {
        toast.error("No company selected")
        return
      }

      const url = editingCategory 
        ? getApiUrl(`categories/${editingCategory.category_id}`)
        : getApiUrl("categories")

      const method = editingCategory ? "PUT" : "POST"

      const payload = editingCategory
        ? { ...categoryForm, is_active: true }
        : { ...categoryForm, company_id: parseInt(companyId) }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to save category")

      toast.success(editingCategory ? "Category updated successfully!" : "Category created successfully!")
      setIsCategoryModalOpen(false)
      setEditingCategory(null)
      setCategoryForm({ name: "", type: "income", description: "" })
      fetchCategories()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save category")
    }
  }

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) {
        toast.error("No company selected")
        return
      }

      const url = editingSupplier 
        ? getApiUrl(`suppliers/${editingSupplier.supplier_id}`)
        : getApiUrl("suppliers")

      const method = editingSupplier ? "PUT" : "POST"

      const payload = editingSupplier
        ? { ...supplierForm, is_active: true }
        : { ...supplierForm, company_id: parseInt(companyId) }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to save supplier")

      toast.success(editingSupplier ? "Supplier updated successfully!" : "Supplier created successfully!")
      setIsSupplierModalOpen(false)
      setEditingSupplier(null)
      setSupplierForm({ name: "", contact_person: "", email: "", phone: "", address: "", bank_details: "" })
      fetchSuppliers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save supplier")
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      type: category.type,
      description: category.description || ""
    })
    setIsCategoryModalOpen(true)
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setSupplierForm({
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      bank_details: supplier.bank_details || ""
    })
    setIsSupplierModalOpen(true)
  }

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("Are you sure you want to delete this category? This action cannot be undone.")) return

    try {
      const res = await fetch(getApiUrl(`categories/${categoryId}`), {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete category")

      toast.success("Category deleted successfully")
      fetchCategories()
    } catch (error) {
      toast.error("Failed to delete category")
      console.error("Delete error:", error)
    }
  }

  const handleDeleteSupplier = async (supplierId: number) => {
    if (!confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) return

    try {
      const res = await fetch(getApiUrl(`suppliers/${supplierId}`), {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete supplier")

      toast.success("Supplier deleted successfully")
      fetchSuppliers()
    } catch (error) {
      toast.error("Failed to delete supplier")
      console.error("Delete error:", error)
    }
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTypeBadge = (type: string) => {
    return type === 'income' 
      ? <Badge className="bg-green-100 text-green-800">Income</Badge>
      : <Badge className="bg-red-100 text-red-800">Expense</Badge>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products & Services</h2>
          <p className="text-muted-foreground">Manage system products and services configuration</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Income/Expense Accounts</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Income & Expense Accounts</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search categories..."
                    className="w-[300px] pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={() => setIsCategoryModalOpen(true)} className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Account
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading categories...</p>
              ) : filteredCategories.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchTerm ? "No categories found matching your search" : "No categories found. Create your first category."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((category) => (
                      <TableRow key={category.category_id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{getTypeBadge(category.type)}</TableCell>
                        <TableCell>{category.description || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.category_id)}
                            >
                              <Trash2 className="w-4 h-4" />
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
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Suppliers</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search suppliers..."
                    className="w-[300px] pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={() => setIsSupplierModalOpen(true)} className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Supplier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading suppliers...</p>
              ) : filteredSuppliers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchTerm ? "No suppliers found matching your search" : "No suppliers found. Create your first supplier."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.supplier_id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.contact_person || "-"}</TableCell>
                        <TableCell>{supplier.email || "-"}</TableCell>
                        <TableCell>{supplier.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={supplier.is_active ? "default" : "secondary"}>
                            {supplier.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSupplier(supplier)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSupplier(supplier.supplier_id)}
                            >
                              <Trash2 className="w-4 h-4" />
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
        </TabsContent>
      </Tabs>

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Account" : "Create New Account"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update the account details" : "Add a new income or expense account"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name *</Label>
                <Input
                  id="name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g., Rental Income, Utilities"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Account Type *</Label>
                <Select
                  value={categoryForm.type}
                  onValueChange={(value: 'income' | 'expense') => setCategoryForm({ ...categoryForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Optional description of this account"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCategoryModalOpen(false)
                  setEditingCategory(null)
                  setCategoryForm({ name: "", type: "income", description: "" })
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
                {editingCategory ? "Update Account" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Modal */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Create New Supplier"}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? "Update the supplier details" : "Add a new supplier for expenses"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSupplierSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplierName">Supplier Name *</Label>
                <Input
                  id="supplierName"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="e.g., ABC Maintenance, XYZ Supplies"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={supplierForm.contact_person}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                  placeholder="Contact person name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  placeholder="supplier@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="Physical address"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankDetails">Bank Details</Label>
                <Textarea
                  id="bankDetails"
                  value={supplierForm.bank_details}
                  onChange={(e) => setSupplierForm({ ...supplierForm, bank_details: e.target.value })}
                  placeholder="Bank account details for payments"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsSupplierModalOpen(false)
                  setEditingSupplier(null)
                  setSupplierForm({ name: "", contact_person: "", email: "", phone: "", address: "", bank_details: "" })
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
                {editingSupplier ? "Update Supplier" : "Create Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
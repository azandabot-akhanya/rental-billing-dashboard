"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Building2, Plus, Pencil, Trash2, Home, Users, DollarSign, TrendingUp, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"

interface Company {
  company_id: number
  company_name: string
  address?: string
  contact_number?: string
  email?: string
  banking_details?: string
}

interface CompanyStats {
  propertiesCount: number
  tenantsCount: number
  totalRevenue: string
  activeInvoices: number
}

export default function CompanySelectPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyStats, setCompanyStats] = useState<{ [key: number]: CompanyStats }>({})
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState<{ [key: number]: boolean }>({})
  const [error, setError] = useState<string | null>(null)
  const [openModal, setOpenModal] = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [deleteCompanyId, setDeleteCompanyId] = useState<number | null>(null)
  const router = useRouter()

  // Form fields
  const [companyName, setCompanyName] = useState("")
  const [address, setAddress] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [email, setEmail] = useState("")
  const [bankingDetails, setBankingDetails] = useState("")

  // Fetch companies
  const fetchCompanies = async () => {
    try {
      setLoading(true)

      // Wait for client-side hydration
      if (typeof window === 'undefined') return

      const token = localStorage.getItem("authToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(getApiUrl("companies"), {
        headers: { "Authorization": `Bearer ${token}` },
      })

      if (!response.ok) throw new Error("Failed to fetch companies")

      const data = await response.json()
      const normalizedCompanies = Array.isArray(data)
        ? data.flat().filter(Boolean)
        : []

      setCompanies(normalizedCompanies)

      // Fetch stats for each company
      normalizedCompanies.forEach((company: Company) => {
        fetchCompanyStats(company.company_id)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      toast.error("Failed to load companies")
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats for a specific company
  const fetchCompanyStats = async (companyId: number) => {
    try {
      setStatsLoading(prev => ({ ...prev, [companyId]: true }))

      // Fetch properties
      const propertiesRes = await fetch(getApiUrl(`properties?company_id=${companyId}`))
      const propertiesData = await propertiesRes.json()
      const properties = Array.isArray(propertiesData) ? propertiesData.flat() : []

      // Fetch tenants
      const tenantsRes = await fetch(getApiUrl(`tenants?company_id=${companyId}`))
      const tenantsData = await tenantsRes.json()
      const tenants = Array.isArray(tenantsData) ? tenantsData.flat().filter(Boolean) : []

      // Fetch dashboard data for revenue
      const dashboardRes = await fetch(getApiUrl(`dashboard?company_id=${companyId}`))
      const dashboardData = await dashboardRes.json()
      const totalRevenue = dashboardData.data?.stats?.[0]?.incomeThisMonth || "R 0.00"

      // Fetch invoices
      const invoicesRes = await fetch(getApiUrl(`invoices?company_id=${companyId}`))
      const invoicesData = await invoicesRes.json()
      const invoices = invoicesData.invoices || []
      const activeInvoices = invoices.filter((inv: any) => inv.status !== 'paid' && inv.status !== 'cancelled').length

      setCompanyStats(prev => ({
        ...prev,
        [companyId]: {
          propertiesCount: properties.length,
          tenantsCount: tenants.length,
          totalRevenue,
          activeInvoices
        }
      }))
    } catch (err) {
      console.error(`Failed to fetch stats for company ${companyId}:`, err)
      setCompanyStats(prev => ({
        ...prev,
        [companyId]: {
          propertiesCount: 0,
          tenantsCount: 0,
          totalRevenue: "R 0.00",
          activeInvoices: 0
        }
      }))
    } finally {
      setStatsLoading(prev => ({ ...prev, [companyId]: false }))
    }
  }

  useEffect(() => {
    fetchCompanies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle Save (Create or Edit)
  const handleSaveCompany = async () => {
    if (!companyName.trim()) {
      toast.error("Company name is required")
      return
    }

    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        router.push("/login")
        return
      }

      const url = editCompany
        ? getApiUrl(`companies/${editCompany.company_id}`)
        : getApiUrl("companies")

      const method = editCompany ? "PUT" : "POST"

      const payload = {
        company_name: companyName,
        address: address,
        contact_number: contactNumber,
        email: email,
        banking_details: bankingDetails
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      // Check for success - 200, 201 are both valid, or check data.message
      if (!response.ok && response.status !== 201) {
        throw new Error(data.message || "Failed to save company")
      }

      toast.success(editCompany ? "Company updated!" : "Company created!")
      setOpenModal(false)
      setEditCompany(null)
      resetForm()
      fetchCompanies()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  // Handle Delete Company
  const handleDeleteCompany = async () => {
    if (!deleteCompanyId) return

    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(getApiUrl(`companies/${deleteCompanyId}`), {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to delete company")

      toast.success("Company deleted successfully!")
      setDeleteCompanyId(null)
      fetchCompanies()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete company")
    }
  }

  const handleSelectCompany = (company: Company) => {
    localStorage.setItem("selectedCompanyId", company.company_id.toString())
    localStorage.setItem("companyName", company.company_name)
    router.push("/dashboard")
  }

  const resetForm = () => {
    setCompanyName("")
    setAddress("")
    setContactNumber("")
    setEmail("")
    setBankingDetails("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading companies...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-red-500">
        <div className="text-center">
          <p className="mb-4">{error}</p>
          <Button onClick={fetchCompanies} className="bg-blue-500 hover:bg-blue-600">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
            <Building2 className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Select Your Company</h1>
          <p className="text-gray-600 text-lg">Choose which business you want to manage today</p>
        </div>

        {companies.length === 0 ? (
          <div className="text-center">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Companies Yet</h3>
                <p className="text-gray-600 mb-6">Get started by creating your first company</p>
                <Button
                  className="bg-blue-500 hover:bg-blue-600"
                  onClick={() => setOpenModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Company
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => {
              const stats = companyStats[company.company_id]
              const loading = statsLoading[company.company_id]

              return (
                <Card key={company.company_id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-400">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl mb-1">{company.company_name}</CardTitle>
                          {company.address && (
                            <p className="text-xs text-gray-500">{company.address}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Stats Grid */}
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      </div>
                    ) : stats ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Home className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-gray-600">Properties</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-600">{stats.propertiesCount}</p>
                        </div>

                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-gray-600">Tenants</span>
                          </div>
                          <p className="text-2xl font-bold text-green-600">{stats.tenantsCount}</p>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-3 col-span-2">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-purple-600" />
                            <span className="text-xs text-gray-600">Monthly Revenue</span>
                          </div>
                          <p className="text-xl font-bold text-purple-600">{stats.totalRevenue}</p>
                        </div>

                        {stats.activeInvoices > 0 && (
                          <div className="bg-yellow-50 rounded-lg p-3 col-span-2">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="w-4 h-4 text-yellow-600" />
                              <span className="text-xs text-gray-600">Active Invoices</span>
                            </div>
                            <p className="text-xl font-bold text-yellow-600">{stats.activeInvoices}</p>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Contact Info */}
                    {(company.email || company.contact_number) && (
                      <div className="pt-2 border-t space-y-1">
                        {company.email && (
                          <p className="text-xs text-gray-600">📧 {company.email}</p>
                        )}
                        {company.contact_number && (
                          <p className="text-xs text-gray-600">📞 {company.contact_number}</p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleSelectCompany(company)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600"
                      >
                        Select
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setEditCompany(company)
                          setCompanyName(company.company_name)
                          setAddress(company.address || "")
                          setContactNumber(company.contact_number || "")
                          setEmail(company.email || "")
                          setBankingDetails(company.banking_details || "")
                          setOpenModal(true)
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteCompanyId(company.company_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <Button
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 shadow-2xl"
        onClick={() => {
          setEditCompany(null)
          resetForm()
          setOpenModal(true)
        }}
      >
        <Plus className="w-8 h-8" />
      </Button>

      {/* Create/Edit Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCompany ? "Edit Company" : "Create New Company"}</DialogTitle>
            <DialogDescription>
              {editCompany ? "Update your company information" : "Add a new company to your account"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name *</label>
              <Input
                placeholder="e.g., Acme Properties Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                placeholder="123 Main Street, City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Number</label>
              <Input
                placeholder="+27 12 345 6789"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                placeholder="info@company.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Banking Details</label>
              <Input
                placeholder="Bank Name, Account Number"
                value={bankingDetails}
                onChange={(e) => setBankingDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpenModal(false)} variant="outline">Cancel</Button>
            <Button onClick={handleSaveCompany} className="bg-blue-500 hover:bg-blue-600">
              {editCompany ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteCompanyId !== null} onOpenChange={() => setDeleteCompanyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this company and all associated data including properties, tenants, invoices, and transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompany}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Company
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

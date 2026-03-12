"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Users,
  FileText,
  Calendar,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap
} from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getApiUrl } from "@/lib/api-config"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface DashboardStats {
  totalProperties: number
  totalTenants: number
  occupancyRate: number
  totalIncome: string
  totalExpenses: string
  netIncome: string
  pendingInvoices: number
  upcomingEvents: number
}

interface PropertyStatus {
  occupied: number
  vacant: number
  maintenance: number
}

interface RecentActivity {
  id: number
  type: string
  description: string
  amount?: string
  date: string
  icon: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalTenants: 0,
    occupancyRate: 0,
    totalIncome: "R 0.00",
    totalExpenses: "R 0.00",
    netIncome: "R 0.00",
    pendingInvoices: 0,
    upcomingEvents: 0
  })
  const [propertyStatus, setPropertyStatus] = useState<PropertyStatus>({
    occupied: 0,
    vacant: 0,
    maintenance: 0
  })
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState("")
  const router = useRouter()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const companyId = localStorage.getItem("selectedCompanyId")
        if (!companyId) {
          router.push("/company-select")
          return
        }

        setCompanyName(localStorage.getItem("companyName") || "Your Business")

        // Fetch properties
        const propertiesRes = await fetch(getApiUrl(`properties?company_id=${companyId}`))
        const propertiesData = await propertiesRes.json()
        const properties = Array.isArray(propertiesData) ? propertiesData.flat() : []

        // Fetch tenants
        const tenantsRes = await fetch(getApiUrl(`tenants?company_id=${companyId}`))
        const tenantsData = await tenantsRes.json()
        const tenants = Array.isArray(tenantsData) ? tenantsData.flat().filter(Boolean) : []

        // Fetch invoices
        const invoicesRes = await fetch(getApiUrl(`invoices?company_id=${companyId}`))
        const invoicesData = await invoicesRes.json()
        const invoices = invoicesData.invoices || []
        const pendingInvoices = invoices.filter((inv: any) => inv.status !== 'paid' && inv.status !== 'cancelled').length

        // Fetch dashboard stats
        const dashboardRes = await fetch(getApiUrl(`dashboard?company_id=${companyId}`))
        const dashboardData = await dashboardRes.json()

        // Calculate stats
        const totalIncome = dashboardData.data?.stats?.[0]?.incomeThisMonth || "R 0.00"
        const totalExpenses = dashboardData.data?.stats?.[0]?.expenseThisMonth || "R 0.00"
        const income = parseFloat(totalIncome.replace(/[R,\s]/g, '')) || 0
        const expenses = parseFloat(totalExpenses.replace(/[R,\s]/g, '')) || 0
        const netIncome = income - expenses

        const occupancyRate = properties.length > 0 ? Math.round((tenants.length / properties.length) * 100) : 0

        setStats({
          totalProperties: properties.length,
          totalTenants: tenants.length,
          occupancyRate,
          totalIncome,
          totalExpenses,
          netIncome: `R ${netIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          pendingInvoices,
          upcomingEvents: 0
        })

        setPropertyStatus({
          occupied: tenants.length,
          vacant: Math.max(0, properties.length - tenants.length),
          maintenance: 0
        })

        // Prepare monthly data
        const cashFlow = dashboardData.data?.cashFlow?.flat?.().filter(Boolean) || []
        setMonthlyData(cashFlow.map((item: any) => ({
          month: item.month || '',
          income: Number(item.income) || 0,
          expense: Number(item.expense) || 0,
          net: (Number(item.income) || 0) - (Number(item.expense) || 0)
        })))

        // Recent activities
        const latestIncome = dashboardData.data?.latestIncome?.flat?.().filter(Boolean) || []
        const latestExpenses = dashboardData.data?.latestExpenses?.flat?.().filter(Boolean) || []

        const activities: RecentActivity[] = [
          ...latestIncome.slice(0, 3).map((item: any, idx: number) => ({
            id: idx,
            type: 'income',
            description: item.description || 'Income',
            amount: item.amount,
            date: item.date,
            icon: 'income'
          })),
          ...latestExpenses.slice(0, 3).map((item: any, idx: number) => ({
            id: idx + 100,
            type: 'expense',
            description: item.description || 'Expense',
            amount: item.amount,
            date: item.date,
            icon: 'expense'
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)

        setRecentActivities(activities)
        setLoading(false)
      } catch (err) {
        console.error("Dashboard fetch error:", err)
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const propertyChartData = [
    { name: 'Occupied', value: propertyStatus.occupied, color: '#10b981' },
    { name: 'Vacant', value: propertyStatus.vacant, color: '#ef4444' },
    { name: 'Maintenance', value: propertyStatus.maintenance, color: '#f59e0b' }
  ].filter(item => item.value > 0)

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Welcome Back!</h2>
          <p className="text-muted-foreground mt-1">Here's what's happening with {companyName} today</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/income/invoices/new")}>
            <FileText className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => router.push("/tenants/add")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Properties */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
                <h3 className="text-3xl font-bold mt-2">{stats.totalProperties}</h3>
                <p className="text-xs text-muted-foreground mt-1">{stats.occupancyRate}% occupied</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Home className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Tenants */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Tenants</p>
                <h3 className="text-3xl font-bold mt-2">{stats.totalTenants}</h3>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  All active
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Income</p>
                <h3 className="text-2xl font-bold mt-2">{stats.totalIncome}</h3>
                <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  This month
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Income */}
        <Card className={`hover:shadow-lg transition-shadow border-l-4 ${stats.netIncome.includes('-') ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Income</p>
                <h3 className="text-2xl font-bold mt-2">{stats.netIncome}</h3>
                <p className={`text-xs mt-1 flex items-center gap-1 ${stats.netIncome.includes('-') ? 'text-red-600' : 'text-emerald-600'}`}>
                  {stats.netIncome.includes('-') ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                  Income - Expenses
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${stats.netIncome.includes('-') ? 'bg-red-100' : 'bg-emerald-100'}`}>
                <TrendingUp className={`h-6 w-6 ${stats.netIncome.includes('-') ? 'text-red-600' : 'text-emerald-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common tasks to manage your rental business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => router.push("/properties/add")}>
              <Home className="w-5 h-5" />
              <span className="text-xs">Add Property</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => router.push("/tenants/add")}>
              <Users className="w-5 h-5" />
              <span className="text-xs">Add Tenant</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => router.push("/income/invoices/new")}>
              <FileText className="w-5 h-5" />
              <span className="text-xs">Create Invoice</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => router.push("/expenses/expense")}>
              <DollarSign className="w-5 h-5" />
              <span className="text-xs">Add Expense</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => router.push("/calendar")}>
              <Calendar className="w-5 h-5" />
              <span className="text-xs">Schedule Event</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => router.push("/reports/statements")}>
              <Eye className="w-5 h-5" />
              <span className="text-xs">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
            <CardDescription>Income vs Expenses over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => `R ${Number(value).toLocaleString()}`}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Income" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available yet. Start adding income and expenses!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Status */}
        <Card>
          <CardHeader>
            <CardTitle>Property Status</CardTitle>
            <CardDescription>Overview of your property portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between h-[300px]">
              {propertyChartData.length > 0 ? (
                <>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={propertyChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {propertyChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-3">
                    {propertyChartData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.value} properties</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-center text-muted-foreground">
                  No properties added yet. Add your first property to get started!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Activity & Alerts */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Activity */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${activity.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {activity.type === 'income' ? (
                          <ArrowUpRight className={`h-5 w-5 text-green-600`} />
                        ) : (
                          <ArrowDownRight className={`h-5 w-5 text-red-600`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(activity.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`font-semibold ${activity.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.type === 'income' ? '+' : '-'}{activity.amount}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No recent activity. Your transactions will appear here.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Important notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.pendingInvoices > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-yellow-900">{stats.pendingInvoices} Pending Invoice{stats.pendingInvoices !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-yellow-700">Review and follow up on unpaid invoices</p>
                  </div>
                </div>
              )}

              {stats.occupancyRate === 100 && stats.totalProperties > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-green-900">100% Occupancy</p>
                    <p className="text-xs text-green-700">All properties are currently occupied</p>
                  </div>
                </div>
              )}

              {stats.occupancyRate < 100 && stats.totalProperties > 0 && propertyStatus.vacant > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-blue-900">{propertyStatus.vacant} Vacant Propert{propertyStatus.vacant !== 1 ? 'ies' : 'y'}</p>
                    <p className="text-xs text-blue-700">Consider marketing these properties</p>
                  </div>
                </div>
              )}

              {stats.totalProperties === 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-purple-900">Get Started</p>
                    <p className="text-xs text-purple-700">Add your first property to begin</p>
                    <Button size="sm" className="mt-2 bg-purple-600 hover:bg-purple-700" onClick={() => router.push("/properties/add")}>
                      Add Property
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

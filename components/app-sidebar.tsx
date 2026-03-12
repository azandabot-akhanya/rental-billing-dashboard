"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2, ChevronDown, ChevronRight, CreditCard, Home, Receipt, TrendingUp, Users, RefreshCw
} from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubButton, SidebarMenuSubItem
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
]

const propertiesItems = [
  { title: "Add Property", url: "/properties/add" },
  { title: "List Properties", url: "/properties" },
]

const tenantsItems = [
  { title: "Add Tenant", url: "/tenants/add" },
  { title: "List Tenants", url: "/tenants" },
  // { title: "Groups", url: "/tenants/groups" },
]

const salesItems = [
  { title: "Invoices", url: "/income/invoices" },
  { title: "New Recurring Invoice", url: "/income/invoices/recurring" },
  { title: "New Invoice", url: "/income/invoices/new" },
  { title: "Products & Services", url: "/income/services/" }
  // { title: "Quotes", url: "/income/quotes" },
  // { title: "Create New Quote", url: "/income/quotes/new" },
  // { title: "Payments", url: "/income/payments" },
]

const transactionItems = [
  { title: "New Deposit", url: "/transactions/deposit" },
  // { title: "New Expense", url: "/transactions/expense" },
  { title: "Receipts", url: "/transactions/transactions" },
  // { title: "View Transactions", url: "/transactions" },
]

const expenseItems = [
  // { title: "New Deposit", url: "/transactions/deposit" },
  { title: "New Expense", url: "/expenses/expense" },
  { title: "Payments", url: "/expenses/payments" },
  { title: "Products & Services", url: "/income/services/" }
]

const reportsItems = [
  { title: "Tenant Statement", url: "/reports/statements" },
  { title: "Supplier Statement", url: "/reports/expenses" },
  { title: "Opening Balances (B/F)", url: "/transactions/opening-balances" },
  { title: "Profit & Loss Statement", url: "/reports/income-vs-expenses" },
  // { title: "Trial Balance Sheet", url: "/reports/all-income" },
  { title: "General Ledger", url: "/reports/income" },
  // { title: "All Expenses", url: "/reports/all-expenses" },
  // { title: "All Transactions", url: "/reports/all-transactions" },
]

const prepaidItems = [
  { title: "Electricity", url: "/prepaid/electricity" },
  { title: "Water", url: "/prepaid/water" },
  // { title: "Meter Readings Electrcity", url: "/transactions/balance" },
  // { title: "Meter Readings Water", url: "/reports/income-vs-expenses" },
  { title: "Electricty Report", url: "/prepaid/report/electricity" },
  { title: "Water Report", url: "/prepaid/report/water" },
  // { title: "All Expenses", url: "/reports/all-expenses" },
  // { title: "All Transactions", url: "/reports/all-transactions" },
]

const stockItems = [
  { title: "Stock received ", url: "/stock/received" },
  { title: "Stock Issued", url: "/stock/issued" },
  { title: "Total Stock Report", url: "/stock/report/total-stock" },
  { title: "Stock Report (Suppliers)", url: "/stock/report/suppliers" },
  { title: "Stock Report (Property/Tenant)", url: "/stock/report/tenants" },
]

const tenantDocumentsaItems = [
  { title: "Documents ", url: "/documents" },
]

const calendartItems = [
  { title: "Calendar", url: "/calendar" }
]

// const settingsItems = [
//   // { title: "Settings", url: "/settings/" }
// ]

export function AppSidebar() {
  const pathname = usePathname()

  const allSections: { [key: string]: { items: { url: string }[] } } = {
    tenants: { items: tenantsItems },
    sales: { items: salesItems },
    expenses: { items: expenseItems },
    transactions: { items: transactionItems },
    reports: { items: reportsItems },
    prepaid: { items: prepaidItems },
    stock: { items: stockItems },
    tenantDouments: { items: tenantDocumentsaItems },
    calendar: { items: calendartItems },
    // settings: { items: settingsItems },
  }

  // Open section if current pathname is inside it
  const [openSections, setOpenSections] = useState<string[]>(
    Object.keys(allSections).filter(section =>
      allSections[section].items.some(item => item.url === pathname)
    )
  )

  const toggleSection = (section: string) => {
    setOpenSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section])
  }

  const isActive = (url: string) => pathname === url

  return (
    <Sidebar className="border-r border-gray-200" variant="sidebar">
      <SidebarHeader className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg">ThynkX Pro</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-slate-800 text-white">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Main Menu */}
              {menuItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className={`hover:text-white hover:bg-slate-700 ${isActive(item.url) ? "bg-green-600 text-white" : "text-gray-300"}`}>
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Properties Section */}
              <Collapsible open={openSections.includes("tenants")} onOpenChange={() => toggleSection("tenants")}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-gray-300 hover:text-white hover:bg-slate-700">
                      <Building2 className="w-4 h-4" />
                      <span>Properties</span>
                      {openSections.includes("tenants") ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {propertiesItems.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild className={`hover:text-white ${isActive(item.url) ? "bg-green-600 text-white" : "text-gray-400"}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Tenants Section */}
              <Collapsible open={openSections.includes("tenants")} onOpenChange={() => toggleSection("tenants")}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-gray-300 hover:text-white hover:bg-slate-700">
                      <Users className="w-4 h-4" />
                      <span>Tenants</span>
                      {openSections.includes("tenants") ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {tenantsItems.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild className={`hover:text-white ${isActive(item.url) ? "bg-green-600 text-white" : "text-gray-400"}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Sales Section */}
              <Collapsible open={openSections.includes("sales")} onOpenChange={() => toggleSection("sales")}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-gray-300 hover:text-white hover:bg-slate-700">
                      <Receipt className="w-4 h-4" />
                      <span>Income</span>
                      {openSections.includes("sales") ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {salesItems.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild className={`hover:text-white ${isActive(item.url) ? "bg-green-600 text-white" : "text-gray-400"}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Expenses Section */}
              <Collapsible open={openSections.includes("expenses")} onOpenChange={() => toggleSection("expenses")}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-gray-300 hover:text-white hover:bg-slate-700">
                      <Receipt className="w-4 h-4" />
                      <span>Expenses</span>
                      {openSections.includes("expenses") ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {expenseItems.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild className={`hover:text-white ${isActive(item.url) ? "bg-green-600 text-white" : "text-gray-400"}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Transactions Section */}
              <Collapsible open={openSections.includes("transactions")} onOpenChange={() => toggleSection("transactions")}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-gray-300 hover:text-white hover:bg-slate-700">
                      <CreditCard className="w-4 h-4" />
                      <span>Transactions</span>
                      {openSections.includes("transactions") ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {transactionItems.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild className={`hover:text-white ${isActive(item.url) ? "bg-green-600 text-white" : "text-gray-400"}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Reports Section */}
              <Collapsible open={openSections.includes("reports")} onOpenChange={() => toggleSection("reports")}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-gray-300 hover:text-white hover:bg-slate-700">
                      <TrendingUp className="w-4 h-4" />
                      <span>Reports</span>
                      {openSections.includes("reports") ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {reportsItems.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild className={`hover:text-white ${isActive(item.url) ? "bg-green-600 text-white" : "text-gray-400"}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Prepaid Section */}
              <Collapsible open={openSections.includes("prepaid")} onOpenChange={() => toggleSection("prepaid")}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-gray-300 hover:text-white hover:bg-slate-700">
                      <TrendingUp className="w-4 h-4" />
                      <span>Prepaid</span>
                      {openSections.includes("prepaid") ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {prepaidItems.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild className={`hover:text-white ${isActive(item.url) ? "bg-green-600 text-white" : "text-gray-400"}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Stock Section */}
              <Collapsible open={openSections.includes("stock")} onOpenChange={() => toggleSection("stock")}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-gray-300 hover:text-white hover:bg-slate-700">
                      <TrendingUp className="w-4 h-4" />
                      <span>Stock/Invetory</span>
                      {openSections.includes("stock") ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {stockItems.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild className={`hover:text-white ${isActive(item.url) ? "bg-green-600 text-white" : "text-gray-400"}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Tenant Documents */}
              <Collapsible open={openSections.includes("tenantDouments")} onOpenChange={() => toggleSection("tenantDouments")}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-gray-300 hover:text-white hover:bg-slate-700">
                      <TrendingUp className="w-4 h-4" />
                      <span>Tenant Documents</span>
                      {openSections.includes("tenantDouments") ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {tenantDocumentsaItems.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild className={`hover:text-white ${isActive(item.url) ? "bg-green-600 text-white" : "text-gray-400"}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Calendar */}
              <Collapsible open={openSections.includes("calendar")} onOpenChange={() => toggleSection("calendar")}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-gray-300 hover:text-white hover:bg-slate-700">
                      <TrendingUp className="w-4 h-4" />
                      <span>Calendar</span>
                      {openSections.includes("calendar") ? <ChevronDown className="ml-auto w-4 h-4" /> : <ChevronRight className="ml-auto w-4 h-4" />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {calendartItems.map(item => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild className={`hover:text-white ${isActive(item.url) ? "bg-green-600 text-white" : "text-gray-400"}`}>
                            <Link href={item.url}>{item.title}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-slate-800 border-t border-slate-700 p-4">
        <div className="space-y-2">
          {/* Switch Company Button */}
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-slate-700"
            onClick={() => {
              window.location.href = "/company-select"
            }}
          >
            <RefreshCw className="w-4 h-4 mr-3" />
            <span className="text-sm">Switch Company</span>
          </Button>

          {/* User Account Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-slate-700">
                <Avatar className="w-8 h-8 mr-3">
                  <AvatarFallback className="bg-blue-500 text-white">A</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Administrator</span>
                  <span className="text-xs text-gray-400">My Account</span>
                </div>
                <ChevronDown className="ml-auto w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => {
                  localStorage.clear()
                  sessionStorage.clear()
                  window.location.href = "/login"
                }}
                className="text-red-600 focus:text-red-600"
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

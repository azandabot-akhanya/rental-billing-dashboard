"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { QueryClientProvider } from "@tanstack/react-query"
import { QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Loader2 } from "lucide-react"

// 1. Create query client instance
const queryClient = new QueryClient()

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check authentication on mount
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem("authToken")
      const companyId = localStorage.getItem("selectedCompanyId")

      if (!token) {
        router.push("/login")
        return
      }

      if (!companyId) {
        router.push("/company-select")
        return
      }

      setIsAuthenticated(true)
      setIsAuthChecking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    // 2. Wrap the entire layout with QueryClientProvider
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>

      {/* 3. Optional but recommended: Devtools for debugging queries */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
 
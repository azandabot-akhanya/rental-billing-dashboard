"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Edit, Trash2, Eye } from "lucide-react"
import Link from "next/link"
import jsPDF from "jspdf"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"

interface Transaction {
  // API returns these field names
  id?: number
  type?: 'deposit' | 'expense'
  date?: string
  reference?: string
  // Legacy field names (keep for compatibility)
  transaction_id?: number
  transaction_type?: 'deposit' | 'expense'
  transaction_date?: string
  reference_number?: string
  // Common fields
  amount: number
  description: string
  account_name: string
  property_name: string
  unit_number: string
  tenant_name: string
  vendor_name: string
  category_name: string
  payment_method: string
  created_at: string
  updated_at: string
}

interface TransactionFormData {
  amount: string
  account_id: string
  property_id: string
  unit_id: string
  tenant_id: string
  vendor_id: string
  category_id: string
  payment_method_id: string
  reference_number: string
  description: string
  transaction_date: string
}

export default function TransactionsPage() {
  const tableRef = useRef<HTMLDivElement>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [viewReceiptUrl, setViewReceiptUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<TransactionFormData>({
    amount: "",
    account_id: "",
    property_id: "",
    unit_id: "",
    tenant_id: "",
    vendor_id: "",
    category_id: "",
    payment_method_id: "",
    reference_number: "",
    description: "",
    transaction_date: new Date().toISOString().split("T")[0]
  })

  // Fetch transactions from API
  useEffect(() => {
    fetchTransactions()
  }, [])

  useEffect(() => {
    filterTransactions()
  }, [transactions, activeTab, searchTerm])

  const fetchTransactions = async () => {
    setLoading(true)
    setError(null)
    try {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) {
        setError("No company selected")
        return
      }
  
      const res = await fetch(getApiUrl(`transactions?company_id=${companyId}`))
      if (!res.ok) throw new Error("Failed to fetch transactions")
      
      const data = await res.json()
      if (data.success) {
        // Convert amount strings to numbers
        const transactionsWithNumbers = data.transactions.map((transaction: any) => ({
          ...transaction,
          amount: typeof transaction.amount === 'string' 
            ? parseFloat(transaction.amount) 
            : transaction.amount
        }));
        setTransactions(transactionsWithNumbers)
      } else {
        setError(data.message || "Failed to fetch transactions")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions")
      toast.error("Failed to fetch transactions")
    } finally {
      setLoading(false)
    }
  }

  const filterTransactions = () => {
    let filtered = transactions

    // Filter by tab - API returns 'type' not 'transaction_type'
    if (activeTab === "deposits") {
      filtered = filtered.filter(t => (t.type || t.transaction_type) === 'deposit')
    } else if (activeTab === "expenses") {
      filtered = filtered.filter(t => (t.type || t.transaction_type) === 'expense')
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(t =>
        t.reference_number.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        t.account_name.toLowerCase().includes(term) ||
        (t.tenant_name && t.tenant_name.toLowerCase().includes(term)) ||
        (t.vendor_name && t.vendor_name.toLowerCase().includes(term)) ||
        t.category_name.toLowerCase().includes(term)
      )
    }

    setFilteredTransactions(filtered)
  }

  const handleViewClick = async (transaction: Transaction) => {
    try {
      setSelectedTransaction(transaction)
      toast.info("Loading receipt...")

      // Get company name from localStorage or use default
      const companyId = localStorage.getItem("selectedCompanyId")
      let companyName = "ThynkXPro"

      // Try to get company name if we have company data
      try {
        const companyRes = await fetch(getApiUrl(`companies/${companyId}`))
        const companyData = await companyRes.json()
        if (companyData.success && companyData.company) {
          companyName = companyData.company.name || "ThynkXPro"
        }
      } catch (e) {
        // Use default company name
      }

      // API returns 'type' not 'transaction_type'
      const txnType = transaction.type || transaction.transaction_type
      const txnDate = transaction.date || transaction.transaction_date
      const txnRef = transaction.reference || transaction.reference_number

      // Build receipt data from transaction
      const receiptData = {
        company_name: companyName,
        reference_number: txnRef || `${txnType?.toUpperCase()}-${transaction.id || transaction.transaction_id}`,
        amount: transaction.amount,
        transaction_date: txnDate || new Date().toISOString(),
        tenant_name: transaction.tenant_name,
        vendor_name: transaction.vendor_name,
        property_name: transaction.property_name,
        unit_number: transaction.unit_number,
        payment_method: transaction.payment_method,
        account_name: transaction.account_name,
        category_name: transaction.category_name,
        description: transaction.description
      }

      // Generate PDF client-side and create blob URL for viewing
      const pdfBlobUrl = generateReceiptPDFForView(receiptData, txnType as 'deposit' | 'expense')
      setViewReceiptUrl(pdfBlobUrl)
      setIsViewModalOpen(true)
      toast.success("Receipt loaded successfully")
    } catch (error) {
      console.error("Error loading receipt:", error)
      toast.error("Failed to load receipt")
    }
  }

  const handleDownloadClick = async (transaction: Transaction) => {
    try {
      toast.info("Generating receipt PDF...")

      // Get company name from localStorage or use default
      const companyId = localStorage.getItem("selectedCompanyId")
      let companyName = "ThynkXPro"

      // Try to get company name if we have company data
      try {
        const companyRes = await fetch(getApiUrl(`companies/${companyId}`))
        const companyData = await companyRes.json()
        if (companyData.success && companyData.company) {
          companyName = companyData.company.name || "ThynkXPro"
        }
      } catch (e) {
        // Use default company name
      }

      // API returns 'type' not 'transaction_type'
      const txnType = transaction.type || transaction.transaction_type
      const txnDate = transaction.date || transaction.transaction_date
      const txnRef = transaction.reference || transaction.reference_number

      // Build receipt data from transaction
      const receiptData = {
        company_name: companyName,
        reference_number: txnRef || `${txnType?.toUpperCase()}-${transaction.id || transaction.transaction_id}`,
        amount: transaction.amount,
        transaction_date: txnDate || new Date().toISOString(),
        tenant_name: transaction.tenant_name,
        vendor_name: transaction.vendor_name,
        property_name: transaction.property_name,
        unit_number: transaction.unit_number,
        payment_method: transaction.payment_method,
        account_name: transaction.account_name,
        category_name: transaction.category_name,
        description: transaction.description
      }

      // Generate PDF client-side (like invoices do)
      generateReceiptPDF(receiptData, txnType as 'deposit' | 'expense')
      toast.success("Receipt PDF downloaded successfully")
    } catch (error) {
      console.error("Error generating receipt PDF:", error)
      toast.error("Failed to generate receipt PDF")
    }
  }

  const generateReceiptPDF = (data: any, type: 'deposit' | 'expense') => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 0

    // Professional Header - Blue Banner
    doc.setFillColor(91, 91, 255) // #5B5BFF
    doc.rect(0, 0, pageWidth, 40, 'F')

    // Company Name
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(data.company_name || 'Company Name', pageWidth / 2, 20, { align: 'center' })

    // Document Title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    const receiptTitle = type === 'deposit' ? 'Deposit Receipt' : 'Expense Receipt'
    doc.text(receiptTitle, pageWidth / 2, 32, { align: 'center' })

    yPos = 50

    // Receipt Number Badge
    doc.setFillColor(255, 255, 255, 0.2)
    const refText = `Receipt #: ${data.reference_number}`
    const refWidth = doc.getTextWidth(refText)
    doc.roundedRect((pageWidth - refWidth - 10) / 2, yPos, refWidth + 10, 8, 3, 3, 'F')
    doc.setFontSize(10)
    doc.text(refText, pageWidth / 2, yPos + 6, { align: 'center' })

    yPos = 70

    // Amount Section - Green for deposit, Red for expense
    const amountColor = type === 'deposit' ? [16, 185, 129] : [239, 68, 68]
    doc.setFillColor(amountColor[0], amountColor[1], amountColor[2])
    doc.roundedRect(14, yPos, pageWidth - 28, 30, 4, 4, 'F')

    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    const amountLabel = type === 'deposit' ? 'Amount Received' : 'Amount Paid'
    doc.text(amountLabel, pageWidth / 2, yPos + 10, { align: 'center' })

    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    const amount = `R ${parseFloat(data.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    doc.text(amount, pageWidth / 2, yPos + 24, { align: 'center' })

    yPos = 115

    // Info Boxes
    doc.setFillColor(248, 249, 250)
    doc.setDrawColor(91, 91, 255)
    doc.setLineWidth(0.5)

    // Left box - Received From / Paid To
    const boxWidth = (pageWidth - 34) / 2
    doc.roundedRect(14, yPos, boxWidth, 35, 4, 4, 'FD')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(91, 91, 255)
    const boxLabel = type === 'deposit' ? 'RECEIVED FROM' : 'PAID TO'
    doc.text(boxLabel, 18, yPos + 6)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    const name = data.tenant_name || data.vendor_name || 'N/A'
    doc.text(`Name: ${name}`, 18, yPos + 14)
    doc.text(`Property: ${data.property_name || 'N/A'}`, 18, yPos + 21)
    doc.text(`Unit: ${data.unit_number || 'N/A'}`, 18, yPos + 28)

    // Right box - Transaction Details
    doc.roundedRect(pageWidth / 2 + 3, yPos, boxWidth, 35, 4, 4, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(91, 91, 255)
    doc.text('TRANSACTION DETAILS', pageWidth / 2 + 7, yPos + 6)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    const transDate = new Date(data.transaction_date).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    })
    doc.text(`Date: ${transDate}`, pageWidth / 2 + 7, yPos + 14)
    const transTime = new Date(data.transaction_date).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    })
    doc.text(`Time: ${transTime}`, pageWidth / 2 + 7, yPos + 21)

    // Type badge
    const badgeColor = type === 'deposit' ? [209, 250, 229] : [254, 226, 226]
    const badgeTextColor = type === 'deposit' ? [6, 95, 70] : [153, 27, 27]
    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2])
    doc.setTextColor(badgeTextColor[0], badgeTextColor[1], badgeTextColor[2])
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    const typeText = type === 'deposit' ? 'Deposit' : 'Expense'
    doc.roundedRect(pageWidth / 2 + 7 + 37, yPos + 23, 20, 5, 2, 2, 'F')
    doc.text(typeText, pageWidth / 2 + 7 + 47, yPos + 27, { align: 'center' })

    yPos = 165

    // Payment Information
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Payment Information', 14, yPos)

    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.5)
    doc.line(14, yPos + 2, pageWidth - 14, yPos + 2)

    yPos += 10

    const detailRows = [
      ['Payment Method:', data.payment_method || 'N/A'],
      ['Account:', data.account_name || 'N/A'],
      ['Category:', data.category_name || 'N/A'],
      ['Reference Number:', data.reference_number || 'N/A']
    ]

    if (data.description) {
      detailRows.push(['Description:', data.description])
    }

    doc.setFontSize(10)
    detailRows.forEach((row, index) => {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128)
      doc.text(row[0], 14, yPos + (index * 10))

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(31, 41, 55)
      doc.text(row[1], pageWidth - 14, yPos + (index * 10), { align: 'right' })

      if (index < detailRows.length - 1) {
        doc.setDrawColor(243, 244, 246)
        doc.line(14, yPos + (index * 10) + 3, pageWidth - 14, yPos + (index * 10) + 3)
      }
    })

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 25

    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.5)
    doc.line(14, yPos, pageWidth - 14, yPos)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text(data.company_name || '', pageWidth / 2, yPos + 6, { align: 'center' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text('Thank you for your business!', pageWidth / 2, yPos + 12, { align: 'center' })

    const generatedDate = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    })
    const generatedTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    })
    doc.text(`This receipt was generated on ${generatedDate} at ${generatedTime}`, pageWidth / 2, yPos + 17, { align: 'center' })

    doc.setFont('helvetica', 'italic')
    doc.text('Generated with ThynkXPro', pageWidth / 2, yPos + 22, { align: 'center' })

    // Save the PDF
    const filename = `${type}-receipt-${data.reference_number}.pdf`
    doc.save(filename)
  }

  // Generate PDF for viewing in modal (returns blob URL)
  const generateReceiptPDFForView = (data: any, type: 'deposit' | 'expense'): string => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 0

    // Professional Header - Blue Banner
    doc.setFillColor(91, 91, 255) // #5B5BFF
    doc.rect(0, 0, pageWidth, 40, 'F')

    // Company Name
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(data.company_name || 'Company Name', pageWidth / 2, 20, { align: 'center' })

    // Document Title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    const receiptTitle = type === 'deposit' ? 'Deposit Receipt' : 'Expense Receipt'
    doc.text(receiptTitle, pageWidth / 2, 32, { align: 'center' })

    yPos = 50

    // Receipt Number Badge
    doc.setFillColor(200, 200, 255)
    const refText = `Receipt #: ${data.reference_number}`
    const refWidth = doc.getTextWidth(refText)
    doc.roundedRect((pageWidth - refWidth - 10) / 2, yPos, refWidth + 10, 8, 3, 3, 'F')
    doc.setFontSize(10)
    doc.setTextColor(91, 91, 255)
    doc.text(refText, pageWidth / 2, yPos + 6, { align: 'center' })

    yPos = 70

    // Amount Section - Green for deposit, Red for expense
    const amountColor = type === 'deposit' ? [16, 185, 129] : [239, 68, 68]
    doc.setFillColor(amountColor[0], amountColor[1], amountColor[2])
    doc.roundedRect(14, yPos, pageWidth - 28, 30, 4, 4, 'F')

    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    const amountLabel = type === 'deposit' ? 'Amount Received' : 'Amount Paid'
    doc.text(amountLabel, pageWidth / 2, yPos + 10, { align: 'center' })

    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    const amount = `R ${parseFloat(data.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    doc.text(amount, pageWidth / 2, yPos + 24, { align: 'center' })

    yPos = 115

    // Info Boxes
    doc.setFillColor(248, 249, 250)
    doc.setDrawColor(91, 91, 255)
    doc.setLineWidth(0.5)

    // Left box - Received From / Paid To
    const boxWidth = (pageWidth - 34) / 2
    doc.roundedRect(14, yPos, boxWidth, 35, 4, 4, 'FD')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(91, 91, 255)
    const boxLabel = type === 'deposit' ? 'RECEIVED FROM' : 'PAID TO'
    doc.text(boxLabel, 18, yPos + 6)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    const name = data.tenant_name || data.vendor_name || 'N/A'
    doc.text(`Name: ${name}`, 18, yPos + 14)
    doc.text(`Property: ${data.property_name || 'N/A'}`, 18, yPos + 21)
    doc.text(`Unit: ${data.unit_number || 'N/A'}`, 18, yPos + 28)

    // Right box - Transaction Details
    doc.roundedRect(pageWidth / 2 + 3, yPos, boxWidth, 35, 4, 4, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(91, 91, 255)
    doc.text('TRANSACTION DETAILS', pageWidth / 2 + 7, yPos + 6)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    const transDate = new Date(data.transaction_date).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    })
    doc.text(`Date: ${transDate}`, pageWidth / 2 + 7, yPos + 14)
    const transTime = new Date(data.transaction_date).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    })
    doc.text(`Time: ${transTime}`, pageWidth / 2 + 7, yPos + 21)

    // Type badge
    const badgeColor = type === 'deposit' ? [209, 250, 229] : [254, 226, 226]
    const badgeTextColor = type === 'deposit' ? [6, 95, 70] : [153, 27, 27]
    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2])
    doc.setTextColor(badgeTextColor[0], badgeTextColor[1], badgeTextColor[2])
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    const typeText = type === 'deposit' ? 'Deposit' : 'Expense'
    doc.roundedRect(pageWidth / 2 + 7 + 37, yPos + 23, 20, 5, 2, 2, 'F')
    doc.text(typeText, pageWidth / 2 + 7 + 47, yPos + 27, { align: 'center' })

    yPos = 165

    // Payment Information
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Payment Information', 14, yPos)

    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.5)
    doc.line(14, yPos + 2, pageWidth - 14, yPos + 2)

    yPos += 10

    const detailRows = [
      ['Payment Method:', data.payment_method || 'N/A'],
      ['Account:', data.account_name || 'N/A'],
      ['Category:', data.category_name || 'N/A'],
      ['Reference Number:', data.reference_number || 'N/A']
    ]

    if (data.description) {
      detailRows.push(['Description:', data.description])
    }

    doc.setFontSize(10)
    detailRows.forEach((row, index) => {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128)
      doc.text(row[0], 14, yPos + (index * 10))

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(31, 41, 55)
      doc.text(row[1], pageWidth - 14, yPos + (index * 10), { align: 'right' })

      if (index < detailRows.length - 1) {
        doc.setDrawColor(243, 244, 246)
        doc.line(14, yPos + (index * 10) + 3, pageWidth - 14, yPos + (index * 10) + 3)
      }
    })

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 25

    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.5)
    doc.line(14, yPos, pageWidth - 14, yPos)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text(data.company_name || '', pageWidth / 2, yPos + 6, { align: 'center' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text('Thank you for your business!', pageWidth / 2, yPos + 12, { align: 'center' })

    const generatedDate = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    })
    const generatedTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    })
    doc.text(`This receipt was generated on ${generatedDate} at ${generatedTime}`, pageWidth / 2, yPos + 17, { align: 'center' })

    doc.setFont('helvetica', 'italic')
    doc.text('Generated with ThynkXPro', pageWidth / 2, yPos + 22, { align: 'center' })

    // Return blob URL for viewing in iframe
    const pdfBlob = doc.output('blob')
    return URL.createObjectURL(pdfBlob)
  }

  const handleEditClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setFormData({
      amount: transaction.amount.toString(),
      account_id: "",
      property_id: "",
      unit_id: "",
      tenant_id: "",
      vendor_id: "",
      category_id: "",
      payment_method_id: "",
      reference_number: transaction.reference_number,
      description: transaction.description,
      transaction_date: transaction.transaction_date
    })
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = async (transaction: Transaction) => {
    if (!confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) return

    try {
      const endpoint = transaction.transaction_type === 'deposit' 
        ? getApiUrl(`deposits/${transaction.transaction_id}`)
        : getApiUrl(`expenses/${transaction.transaction_id}`)

      const res = await fetch(endpoint, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete transaction")

      toast.success("Transaction deleted successfully")
      fetchTransactions() // Refresh the list
    } catch (error) {
      toast.error("Failed to delete transaction")
      console.error("Delete error:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTransaction) return

    setIsSubmitting(true)
    try {
      const endpoint = selectedTransaction.transaction_type === 'deposit'
        ? getApiUrl(`deposits/${selectedTransaction.transaction_id}`)
        : getApiUrl(`expenses/${selectedTransaction.transaction_id}`)

      const payload = {
        amount: parseFloat(formData.amount),
        account_id: formData.account_id || null,
        property_id: formData.property_id || null,
        unit_id: formData.unit_id || null,
        tenant_id: formData.tenant_id || null,
        vendor_id: formData.vendor_id || null,
        category_id: formData.category_id || null,
        payment_method_id: formData.payment_method_id || null,
        reference_number: formData.reference_number,
        description: formData.description,
        transaction_date: formData.transaction_date
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "Failed to update transaction")
      }

      toast.success("Transaction updated successfully")
      setIsEditModalOpen(false)
      setSelectedTransaction(null)
      fetchTransactions() // Refresh the list
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `R ${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getTypeBadge = (type: string | undefined) => {
    return type === 'deposit'
      ? <Badge className="bg-green-100 text-green-800">Deposit</Badge>
      : <Badge className="bg-red-100 text-red-800">Expense</Badge>
  }

  // Helper to get correct field values from API response
  const getTxnId = (t: Transaction) => t.id || t.transaction_id
  const getTxnType = (t: Transaction) => t.type || t.transaction_type
  const getTxnDate = (t: Transaction) => t.date || t.transaction_date
  const getTxnRef = (t: Transaction) => t.reference || t.reference_number

  async function exportPdf() {
    if (!tableRef.current || filteredTransactions.length === 0) return
  
    const companyId = localStorage.getItem("selectedCompanyId") || "N/A"
  
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    })
  
    const pageWidth = doc.internal.pageSize.getWidth()
  
    // HEADER
    doc.setFillColor(37, 99, 235) // ThynkxPro blue
    doc.rect(0, 0, pageWidth, 50, "F") // blue bar at top
    doc.setFontSize(20)
    doc.setTextColor(255, 255, 255)
    doc.text("ThynkxPro", 40, 32)
  
    // Subheader: Property info
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(
      `Property: ${filteredTransactions[0]?.property_name || "N/A"} | Transaction List`,
      40,
      70
    )
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 160, 70)
  
    // TABLE HEADERS
    const headers = [
      "Date",
      "Type",
      "Description",
      "Reference",
      "Amount",
      "Account",
      "Category",
      "Property",
      "Tenant/Vendor",
    ]
  
    const startY = 90
    const rowHeight = 20
    let y = startY
  
    // Draw header background
    doc.setFillColor(37, 99, 235)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    headers.forEach((header, i) => {
      doc.rect(40 + i * 60, y, 60, rowHeight, "F")
      doc.text(header, 42 + i * 60, y + 14)
    })
    y += rowHeight
  
    // Reset text color for rows
    doc.setTextColor(0)
  
    filteredTransactions.forEach((t, index) => {
      if (y + rowHeight > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage()
        y = startY
      }
  
      const row = [
        new Date(t.transaction_date).toLocaleDateString(),
        t.transaction_type.charAt(0).toUpperCase() + t.transaction_type.slice(1),
        t.description || "N/A",
        t.reference_number || "N/A",
        t.amount.toFixed(2),
        t.account_name || "N/A",
        t.category_name || "N/A",
        t.property_name || "N/A",
        t.transaction_type === "deposit" ? t.tenant_name || "N/A" : t.vendor_name || "N/A",
      ]
  
      row.forEach((cell, i) => {
        doc.rect(40 + i * 60, y, 60, rowHeight) // cell border
        doc.text(cell.toString(), 42 + i * 60, y + 14)
      })
  
      y += rowHeight
    })
  
    doc.save(`Transactions_${filteredTransactions[0]?.property_name || "List"}.pdf`)
  }
  

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">Manage all financial transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPdf} disabled={loading || transactions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <div className="flex gap-2">
            <Link href="/transactions/deposit">
              <Button variant="outline" className="bg-green-500 hover:bg-green-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Deposit
              </Button>
            </Link>
            <Link href="/transactions/expense">
              <Button variant="outline" className="bg-red-500 hover:bg-red-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Expense
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {loading && <p>Loading transactions...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Transactions</CardTitle>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="w-[300px] pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="deposits">Deposits</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
            </TabsList>
          </Tabs>

          <div ref={tableRef}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>{activeTab === 'expenses' ? 'Vendor' : 'Tenant'}</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredTransactions.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}

                {filteredTransactions.map((transaction) => (
                  <TableRow key={`${getTxnType(transaction)}-${getTxnId(transaction)}`}>
                    <TableCell>{formatDate(getTxnDate(transaction))}</TableCell>
                    <TableCell>{getTypeBadge(getTxnType(transaction))}</TableCell>
                    <TableCell>{transaction.description || 'N/A'}</TableCell>
                    <TableCell>{getTxnRef(transaction) || 'N/A'}</TableCell>
                    <TableCell className={getTxnType(transaction) === 'deposit' ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>{transaction.account_name || 'N/A'}</TableCell>
                    <TableCell>{transaction.category_name || 'N/A'}</TableCell>
                    <TableCell>{transaction.property_name || 'N/A'}</TableCell>
                    <TableCell>
                      {getTxnType(transaction) === 'deposit'
                        ? transaction.tenant_name || 'N/A'
                        : transaction.vendor_name || 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClick(transaction)}
                          title="View Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadClick(transaction)}
                          title="Download Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(transaction)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(transaction)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Transaction Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {selectedTransaction?.transaction_type === 'deposit' ? 'Deposit' : 'Expense'}
            </DialogTitle>
            <DialogDescription>
              Update the transaction details
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_date">Date *</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method_id">Payment Method</Label>
                <Select
                  value={formData.payment_method_id}
                  onValueChange={(value) => setFormData({ ...formData, payment_method_id: value })}
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

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setSelectedTransaction(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isSubmitting ? "Updating..." : "Update Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Receipt Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>
              {(selectedTransaction?.type || selectedTransaction?.transaction_type) === "deposit" ? "Deposit" : "Expense"} Receipt
            </DialogTitle>
            <DialogDescription>
              Receipt for {selectedTransaction?.type || selectedTransaction?.transaction_type} - {selectedTransaction?.reference || selectedTransaction?.reference_number || `#${selectedTransaction?.id || selectedTransaction?.transaction_id}`}
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[70vh] overflow-auto p-6">
            {viewReceiptUrl && (
              <iframe
                src={viewReceiptUrl}
                className="w-full h-full border-0 rounded"
                title="Receipt Preview"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 p-6 pt-0 border-t">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedTransaction) {
                  handleDownloadClick(selectedTransaction)
                }
              }}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
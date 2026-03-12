"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Edit, Trash2, Eye, Send } from "lucide-react"
import Link from "next/link"
import jsPDF from "jspdf"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"

interface Invoice {
  invoice_id: number
  invoice_number: string
  tenant_id: number
  unit_id: number | null
  invoice_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  status: "draft" | "sent" | "paid" | "unpaid" | "overdue" | "cancelled"
  notes: string | null
  include_banking_details: string | null
  created_at: string
  updated_at: string
  items: InvoiceItem[]
  tenant_name?: string
  property_name?: string
  unit_name?: string
}

interface InvoiceItem {
  item_id: number
  description: string
  quantity: number
  rate: number
  amount: number
  created_at: string
}

interface InvoiceFormData {
  invoice_number: string
  tenant_id: number
  unit_id: number | null
  invoice_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  status: "draft" | "sent" | "paid" | "unpaid" | "overdue" | "cancelled"
  notes: string
  include_banking_details: string
  items: InvoiceItem[]
}

export default function InvoicesPage() {
  const tableRef = useRef<HTMLDivElement>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [viewInvoiceUrl, setViewInvoiceUrl] = useState<string>("")
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoice_number: "",
    tenant_id: 0,
    unit_id: null,
    invoice_date: "",
    due_date: "",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    amount_paid: 0,
    status: "unpaid",
    notes: "",
    include_banking_details: "",
    items: []
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch invoices from API
  useEffect(() => {
    fetchInvoices()
  }, [])

  const formatCurrency = (amount: any) => {
    if (amount === null || amount === undefined || amount === '') {
      return 'R 0.00';
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

    if (isNaN(numAmount)) {
      return 'R 0.00';
    }

    return `R ${numAmount.toFixed(2)}`;
  };

  const fetchInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const companyId = localStorage.getItem("selectedCompanyId")
      if (!companyId) {
        setError("No company selected")
        return
      }

      const res = await fetch(getApiUrl(`invoices?company_id=${companyId}`))
      if (!res.ok) throw new Error("Failed to fetch invoices")

      const data = await res.json()
      if (data.success) {
        setInvoices(data.invoices)
      } else {
        setError(data.message || "Failed to fetch invoices")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch invoices")
      toast.error("Failed to fetch invoices")
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoiceDetails = async (invoiceId: number) => {
    try {
      const res = await fetch(getApiUrl(`invoices/${invoiceId}`))
      if (!res.ok) throw new Error("Failed to fetch invoice details")
      const data = await res.json()
      return data.invoice
    } catch (error) {
      toast.error("Failed to fetch invoice details")
      throw error
    }
  }

  const handleViewClick = async (invoice: Invoice) => {
    try {
      setSelectedInvoice(invoice)
      toast.info("Loading invoice...")

      // Fetch full invoice details to generate PDF client-side
      const invoiceDetails = await fetchInvoiceDetails(invoice.invoice_id)

      if (invoiceDetails) {
        // Generate PDF client-side and create blob URL for viewing
        const pdfBlobUrl = generateInvoicePDFForView(invoiceDetails)
        setViewInvoiceUrl(pdfBlobUrl)
        setIsViewModalOpen(true)
        toast.success("Invoice loaded successfully")
      } else {
        toast.error("Failed to load invoice preview")
      }
    } catch (error) {
      console.error("Error loading invoice:", error)
      toast.error("Failed to load invoice")
    }
  }

  const handleDownloadClick = async (invoice: Invoice) => {
    try {
      toast.info("Generating PDF...")

      // Fetch the full invoice details
      const invoiceDetails = await fetchInvoiceDetails(invoice.invoice_id)

      if (invoiceDetails) {
        generateInvoicePDF(invoiceDetails)
        toast.success("Invoice PDF downloaded successfully")
      } else {
        // Fallback to HTML version
        const pdfRes = await fetch(getApiUrl(`invoices/${invoice.invoice_id}/pdf`))
        const pdfData = await pdfRes.json()

        if (pdfData.success) {
          const fullPdfUrl = pdfData.pdf_url.startsWith('http')
            ? pdfData.pdf_url
            : `https://thynkxpro-dpl.co.za${pdfData.pdf_url.startsWith('/') ? pdfData.pdf_url : `/${pdfData.pdf_url}`}`
          window.open(fullPdfUrl, '_blank')
          toast.success("Invoice opened in new tab")
        } else {
          toast.error("Failed to generate PDF")
        }
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    }
  }

  const generateInvoicePDF = (invoice: any) => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 0

    // Professional Header - Purple/Blue Banner
    doc.setFillColor(79, 70, 229) // #4F46E5
    doc.rect(0, 0, pageWidth, 40, 'F')

    // Company Name
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(invoice.company_name || 'Company Name', 20, 15)

    // Company Details
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.company_address || '', 20, 22)
    doc.text(`Tel: ${invoice.company_phone || ''}`, 20, 27)
    doc.text(`Email: ${invoice.company_email || ''}`, 20, 32)

    // INVOICE Title on right
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', pageWidth - 20, 20, { align: 'right' })

    // Invoice meta on right
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Invoice #: ${invoice.invoice_number}`, pageWidth - 20, 26, { align: 'right' })
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, pageWidth - 20, 31, { align: 'right' })
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, pageWidth - 20, 36, { align: 'right' })

    yPos = 50

    // Billing Info Boxes
    doc.setFillColor(248, 249, 250)
    doc.setDrawColor(79, 70, 229)
    doc.setLineWidth(0.5)

    const boxWidth = (pageWidth - 34) / 2

    // Bill To box
    doc.roundedRect(14, yPos, boxWidth, 30, 4, 4, 'FD')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(79, 70, 229)
    doc.text('BILL TO:', 18, yPos + 6)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(invoice.tenant_name || 'N/A', 18, yPos + 13)
    doc.text(invoice.tenant_email || '', 18, yPos + 18)
    doc.text(invoice.tenant_phone || '', 18, yPos + 23)

    // Property Details box
    doc.roundedRect(pageWidth / 2 + 3, yPos, boxWidth, 30, 4, 4, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(79, 70, 229)
    doc.text('PROPERTY DETAILS:', pageWidth / 2 + 7, yPos + 6)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(invoice.property_name || 'N/A', pageWidth / 2 + 7, yPos + 13)
    doc.text(`Unit: ${invoice.unit_number || 'N/A'}`, pageWidth / 2 + 7, yPos + 18)
    doc.text(invoice.property_address || '', pageWidth / 2 + 7, yPos + 23)

    yPos = 95

    // Line Items Table
    doc.setFillColor(248, 249, 250)
    doc.setDrawColor(79, 70, 229)
    doc.setLineWidth(0.5)

    // Table header
    const colWidths = [90, 30, 30, 32]
    const colXPositions = [14, 104, 134, 164]

    doc.setFillColor(79, 70, 229)
    doc.rect(14, yPos, pageWidth - 28, 10, 'F')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Description', 16, yPos + 7)
    doc.text('Qty', 106, yPos + 7, { align: 'center' })
    doc.text('Rate', 149, yPos + 7, { align: 'right' })
    doc.text('Amount', 194, yPos + 7, { align: 'right' })

    yPos += 10

    // Table rows
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setDrawColor(229, 231, 235)

    const items = invoice.items || []
    items.forEach((item: any, index: number) => {
      const amount = item.quantity * item.rate

      doc.text(item.description || '', 16, yPos + 7)
      doc.text(String(item.quantity), 119, yPos + 7, { align: 'center' })
      doc.text(`R ${parseFloat(item.rate).toFixed(2)}`, 149, yPos + 7, { align: 'right' })
      doc.text(`R ${amount.toFixed(2)}`, 194, yPos + 7, { align: 'right' })

      doc.line(14, yPos + 10, pageWidth - 14, yPos + 10)
      yPos += 10
    })

    yPos += 5

    // Totals section
    const totalsX = pageWidth - 80
    doc.setFont('helvetica', 'bold')

    doc.text('Subtotal:', totalsX, yPos)
    doc.text(`R ${parseFloat(invoice.subtotal || 0).toFixed(2)}`, pageWidth - 16, yPos, { align: 'right' })
    yPos += 7

    if (invoice.tax_amount && invoice.tax_amount > 0) {
      const taxRate = invoice.tax_rate || 15
      doc.text(`Tax (${taxRate}%):`, totalsX, yPos)
      doc.text(`R ${parseFloat(invoice.tax_amount).toFixed(2)}`, pageWidth - 16, yPos, { align: 'right' })
      yPos += 7
    }

    // Total Due
    doc.setFillColor(79, 70, 229)
    doc.rect(totalsX - 5, yPos - 5, 80, 12, 'F')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL DUE:', totalsX, yPos + 3)
    doc.text(`R ${parseFloat(invoice.total_amount || 0).toFixed(2)}`, pageWidth - 16, yPos + 3, { align: 'right' })

    yPos += 20

    // Payment Details (if banking details exist)
    if (invoice.banking_details && invoice.banking_details.trim()) {
      doc.setFillColor(239, 246, 255)
      doc.setDrawColor(59, 130, 246)
      doc.roundedRect(14, yPos, pageWidth - 28, 25, 4, 4, 'FD')

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 64, 175)
      doc.text('Payment Details:', 18, yPos + 6)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 58, 138)
      const bankingLines = invoice.banking_details.split('\n')
      bankingLines.forEach((line: string, index: number) => {
        doc.text(line, 18, yPos + 12 + (index * 4))
      })

      doc.text(`Payment Reference: ${invoice.invoice_number}`, 18, yPos + 12 + (bankingLines.length * 4) + 3)
      yPos += 30
    }

    // Notes (if exists)
    if (invoice.notes && invoice.notes.trim()) {
      doc.setFillColor(254, 243, 199)
      doc.setDrawColor(245, 158, 11)
      doc.roundedRect(14, yPos, pageWidth - 28, 15, 4, 4, 'FD')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(120, 53, 15)
      doc.text('Notes:', 18, yPos + 6)

      doc.setFont('helvetica', 'normal')
      doc.text(invoice.notes, 18, yPos + 11)
      yPos += 20
    }

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 20

    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.5)
    doc.line(14, yPos, pageWidth - 14, yPos)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(invoice.company_name || '', pageWidth / 2, yPos + 5, { align: 'center' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text('Thank you for your business!', pageWidth / 2, yPos + 10, { align: 'center' })

    const generatedDate = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    })
    doc.text(`This invoice was generated on ${generatedDate}`, pageWidth / 2, yPos + 14, { align: 'center' })

    doc.setFont('helvetica', 'italic')
    doc.text('Generated with ThynkXPro', pageWidth / 2, yPos + 18, { align: 'center' })

    // Save the PDF
    doc.save(`invoice-${invoice.invoice_number}.pdf`)
  }

  // Generate PDF for viewing in modal (returns blob URL)
  const generateInvoicePDFForView = (invoice: any): string => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 0

    // Professional Header - Purple/Blue Banner
    doc.setFillColor(79, 70, 229) // #4F46E5
    doc.rect(0, 0, pageWidth, 40, 'F')

    // Company Name
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(invoice.company_name || 'Company Name', 20, 15)

    // Company Details
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.company_address || '', 20, 22)
    doc.text(`Tel: ${invoice.company_phone || ''}`, 20, 27)
    doc.text(`Email: ${invoice.company_email || ''}`, 20, 32)

    // INVOICE Title on right
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', pageWidth - 20, 20, { align: 'right' })

    // Invoice meta on right
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Invoice #: ${invoice.invoice_number}`, pageWidth - 20, 26, { align: 'right' })
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, pageWidth - 20, 31, { align: 'right' })
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, pageWidth - 20, 36, { align: 'right' })

    yPos = 50

    // Billing Info Boxes
    doc.setFillColor(248, 249, 250)
    doc.setDrawColor(79, 70, 229)
    doc.setLineWidth(0.5)

    const boxWidth = (pageWidth - 34) / 2

    // Bill To box
    doc.roundedRect(14, yPos, boxWidth, 30, 4, 4, 'FD')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(79, 70, 229)
    doc.text('BILL TO:', 18, yPos + 6)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(invoice.tenant_name || 'N/A', 18, yPos + 13)
    doc.text(invoice.tenant_email || '', 18, yPos + 18)
    doc.text(invoice.tenant_phone || '', 18, yPos + 23)

    // Property Details box
    doc.roundedRect(pageWidth / 2 + 3, yPos, boxWidth, 30, 4, 4, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(79, 70, 229)
    doc.text('PROPERTY DETAILS:', pageWidth / 2 + 7, yPos + 6)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(invoice.property_name || 'N/A', pageWidth / 2 + 7, yPos + 13)
    doc.text(`Unit: ${invoice.unit_number || 'N/A'}`, pageWidth / 2 + 7, yPos + 18)
    doc.text(invoice.property_address || '', pageWidth / 2 + 7, yPos + 23)

    yPos = 95

    // Line Items Table
    doc.setFillColor(248, 249, 250)
    doc.setDrawColor(79, 70, 229)
    doc.setLineWidth(0.5)

    // Table header
    doc.setFillColor(79, 70, 229)
    doc.rect(14, yPos, pageWidth - 28, 10, 'F')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Description', 16, yPos + 7)
    doc.text('Qty', 106, yPos + 7, { align: 'center' })
    doc.text('Rate', 149, yPos + 7, { align: 'right' })
    doc.text('Amount', 194, yPos + 7, { align: 'right' })

    yPos += 10

    // Table rows
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setDrawColor(229, 231, 235)

    const items = invoice.items || []
    items.forEach((item: any) => {
      const amount = item.quantity * item.rate

      doc.text(item.description || '', 16, yPos + 7)
      doc.text(String(item.quantity), 119, yPos + 7, { align: 'center' })
      doc.text(`R ${parseFloat(item.rate).toFixed(2)}`, 149, yPos + 7, { align: 'right' })
      doc.text(`R ${amount.toFixed(2)}`, 194, yPos + 7, { align: 'right' })

      doc.line(14, yPos + 10, pageWidth - 14, yPos + 10)
      yPos += 10
    })

    yPos += 5

    // Totals section
    const totalsX = pageWidth - 80
    doc.setFont('helvetica', 'bold')

    doc.text('Subtotal:', totalsX, yPos)
    doc.text(`R ${parseFloat(invoice.subtotal || 0).toFixed(2)}`, pageWidth - 16, yPos, { align: 'right' })
    yPos += 7

    if (invoice.tax_amount && invoice.tax_amount > 0) {
      const taxRate = invoice.tax_rate || 15
      doc.text(`Tax (${taxRate}%):`, totalsX, yPos)
      doc.text(`R ${parseFloat(invoice.tax_amount).toFixed(2)}`, pageWidth - 16, yPos, { align: 'right' })
      yPos += 7
    }

    // Total Due
    doc.setFillColor(79, 70, 229)
    doc.rect(totalsX - 5, yPos - 5, 80, 12, 'F')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL DUE:', totalsX, yPos + 3)
    doc.text(`R ${parseFloat(invoice.total_amount || 0).toFixed(2)}`, pageWidth - 16, yPos + 3, { align: 'right' })

    yPos += 20

    // Payment Details (if banking details exist)
    if (invoice.banking_details && invoice.banking_details.trim()) {
      doc.setFillColor(239, 246, 255)
      doc.setDrawColor(59, 130, 246)
      doc.roundedRect(14, yPos, pageWidth - 28, 25, 4, 4, 'FD')

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 64, 175)
      doc.text('Payment Details:', 18, yPos + 6)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 58, 138)
      const bankingLines = invoice.banking_details.split('\n')
      bankingLines.forEach((line: string, index: number) => {
        doc.text(line, 18, yPos + 12 + (index * 4))
      })

      doc.text(`Payment Reference: ${invoice.invoice_number}`, 18, yPos + 12 + (bankingLines.length * 4) + 3)
      yPos += 30
    }

    // Notes (if exists)
    if (invoice.notes && invoice.notes.trim()) {
      doc.setFillColor(254, 243, 199)
      doc.setDrawColor(245, 158, 11)
      doc.roundedRect(14, yPos, pageWidth - 28, 15, 4, 4, 'FD')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(120, 53, 15)
      doc.text('Notes:', 18, yPos + 6)

      doc.setFont('helvetica', 'normal')
      doc.text(invoice.notes, 18, yPos + 11)
      yPos += 20
    }

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 20

    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.5)
    doc.line(14, yPos, pageWidth - 14, yPos)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(invoice.company_name || '', pageWidth / 2, yPos + 5, { align: 'center' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text('Thank you for your business!', pageWidth / 2, yPos + 10, { align: 'center' })

    const generatedDate = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    })
    doc.text(`This invoice was generated on ${generatedDate}`, pageWidth / 2, yPos + 14, { align: 'center' })

    doc.setFont('helvetica', 'italic')
    doc.text('Generated with ThynkXPro', pageWidth / 2, yPos + 18, { align: 'center' })

    // Return blob URL for viewing in iframe
    const pdfBlob = doc.output('blob')
    return URL.createObjectURL(pdfBlob)
  }

  const handleSendEmail = async (invoice: Invoice) => {
    try {
      toast.info("Sending invoice email...")
      const emailRes = await fetch(getApiUrl(`invoices/${invoice.invoice_id}/send`))
      const emailData = await emailRes.json()

      if (emailData.success) {
        toast.success(`Invoice sent to ${emailData.recipient}`)
      } else {
        toast.error("Failed to send invoice email")
      }
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error("Failed to send invoice email")
    }
  }

  const handleEditClick = async (invoice: Invoice) => {
    try {
      setSelectedInvoice(invoice)
      const invoiceDetails = await fetchInvoiceDetails(invoice.invoice_id)

      setFormData({
        invoice_number: invoiceDetails.invoice_number,
        tenant_id: invoiceDetails.tenant_id,
        unit_id: invoiceDetails.unit_id,
        invoice_date: invoiceDetails.invoice_date,
        due_date: invoiceDetails.due_date,
        subtotal: invoiceDetails.subtotal,
        tax_amount: invoiceDetails.tax_amount,
        total_amount: invoiceDetails.total_amount,
        amount_paid: invoiceDetails.amount_paid,
        status: invoiceDetails.status,
        notes: invoiceDetails.notes || "",
        include_banking_details: invoiceDetails.include_banking_details || "",
        items: invoiceDetails.items || []
      })

      setIsEditModalOpen(true)
      setFormErrors({})
    } catch (error) {
      console.error("Error fetching invoice details:", error)
    }
  }

  const handleDeleteClick = async (invoiceId: number) => {
    if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) return

    try {
      const res = await fetch(getApiUrl(`invoices/${invoiceId}`), {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete invoice")

      toast.success("Invoice deleted successfully")
      fetchInvoices() // Refresh the list
    } catch (error) {
      toast.error("Failed to delete invoice")
      console.error("Delete error:", error)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.invoice_number.trim()) errors.invoice_number = "Invoice number is required"
    if (!formData.tenant_id) errors.tenant_id = "Tenant is required"
    if (!formData.invoice_date) errors.invoice_date = "Invoice date is required"
    if (!formData.due_date) errors.due_date = "Due date is required"
    if (!formData.subtotal) errors.subtotal = "Subtotal is required"
    if (!formData.total_amount) errors.total_amount = "Total amount is required"
    if (!formData.status) errors.status = "Status is required"

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!selectedInvoice) return

    setIsSubmitting(true)
    try {
      const res = await fetch(getApiUrl(`invoices/${selectedInvoice.invoice_id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "Failed to update invoice")
      }

      toast.success("Invoice updated successfully")
      setIsEditModalOpen(false)
      fetchInvoices() // Refresh the list
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update invoice")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function exportPdf() {
    if (!tableRef.current) return

    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    })

    await doc.html(tableRef.current, {
      callback: () => {
        doc.save("Invoices_List.pdf")
      },
      x: 10,
      y: 10,
      html2canvas: { scale: 0.9 },
    })
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800"
      case "sent": return "bg-blue-100 text-blue-800"
      case "overdue": return "bg-red-100 text-red-800"
      case "cancelled": return "bg-gray-100 text-gray-800"
      case "unpaid": return "bg-orange-100 text-orange-800"
      default: return "bg-yellow-100 text-yellow-800"
    }
  }

  const hasBankingDetails = (details: string | null): boolean => {
    return !!details && details.trim().length > 0;
  }

  return (
    <div className="flex-1 space-y-4 p-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage rental invoices and billing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPdf} disabled={loading || invoices.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link href="/income/invoices/new">
            <Button className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {loading && <p>Loading invoices...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Invoices</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." className="w-[300px] pl-8" />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div ref={tableRef}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Balance Due</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {invoices.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                )}

                {invoices.map((invoice) => (
                  <TableRow key={invoice.invoice_id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.tenant_name || `Tenant #${invoice.tenant_id}`}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.total_amount)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(invoice.amount_paid)}
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      {formatCurrency(invoice.balance_due || (invoice.total_amount - invoice.amount_paid))}
                    </TableCell>
                    <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusBadgeClass(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClick(invoice)}
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadClick(invoice)}
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendEmail(invoice)}
                          title="Send Email"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(invoice)}
                          title="Edit Invoice"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(invoice.invoice_id)}
                          title="Delete Invoice"
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

      {/* View Invoice Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>
              Invoice: {selectedInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              Preview of generated invoice for {selectedInvoice?.tenant_name || `Tenant #${selectedInvoice?.tenant_id}`}
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[70vh] overflow-auto p-6">
            {viewInvoiceUrl && (
              <iframe
                src={viewInvoiceUrl}
                className="w-full h-full border-0 rounded"
                title="Invoice Preview"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 p-6 pt-0 border-t">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedInvoice) {
                  handleDownloadClick(selectedInvoice)
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

      {/* Edit Invoice Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription className="text-red-500 font-semibold">
              No fields should be empty (only Unit ID can be empty)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number *</Label>
                <Input
                  id="invoice_number"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleInputChange}
                />
                {formErrors.invoice_number && (
                  <p className="text-red-500 text-sm">{formErrors.invoice_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant_id">Tenant ID *</Label>
                <Input
                  id="tenant_id"
                  name="tenant_id"
                  type="number"
                  value={formData.tenant_id}
                  onChange={handleInputChange}
                />
                {formErrors.tenant_id && (
                  <p className="text-red-500 text-sm">{formErrors.tenant_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_id">Unit ID</Label>
                <Input
                  id="unit_id"
                  name="unit_id"
                  type="number"
                  value={formData.unit_id || ""}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_date">Invoice Date *</Label>
                <Input
                  id="invoice_date"
                  name="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={handleInputChange}
                />
                {formErrors.invoice_date && (
                  <p className="text-red-500 text-sm">{formErrors.invoice_date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                />
                {formErrors.due_date && (
                  <p className="text-red-500 text-sm">{formErrors.due_date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtotal">Subtotal *</Label>
                <Input
                  id="subtotal"
                  name="subtotal"
                  type="number"
                  step="0.01"
                  value={formData.subtotal}
                  onChange={handleInputChange}
                />
                {formErrors.subtotal && (
                  <p className="text-red-500 text-sm">{formErrors.subtotal}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_amount">Tax Amount</Label>
                <Input
                  id="tax_amount"
                  name="tax_amount"
                  type="number"
                  step="0.01"
                  value={formData.tax_amount}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_amount">Total Amount *</Label>
                <Input
                  id="total_amount"
                  name="total_amount"
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={handleInputChange}
                />
                {formErrors.total_amount && (
                  <p className="text-red-500 text-sm">{formErrors.total_amount}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount_paid">Amount Paid</Label>
                <Input
                  id="amount_paid"
                  name="amount_paid"
                  type="number"
                  step="0.01"
                  value={formData.amount_paid}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.status && (
                  <p className="text-red-500 text-sm">{formErrors.status}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="include_banking_details">Banking Details</Label>
              <Textarea
                id="include_banking_details"
                name="include_banking_details"
                value={formData.include_banking_details}
                onChange={handleInputChange}
                placeholder="Enter banking details"
                rows={3}
              />
              <p className="text-sm text-gray-500">
                Enter banking details to include on the invoice for EFT payments. Leave empty to exclude banking details.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isSubmitting ? "Updating..." : "Update Invoice"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

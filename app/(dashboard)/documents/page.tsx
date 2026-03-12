"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Trash2, Eye, Download, Upload, FileText, X } from "lucide-react"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Property { property_id: number; property_name: string }
interface Tenant { tenant_id: number; full_name: string }
interface Document {
  document_id: number
  tenant_id: number
  file_name: string
  doc_type: string
  uploaded_at: string
  file_path: string
}

export default function TenantDocuments() {
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>("")
  const [selectedTenant, setSelectedTenant] = useState<string>("")
  const [documents, setDocuments] = useState<Document[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") || "1" : "1"

  // Fetch properties
  const fetchProperties = async () => {
    try {
      const res = await fetch(getApiUrl(`properties?company_id=${companyId}`))
      const data = await res.json()
      setProperties(Array.isArray(data) ? data.flat() : [])
    } catch (error) {
      console.error("Error fetching properties:", error)
    }
  }

  // Fetch tenants (filtered by property)
  const fetchTenants = async (propertyId?: string) => {
    try {
      let url = getApiUrl(`tenants?company_id=${companyId}`)
      if (propertyId) {
        url += `&property_id=${propertyId}`
      }
      const res = await fetch(url)
      const data = await res.json()
      const tenantsList = data.flat().filter(t => t && t.full_name)
      setTenants(tenantsList)
    } catch (error) {
      console.error("Error fetching tenants:", error)
    }
  }

  // Fetch documents
  const fetchDocuments = async () => {
    if (!selectedTenant) return
    setLoading(true)
    try {
      const res = await fetch(getApiUrl(`documents?company_id=${companyId}&tenant_id=${selectedTenant}`))
      const data = await res.json()
      setDocuments(data.data || [])
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  // When property changes, fetch tenants for that property
  useEffect(() => {
    if (selectedProperty) {
      fetchTenants(selectedProperty)
      setSelectedTenant("")
      setDocuments([])
    }
  }, [selectedProperty])

  useEffect(() => {
    if (selectedTenant) fetchDocuments()
  }, [selectedTenant])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!selectedTenant || !file || !docType) {
      return toast.error("Please select a tenant, enter document type, and choose a file.")
    }

    setUploading(true)
    const formData = new FormData()
    formData.append("company_id", companyId)
    formData.append("tenant_id", selectedTenant)
    formData.append("doc_type", docType)
    formData.append("file", file)

    try {
      const res = await fetch(getApiUrl(`documents`), { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        toast.success("Document uploaded successfully")
        setFile(null)
        setDocType("")
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) fileInput.value = ""
        fetchDocuments()
      } else {
        toast.error(data.message || "Upload failed")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error uploading document")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      const res = await fetch(getApiUrl(`documents`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId, company_id: companyId, tenant_id: selectedTenant })
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Document deleted successfully")
        fetchDocuments()
      } else {
        toast.error(data.message || "Failed to delete document")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error deleting document")
    }
  }

  const handleDownload = (doc: Document) => {
    const link = document.createElement('a')
    link.href = getApiUrl(`documents?download=1&filename=${encodeURIComponent(doc.file_name)}`)
    link.download = doc.file_name
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return '📄'
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return '🖼️'
    if (['doc', 'docx'].includes(ext || '')) return '📝'
    return '📎'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tenant Documents</h2>
          <p className="text-muted-foreground">Upload and manage tenant documents</p>
        </div>
      </div>

      {/* Property and Tenant Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Tenant</CardTitle>
          <CardDescription>Choose a property and tenant to view their documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.property_id} value={String(p.property_id)}>
                      {p.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select
                value={selectedTenant}
                onValueChange={setSelectedTenant}
                disabled={!selectedProperty}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedProperty ? "Select tenant" : "Select property first"} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(t => (
                    <SelectItem key={t.tenant_id} value={String(t.tenant_id)}>
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Document */}
      {selectedTenant && (
        <Card>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
            <CardDescription>Add a new document for {tenants.find(t => String(t.tenant_id) === selectedTenant)?.full_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lease Agreement">Lease Agreement</SelectItem>
                    <SelectItem value="ID Document">ID Document</SelectItem>
                    <SelectItem value="ITC Check">ITC Check</SelectItem>
                    <SelectItem value="Proof of Income">Proof of Income</SelectItem>
                    <SelectItem value="Bank Statement">Bank Statement</SelectItem>
                    <SelectItem value="Reference Letter">Reference Letter</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Choose File</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpeg,.jpg,.webp"
                  onChange={handleFileChange}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
              <div>
                <Button
                  className="bg-blue-500 hover:bg-blue-600 w-full"
                  onClick={handleUpload}
                  disabled={uploading || !file || !docType}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {selectedTenant && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
            <CardDescription>
              {documents.length} {documents.length === 1 ? 'document' : 'documents'} for {tenants.find(t => String(t.tenant_id) === selectedTenant)?.full_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map(doc => (
                  <Card key={doc.document_id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{getFileIcon(doc.file_name)}</span>
                          <div>
                            <h4 className="font-semibold text-sm">{doc.doc_type}</h4>
                            <p className="text-xs text-muted-foreground">{formatDate(doc.uploaded_at)}</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 truncate" title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(doc.document_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No documents uploaded for this tenant.</p>
                <p className="text-sm text-muted-foreground">Upload your first document using the form above.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{previewDoc?.doc_type} - {previewDoc?.file_name}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => previewDoc && handleDownload(previewDoc)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="w-full overflow-auto max-h-[70vh]">
            {previewDoc && (
              <>
                {previewDoc.file_name.match(/\.(pdf)$/i) ? (
                  <iframe
                    src={getApiUrl(`documents?download=1&filename=${encodeURIComponent(previewDoc.file_name)}`)}
                    className="w-full h-[600px] border-0"
                    title={previewDoc.file_name}
                  />
                ) : previewDoc.file_name.match(/\.(jpe?g|png|webp)$/i) ? (
                  <img
                    src={getApiUrl(`documents?download=1&filename=${encodeURIComponent(previewDoc.file_name)}`)}
                    alt={previewDoc.file_name}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Preview not available for this file type.</p>
                    <Button onClick={() => previewDoc && handleDownload(previewDoc)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"
import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Trash2, Building2, MapPin, Pencil } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"

export default function PropertiesPage() {
  const [summary, setSummary] = useState({ total_properties: 0, total_units: 0 })
  const [properties, setProperties] = useState([])

  const companyId = typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : null

  // Fetch summary and properties
  const fetchData = () => {
    if (!companyId) return
  
    fetch(getApiUrl(`properties/summary?company_id=${companyId}`))
      .then(res => res.json())
      .then(data => {
        if (data?.summary) {
          setSummary(data.summary)
        } else {
          setSummary({ total_properties: 0, total_units: 0 })
        }
      })
      .catch(() => setSummary({ total_properties: 0, total_units: 0 }))

    fetch(getApiUrl(`properties?company_id=${companyId}`))
      .then(res => res.json())
      .then(data => {
        const flattened = Array.isArray(data) ? data.flat() : []
        setProperties(flattened)
      })
      .catch(() => setProperties([]))
  }
  

  useEffect(() => {
    fetchData()
  }, [companyId])

  // Delete property function
  const deleteProperty = (propertyId) => {
    if (!confirm("Are you sure you want to delete this property?")) return

    fetch(getApiUrl(`properties/${propertyId}`), {
      method: "DELETE",
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to delete property")
        return res.json()
      })
      .then(() => {
        toast.success("Property deleted successfully")
        fetchData() // Refresh data after delete
      })
      .catch(err => {
        toast.error(err.message)
      })
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Properties</h2>
          <p className="text-muted-foreground">Manage your rental properties</p>
        </div>
        <Link href="/properties/add">
          <Button className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Building2 className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
              <p className="text-2xl font-bold">{summary.total_properties}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">{summary.total_units}</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Units</p>
              <p className="text-2xl font-bold">{summary.total_units}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Properties</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search properties..." className="w-[300px] pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Total Units</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.property_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">{property.property_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{property.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>{property.total_units}</TableCell>
                  <TableCell>{property.city}</TableCell>
                  <TableCell>
                    <Badge className="bg-green-500">Active</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/properties/edit?id=${property.property_id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProperty(property.property_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

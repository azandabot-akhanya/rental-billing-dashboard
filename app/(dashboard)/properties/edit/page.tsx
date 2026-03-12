"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api-config"

export default function EditPropertyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const propertyId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    propertyName: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    totalUnits: "",
    description: "",
  })

  // Fetch property data on mount
  useEffect(() => {
    if (!propertyId) {
      toast.error("Property ID is missing")
      router.push("/properties")
      return
    }

    fetch(getApiUrl(`properties/${propertyId}`))
      .then(res => res.json())
      .then(data => {
        if (data) {
          setFormData({
            propertyName: data.property_name || "",
            address: data.address || "",
            city: data.city || "",
            province: data.province || "",
            postalCode: data.postal_code || "",
            totalUnits: data.total_units?.toString() || "",
            description: data.description || "",
          })
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        toast.error("Failed to load property")
        setLoading(false)
      })
  }, [propertyId])

  const handleSubmit = async () => {
    const payload = {
      property_name: formData.propertyName,
      address: formData.address,
      city: formData.city,
      province: formData.province,
      postal_code: formData.postalCode,
      total_units: formData.totalUnits,
      description: formData.description,
    }

    try {
      const res = await fetch(getApiUrl(`properties/${propertyId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || "Failed to update property")

      toast.success("Property updated successfully!")
      router.push("/properties")
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <p>Loading property...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Property</h2>
          <p className="text-muted-foreground">Update property information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="propertyName">Property Name *</Label>
            <Input
              id="propertyName"
              value={formData.propertyName}
              onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
              placeholder="Enter property name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter full address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Select
                value={formData.province}
                onValueChange={(value) => setFormData({ ...formData, province: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="western-cape">Western Cape</SelectItem>
                  <SelectItem value="gauteng">Gauteng</SelectItem>
                  <SelectItem value="kwazulu-natal">KwaZulu-Natal</SelectItem>
                  <SelectItem value="eastern-cape">Eastern Cape</SelectItem>
                  <SelectItem value="free-state">Free State</SelectItem>
                  <SelectItem value="limpopo">Limpopo</SelectItem>
                  <SelectItem value="mpumalanga">Mpumalanga</SelectItem>
                  <SelectItem value="north-west">North West</SelectItem>
                  <SelectItem value="northern-cape">Northern Cape</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Enter postal code"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalUnits">Total Units</Label>
              <Input
                id="totalUnits"
                type="number"
                value={formData.totalUnits}
                onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })}
                placeholder="Enter number of units"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter property description"
                rows={4}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleSubmit}>
              Update Property
            </Button>
            <Button variant="outline" onClick={() => router.push("/properties")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

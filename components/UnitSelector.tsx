"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Check, X } from "lucide-react"
import { getApiUrl } from "@/lib/api-config"
import { cn } from "@/lib/utils"

interface UnitSelectorProps {
  propertyId: string
  selectedUnit: string
  onUnitSelect: (unitNumber: string) => void
  error?: string
}

interface UnitInfo {
  unit_number: string
  is_occupied: boolean
  tenant_name?: string
}

export function UnitSelector({ propertyId, selectedUnit, onUnitSelect, error }: UnitSelectorProps) {
  const [units, setUnits] = useState<UnitInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [totalUnits, setTotalUnits] = useState(0)

  useEffect(() => {
    if (!propertyId) {
      setUnits([])
      return
    }

    const fetchUnits = async () => {
      setLoading(true)
      try {
        const res = await fetch(getApiUrl(`properties/${propertyId}/units`))
        if (!res.ok) throw new Error("Failed to fetch units")

        const data = await res.json()
        setUnits(data.units || [])
        setTotalUnits(data.total_units || 0)
      } catch (err) {
        console.error("Error fetching units:", err)
        setUnits([])
      } finally {
        setLoading(false)
      }
    }

    fetchUnits()
  }, [propertyId])

  if (!propertyId) {
    return (
      <div className="space-y-2">
        <Label>Unit Number *</Label>
        <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
          Please select a property first
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Unit Number *</Label>
        <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
          Loading units...
        </div>
      </div>
    )
  }

  const availableUnits = units.filter(u => !u.is_occupied)
  const occupiedUnits = units.filter(u => u.is_occupied)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Unit Number *</Label>
        <div className="text-sm text-muted-foreground">
          {availableUnits.length} / {totalUnits} available
        </div>
      </div>

      {/* Unit Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {units.map((unit) => {
          const isSelected = selectedUnit === unit.unit_number
          const isOccupied = unit.is_occupied
          const canSelect = !isOccupied

          return (
            <button
              key={unit.unit_number}
              type="button"
              onClick={() => canSelect && onUnitSelect(unit.unit_number)}
              disabled={isOccupied}
              className={cn(
                "relative h-16 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                {
                  // Selected state
                  "border-blue-500 bg-blue-50 text-blue-700": isSelected && !isOccupied,

                  // Available state
                  "border-green-200 bg-white hover:border-green-400 hover:bg-green-50 text-gray-700":
                    !isSelected && !isOccupied,

                  // Occupied state
                  "border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-60":
                    isOccupied,
                }
              )}
              title={isOccupied ? `Unit ${unit.unit_number} - Occupied by ${unit.tenant_name || 'Tenant'}` : `Unit ${unit.unit_number} - Available`}
            >
              {/* Unit number */}
              <span className="text-sm font-bold">
                {unit.unit_number}
              </span>

              {/* Status icon */}
              <div className="absolute top-1 right-1">
                {isSelected && !isOccupied && (
                  <div className="bg-blue-500 rounded-full p-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                {isOccupied && (
                  <div className="bg-red-500 rounded-full p-0.5">
                    <X className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Availability indicator dot */}
              <div className={cn(
                "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                {
                  "bg-green-500": !isOccupied && !isSelected,
                  "bg-blue-500": isSelected && !isOccupied,
                  "bg-red-500": isOccupied,
                }
              )} />
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border-2 border-green-200 bg-white" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border-2 border-blue-500 bg-blue-50" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border-2 border-red-200 bg-red-50" />
          <span>Occupied</span>
        </div>
      </div>

      {/* Selected unit display */}
      {selectedUnit && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Selected Unit:</span> {selectedUnit}
          </p>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  )
}

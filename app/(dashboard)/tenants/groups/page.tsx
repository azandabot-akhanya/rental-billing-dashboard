"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, Trash2, Users } from "lucide-react"

const groups = [
  {
    id: 1,
    name: "Premium Tenants",
    description: "High-value tenants with excellent payment history",
    tenantCount: 12,
    color: "bg-blue-500",
  },
  {
    id: 2,
    name: "New Tenants",
    description: "Recently onboarded tenants",
    tenantCount: 5,
    color: "bg-green-500",
  },
  {
    id: 3,
    name: "Commercial Tenants",
    description: "Business and commercial property tenants",
    tenantCount: 8,
    color: "bg-purple-500",
  },
  {
    id: 4,
    name: "Overdue Payments",
    description: "Tenants with outstanding payments",
    tenantCount: 3,
    color: "bg-red-500",
  },
]

export default function TenantGroupsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tenant Groups</h2>
          <p className="text-muted-foreground">Organize tenants into groups for better management</p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Groups</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search groups..." className="w-[300px] pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Tenant Count</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${group.color}`}></div>
                      <span className="font-medium">{group.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{group.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                      <Users className="w-3 h-3" />
                      {group.tenantCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
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

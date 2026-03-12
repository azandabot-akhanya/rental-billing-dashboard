"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export default function TransferPage() {
  const [formData, setFormData] = useState({
    amount: "",
    fromAccount: "",
    toAccount: "",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    description: "",
    transferType: "",
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transfer Funds</h2>
          <p className="text-muted-foreground">Transfer money between accounts</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ZAR) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter transfer amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromAccount">From Account *</Label>
              <Select
                value={formData.fromAccount}
                onValueChange={(value) => setFormData({ ...formData, fromAccount: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank-main">Main Bank Account</SelectItem>
                  <SelectItem value="bank-savings">Savings Account</SelectItem>
                  <SelectItem value="cash">Cash Account</SelectItem>
                  <SelectItem value="rental-income">Rental Income Account</SelectItem>
                  <SelectItem value="security-deposits">Security Deposits Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="toAccount">To Account *</Label>
              <Select
                value={formData.toAccount}
                onValueChange={(value) => setFormData({ ...formData, toAccount: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank-main">Main Bank Account</SelectItem>
                  <SelectItem value="bank-savings">Savings Account</SelectItem>
                  <SelectItem value="cash">Cash Account</SelectItem>
                  <SelectItem value="rental-income">Rental Income Account</SelectItem>
                  <SelectItem value="security-deposits">Security Deposits Account</SelectItem>
                  <SelectItem value="maintenance-fund">Maintenance Fund</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transferType">Transfer Type</Label>
              <Select
                value={formData.transferType}
                onValueChange={(value) => setFormData({ ...formData, transferType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transfer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal Transfer</SelectItem>
                  <SelectItem value="bank-to-bank">Bank to Bank</SelectItem>
                  <SelectItem value="cash-deposit">Cash Deposit</SelectItem>
                  <SelectItem value="cash-withdrawal">Cash Withdrawal</SelectItem>
                  <SelectItem value="reserve-allocation">Reserve Allocation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Enter reference number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter transfer description"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button className="bg-blue-500 hover:bg-blue-600">Process Transfer</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { Search, RefreshCw, Plus, Minus, Calculator } from "lucide-react"

export default function AdminWalletsPage() {
  const [search, setSearch] = useState("")
  const [wallet, setWallet] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [adjustDialog, setAdjustDialog] = useState<{
    open: boolean
    amount: string
    reason: string
  }>({ open: false, amount: "", reason: "" })

  useEffect(() => {
    if (search) {
      fetchWallet()
    }
  }, [])

  const fetchWallet = async () => {
    if (!search) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/wallets?search=${encodeURIComponent(search)}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch wallet")
      }

      const data = await response.json()
      if (data.success) {
        setWallet(data.wallet)
        setTransactions(data.transactions)
      }
    } catch (err: any) {
      console.error("Error fetching wallet:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdjust = async (amountCents: number) => {
    if (!wallet || !search) return

    try {
      const response = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: wallet.userId || search,
          action: "adjust",
          amountCents,
          reason: adjustDialog.reason,
        }),
      })

      if (response.ok) {
        await fetchWallet()
        setAdjustDialog({ open: false, amount: "", reason: "" })
      }
    } catch (err) {
      console.error("Error adjusting wallet:", err)
    }
  }

  const handleRecompute = async () => {
    if (!wallet || !search) return

    try {
      const response = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: wallet.userId || search,
          action: "recompute",
        }),
      })

      if (response.ok) {
        await fetchWallet()
      }
    } catch (err) {
      console.error("Error recomputing wallet:", err)
    }
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Wallets</h1>
        <p className="text-muted-foreground">View and manage user wallets</p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Search by email or user ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchWallet()}
              className="max-w-md"
            />
            <Button onClick={fetchWallet}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : wallet ? (
        <>
          {/* Wallet Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Wallet Balance</CardTitle>
                  <CardDescription>
                    {wallet.user?.name || wallet.user?.email}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setAdjustDialog({ open: true, amount: "", reason: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adjust
                  </Button>
                  <Button variant="outline" onClick={handleRecompute}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Recompute
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {formatCurrency(wallet.balanceCents)}
              </div>
              {wallet.balanceCents < 0 && (
                <Badge variant="destructive" className="mt-2">
                  Negative Balance - Numbers may be blocked
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Last 50 wallet transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length ? (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.type}</Badge>
                        </TableCell>
                        <TableCell
                          className={
                            tx.amountCents > 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          {tx.amountCents > 0 ? "+" : ""}
                          {formatCurrency(tx.amountCents)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {tx.providerTxnId || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No transactions
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : search ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No wallet found</p>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog
        open={adjustDialog.open}
        onOpenChange={(open) => setAdjustDialog({ ...adjustDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adjust Wallet Balance</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the adjustment amount (positive to add, negative to subtract) and reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="number"
              placeholder="Amount in cents (e.g., 1000 for $10.00)"
              value={adjustDialog.amount}
              onChange={(e) =>
                setAdjustDialog({ ...adjustDialog, amount: e.target.value })
              }
            />
            <Input
              placeholder="Reason for adjustment"
              value={adjustDialog.reason}
              onChange={(e) =>
                setAdjustDialog({ ...adjustDialog, reason: e.target.value })
              }
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAdjust(parseInt(adjustDialog.amount) || 0)}
            >
              Adjust
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

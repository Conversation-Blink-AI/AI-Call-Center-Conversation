"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { ExternalLink, RefreshCw, Ban, CheckCircle, XCircle } from "lucide-react"

interface PhoneNumber {
  id: string
  phoneNumber: string
  userId: string
  userEmail: string
  userName: string
  location: string
  type: string
  status: string
  purchasedAt: string
  monthlyFee: number | null
  pathwayId: string | null
  walletBalance: number | null
}

export default function AdminNumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    numberId: string | null
    action: string | null
    phoneNumber: string
  }>({ open: false, numberId: null, action: null, phoneNumber: "" })

  const router = useRouter()

  useEffect(() => {
    fetchNumbers()
  }, [])

  const fetchNumbers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/numbers", {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch numbers")
      }

      const data = await response.json()
      if (data.success) {
        setNumbers(data.numbers)
      }
    } catch (err: any) {
      console.error("Error fetching numbers:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (numberId: string, action: string, phoneNumber: string) => {
    setActionDialog({ open: true, numberId, action, phoneNumber })
  }

  const confirmAction = async () => {
    if (!actionDialog.numberId || !actionDialog.action) return

    try {
      const response = await fetch("/api/admin/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          numberId: actionDialog.numberId,
          action: actionDialog.action,
        }),
      })

      if (response.ok) {
        await fetchNumbers()
      }
    } catch (err) {
      console.error("Error performing action:", err)
    } finally {
      setActionDialog({ open: false, numberId: null, action: null, phoneNumber: "" })
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Phone Numbers</h1>
        <p className="text-muted-foreground">View and manage all phone numbers</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Phone Numbers</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : `${numbers.length} numbers`}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchNumbers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Purchased</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.length ? (
                  numbers.map((number) => (
                    <TableRow key={number.id}>
                      <TableCell className="font-mono">{number.phoneNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{number.userName || number.userEmail}</div>
                          <div className="text-sm text-muted-foreground">{number.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>{number.location || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            number.status === "active"
                              ? "default"
                              : number.status === "blocked"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {number.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(number.purchasedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {number.walletBalance !== null ? (
                          <span
                            className={
                              number.walletBalance < 0 ? "text-destructive font-semibold" : ""
                            }
                          >
                            ${(number.walletBalance / 100).toFixed(2)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/numbers/${number.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {number.status === "active" ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleAction(number.id, "block", number.phoneNumber)
                              }
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Block
                            </Button>
                          ) : number.status === "blocked" ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() =>
                                handleAction(number.id, "unblock", number.phoneNumber)
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Unblock
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleAction(number.id, "unsubscribe", number.phoneNumber)
                            }
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Unsubscribe
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No phone numbers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={actionDialog.open} onOpenChange={(open) => 
        setActionDialog({ ...actionDialog, open })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.action === "block"
                ? "Block Phone Number"
                : actionDialog.action === "unblock"
                ? "Unblock Phone Number"
                : "Unsubscribe Phone Number"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionDialog.action} the phone number{" "}
              <strong>{actionDialog.phoneNumber}</strong>? This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

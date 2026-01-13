"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"

export default function AdminNumberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const numberId = params.id as string
  const [number, setNumber] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (numberId) {
      fetchNumberDetail()
    }
  }, [numberId])

  const fetchNumberDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/numbers?id=${numberId}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch number details")
      }

      const data = await response.json()
      if (data.success) {
        setNumber(data)
      }
    } catch (err: any) {
      console.error("Error fetching number details:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!number) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Phone number not found</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/admin/numbers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Numbers
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-mono">{number.number.phoneNumber}</h1>
          <p className="text-muted-foreground">{number.number.userEmail}</p>
        </div>
      </div>

      {/* Number Info */}
      <Card>
        <CardHeader>
          <CardTitle>Number Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Phone Number</div>
              <div className="font-mono text-lg">{number.number.phoneNumber}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <Badge
                variant={
                  number.number.status === "active"
                    ? "default"
                    : number.number.status === "blocked"
                    ? "destructive"
                    : "secondary"
                }
              >
                {number.number.status}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">User</div>
              <div>
                <div>{number.number.userName || number.number.userEmail}</div>
                <div className="text-sm text-muted-foreground">{number.number.userEmail}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Location</div>
              <div>{number.number.location || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Type</div>
              <div>{number.number.type || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Monthly Fee</div>
              <div>
                {number.number.monthlyFee
                  ? formatCurrency(Math.round(number.number.monthlyFee * 100))
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Purchased</div>
              <div>{format(new Date(number.number.purchasedAt), "MMM d, yyyy")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed info */}
      <Tabs defaultValue="billing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="billing">
            Billing History ({number.billingHistory?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="calls">
            Call Logs ({number.callLogs?.length || 0})
          </TabsTrigger>
          {number.pathway && (
            <TabsTrigger value="pathway">Linked Pathway</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gateway</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {number.billingHistory?.length ? (
                    number.billingHistory.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{formatCurrency(payment.amountCents)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "succeeded" ? "default" : "secondary"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.gateway}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No billing history
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle>Call Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {number.callLogs?.length ? (
                    number.callLogs.map((call: any) => (
                      <TableRow key={call.id}>
                        <TableCell>
                          {format(new Date(call.createdAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-mono">{call.toNumber}</TableCell>
                        <TableCell className="font-mono">{call.fromNumber}</TableCell>
                        <TableCell>
                          {call.durationSeconds
                            ? `${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={call.status === "completed" ? "default" : "secondary"}
                          >
                            {call.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {call.costCents ? formatCurrency(call.costCents) : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No call logs
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {number.pathway && (
          <TabsContent value="pathway">
            <Card>
              <CardHeader>
                <CardTitle>Linked Pathway</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Pathway Name</div>
                    <div className="font-medium">{number.pathway.name}</div>
                  </div>
                  {number.pathway.description && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Description
                      </div>
                      <div>{number.pathway.description}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Created</div>
                    <div>{format(new Date(number.pathway.created_at), "MMM d, yyyy")}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Updated</div>
                    <div>{format(new Date(number.pathway.updated_at), "MMM d, yyyy")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

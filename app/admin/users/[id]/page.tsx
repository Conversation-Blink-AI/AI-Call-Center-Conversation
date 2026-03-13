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

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accessingAccount, setAccessingAccount] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [userAppUrl, setUserAppUrl] = useState<string>("")

  useEffect(() => {
    if (userId) {
      fetchUserDetail()
    }
  }, [userId])

  useEffect(() => {
    const configuredUrl = process.env.NEXT_PUBLIC_USER_APP_URL
    if (configuredUrl) {
      setUserAppUrl(configuredUrl.replace(/\/$/, ""))
      return
    }

    if (typeof window === "undefined") return

    const { protocol, hostname, port } = window.location
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      setUserAppUrl(`${protocol}//app.lvh.me${port ? `:${port}` : ""}`)
    }
  }, [])

  const fetchUserDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        console.error("Error response:", errorData)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      if (data.success) {
        setUser(data)
      } else {
        throw new Error(data.error || "Failed to fetch user details")
      }
    } catch (err: any) {
      console.error("Error fetching user details:", err)
      setUser(null) // Ensure user is set to null on error
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const handleAccessAccount = async () => {
    if (!user?.user?.id) return

    const hustleToken = user?.user?.hustleToken
    if (!hustleToken) {
      setAccessError("No token available")
      return
    }

    const configuredUrl = process.env.NEXT_PUBLIC_USER_APP_URL
    let userAppUrl = configuredUrl ? configuredUrl.replace(/\/$/, "") : ""
    if (!userAppUrl && typeof window !== "undefined") {
      const { protocol, hostname, port } = window.location
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        userAppUrl = `${protocol}//app.lvh.me${port ? `:${port}` : ""}`
      }
    }

    if (!userAppUrl) {
      setAccessError("User app URL is not configured")
      return
    }

    if (!userAppUrl) {
      setAccessError("User app URL is not configured")
      return
    }

    try {
      setAccessingAccount(true)
      setAccessError(null)

      const response = await fetch("/api/admin/users/access-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ userId: user.user.id })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = await response.json().catch(() => ({}))
      if (!data.success) {
        throw new Error(data.error || "Failed to access account")
      }

    } catch (err: any) {
      console.error("Error accessing user account:", err)
      setAccessError(err?.message || "Failed to access account")
    } finally {
      setAccessingAccount(false)
    }
  }

  const accessUrl = user?.user?.hustleToken && userAppUrl
    ? `${userAppUrl}/authenticateHustle?token=${encodeURIComponent(user.user.hustleToken)}`
    : ""

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/admin/users")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>User not found</CardTitle>
            <CardDescription>
              The user with ID {userId} could not be found in the database.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/admin/users")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{user.user.name || user.user.email}</h1>
          <p className="text-muted-foreground">{user.user.email}</p>
        </div>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Profile</CardTitle>
          <div className="flex flex-col items-end gap-2">
            {accessUrl ? (
              <Button asChild disabled={accessingAccount}>
                <a
                  href={accessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleAccessAccount}
                >
                  {accessingAccount ? "Accessing..." : "Access Account"}
                </a>
              </Button>
            ) : (
              <Button onClick={handleAccessAccount} disabled={accessingAccount}>
                {accessingAccount ? "Accessing..." : "Access Account"}
              </Button>
            )}
            {accessError && <div className="text-sm text-destructive">{accessError}</div>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">User ID</div>
              <div className="font-mono text-sm">{user.user.id}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div>{user.user.email}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div>{user.user.name || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Company</div>
              <div>{user.user.company || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Role</div>
              <div className="flex gap-2">
                <Badge variant="outline">{user.user.role}</Badge>
                {user.user.isAdmin && <Badge>Admin</Badge>}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div>{format(new Date(user.user.createdAt), "MMM d, yyyy")}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Last Login</div>
              <div>
                {user.user.lastLogin
                  ? format(new Date(user.user.lastLogin), "MMM d, yyyy HH:mm")
                  : "Never"}
              </div>
            </div>
            {user.wallet && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Wallet Balance</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(user.wallet.balanceCents)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed info */}
      <Tabs defaultValue="numbers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="numbers">Numbers ({user.numbers.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({user.payments.length})</TabsTrigger>
          <TabsTrigger value="calls">Call Logs ({user.callLogs.length})</TabsTrigger>
          <TabsTrigger value="pathways">Pathways ({user.pathways.length})</TabsTrigger>
          {user.teams && user.teams.length > 0 && (
            <TabsTrigger value="teams">Teams ({user.teams.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="numbers">
          <Card>
            <CardHeader>
              <CardTitle>Phone Numbers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purchased</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.numbers.length ? (
                    user.numbers.map((num: any) => (
                      <TableRow key={num.id}>
                        <TableCell className="font-mono">{num.phoneNumber}</TableCell>
                        <TableCell>{num.location || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={num.status === "active" ? "default" : "secondary"}>
                            {num.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(num.purchasedAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No phone numbers
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
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
                  {user.payments.length ? (
                    user.payments.map((payment: any) => (
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
                        No payments
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.callLogs.length ? (
                    user.callLogs.map((call: any) => (
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
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No call logs
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pathways">
          <Card>
            <CardHeader>
              <CardTitle>Pathways</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.pathways.length ? (
                    user.pathways.map((pathway: any) => (
                      <TableRow key={pathway.id}>
                        <TableCell className="font-medium">{pathway.name}</TableCell>
                        <TableCell>
                          {format(new Date(pathway.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(pathway.updatedAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No pathways
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {user.teams && user.teams.length > 0 && (
          <TabsContent value="teams">
            <Card>
              <CardHeader>
                <CardTitle>Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.teams.map((team: any) => (
                      <TableRow key={team.id}>
                        <TableCell>{team.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{team.memberRole}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard, AlertCircle, Plus, Download, Receipt, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"

import TopUpStripeButton from "@/components/TopUpStripeButton"



// Mock data for subscriptions
const mockSubscriptions = [
  {
    id: "sub_1234567890",
    phoneNumber: "+1 (978) 783-6427",
    status: "active",
    createdAt: "2025-04-10",
    nextBillingDate: "2025-05-10",
    amount: "$5.00",
    plan: "Standard",
  },
]

// Mock data for payment methods
const mockPaymentMethods = [
  {
    id: "pm_1234567890",
    type: "card",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2025,
    isDefault: true,
  },
  {
    id: "pm_0987654321",
    type: "paypal",
    email: "user@example.com",
    isDefault: false,
  },
]

// Mock data for transactions
const mockTransactions = [
  {
    id: "txn_1234567890",
    date: "2025-04-10",
    description: "Phone Number Subscription - Initial Payment",
    amount: "$5.00",
    status: "completed",
  },
  {
    id: "txn_0987654321",
    date: "2025-03-15",
    description: "Account Credit Purchase",
    amount: "$20.00",
    status: "completed",
  },
]

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [balance, setBalance] = useState<number>(0)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [callCosts, setCallCosts] = useState<any[]>([])
  const [loadingCallCosts, setLoadingCallCosts] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const fetchWalletBalance = async () => {
    try {
      setBalanceLoading(true)
      // Add cache busting to ensure fresh data
      const response = await fetch(`/api/wallet/balance?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBalance(Number(data.balance_dollars) || 0)
        console.log('✅ Balance fetched:', data.balance_dollars)
      } else {
        console.error('Failed to fetch wallet balance')
        setError("Failed to load wallet balance")
      }
    } catch (err) {
      console.error('Error fetching wallet balance:', err)
      setError("Failed to load wallet balance")
    } finally {
      setBalanceLoading(false)
    }
  }

  const fetchCallCosts = async () => {
    try {
      setLoadingCallCosts(true)
      const response = await fetch('/api/wallet/call-costs?limit=20', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCallCosts(data.callCosts || [])
      }
    } catch (error) {
      console.error('Error fetching call costs:', error)
    } finally {
      setLoadingCallCosts(false)
    }
  }

  useEffect(() => {
    // Fetch billing data and wallet balance
    const fetchBillingData = async () => {
      try {
        setIsLoading(true)

        // Fetch wallet balance
        await fetchWalletBalance()

        // Fetch call costs
        await fetchCallCosts()

        // Simulate API call for other data
        await new Promise((resolve) => setTimeout(resolve, 1000))

        setSubscriptions(mockSubscriptions)
        setPaymentMethods(mockPaymentMethods)
        setTransactions(mockTransactions)
      } catch (err) {
        console.error("Error fetching billing data:", err)
        setError("Failed to load billing data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchBillingData()
  }, [])

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update the subscription status
      setSubscriptions((prev) =>
        prev.map((sub) => (sub.id === subscriptionId ? { ...sub, status: "cancelling" } : sub)),
      )

      toast({
        title: "Subscription Cancellation Requested",
        description: "Your subscription will be cancelled at the end of the billing period.",
      })

      // After a delay, update to cancelled
      setTimeout(() => {
        setSubscriptions((prev) =>
          prev.map((sub) => (sub.id === subscriptionId ? { ...sub, status: "cancelled" } : sub)),
        )
      }, 2000)
    } catch (err) {
      console.error("Error cancelling subscription:", err)
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSetDefaultPaymentMethod = (paymentMethodId: string) => {
    setPaymentMethods((prev) =>
      prev.map((pm) => ({
        ...pm,
        isDefault: pm.id === paymentMethodId,
      })),
    )

    toast({
      title: "Default Payment Method Updated",
      description: "Your default payment method has been updated successfully.",
    })
  }

  const handleRemovePaymentMethod = (paymentMethodId: string) => {
    setPaymentMethods((prev) => prev.filter((pm) => pm.id !== paymentMethodId))

    toast({
      title: "Payment Method Removed",
      description: "Your payment method has been removed successfully.",
    })
  }

  const handleAddFunds = () => {
    // In a real app, this would open a payment modal
    toast({
      title: "Add Funds",
      description: "This would open a payment modal in a real application.",
    })
  }




  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Billing & Payments</h1>
            <p className="text-muted-foreground">Manage your subscriptions, payment methods, and billing history</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
          <TabsTrigger value="call-costs">Call Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Account Balance</CardTitle>
                <CardDescription>
                  Your current account balance and usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold">
                    {balanceLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      `$${balance.toFixed(2)}`
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchWalletBalance}
                    disabled={balanceLoading}
                  >
                    {balanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <TopUpStripeButton amount={25} onSuccess={fetchWalletBalance} />
                  <TopUpStripeButton amount={50} onSuccess={fetchWalletBalance} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TopUpStripeButton amount={100} onSuccess={fetchWalletBalance} />
                  <TopUpStripeButton amount={250} onSuccess={fetchWalletBalance} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <Badge variant="outline">{subscriptions.filter((s) => s.status === "active").length}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  $
                  {subscriptions
                    .filter((s) => s.status === "active")
                    .reduce((total, sub) => total + Number.parseFloat(sub.amount.replace("$", "")), 0)
                    .toFixed(2)}
                  /mo
                </div>
                <p className="text-xs text-muted-foreground">Total monthly charges</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("subscriptions")}>
                  Manage Subscriptions
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
                <Badge variant="outline">{paymentMethods.length}</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {paymentMethods.map((pm) => (
                    <div key={pm.id} className="flex items-center space-x-2">
                      {pm.type === "card" ? (
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4" />
                          <span className="text-sm">•••• {pm.last4}</span>
                          {pm.isDefault && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">PayPal</span>
                          {pm.isDefault && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("payment-methods")}>
                  Manage Payment Methods
                </Button>
              </CardFooter>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your most recent billing activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 3).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.amount}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.status === "completed" ? "default" : "outline"}>
                          {transaction.status === "completed" ? "Paid" : transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => setActiveTab("history")}>
                View All Transactions
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>Your current phone number subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">You don't have any active subscriptions</p>
                  <Button className="mt-4" onClick={() => router.push("/dashboard/phone-numbers/purchase")}>
                    Purchase a Phone Number
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Billing Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell className="font-medium">{subscription.phoneNumber}</TableCell>
                        <TableCell>{subscription.plan}</TableCell>
                        <TableCell>{subscription.amount}/month</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              subscription.status === "active"
                                ? "default"
                                : subscription.status === "cancelling"
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {subscription.status === "active"
                              ? "Active"
                              : subscription.status === "cancelling"
                                ? "Cancelling"
                                : "Cancelled"}
                          </Badge>
                        </TableCell>
                        <TableCell>{subscription.status === "active" ? subscription.nextBillingDate : "N/A"}</TableCell>
                        <TableCell>
                          {subscription.status === "active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelSubscription(subscription.id)}
                            >
                              Cancel
                            </Button>
                          ) : subscription.status === "cancelled" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push("/dashboard/phone-numbers/purchase")}
                            >
                              Resubscribe
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Processing
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-muted-foreground">
                Subscriptions are billed monthly and will automatically renew
              </p>
              <Button onClick={() => router.push("/dashboard/phone-numbers/purchase")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Phone Number
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage your payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">You don't have any payment methods</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium">
                          {method.type === "card" ? `${method.brand.toUpperCase()} Card` : "PayPal"}
                        </TableCell>
                        <TableCell>
                          {method.type === "card" ? `•••• •••• •••• ${method.last4}` : method.email}
                        </TableCell>
                        <TableCell>{method.type === "card" ? `${method.expMonth}/${method.expYear}` : "N/A"}</TableCell>
                        <TableCell>
                          {method.isDefault ? <Badge>Default</Badge> : <Badge variant="outline">Active</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {!method.isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetDefaultPaymentMethod(method.id)}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemovePaymentMethod(method.id)}
                              disabled={method.isDefault}
                            >
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Your billing and payment history</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{transaction.amount}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.status === "completed" ? "default" : "outline"}>
                            {transaction.status === "completed" ? "Paid" : transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="link" size="sm">
                            <Receipt className="mr-1 h-3 w-3" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="call-costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Costs</CardTitle>
              <CardDescription>Details of your call costs</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCallCosts ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : callCosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No call cost data available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Call Duration (Minutes)</TableHead>
                      <TableHead>Cost ($)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callCosts.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell>{new Date(cost.timestamp).toLocaleDateString()}</TableCell>
                        <TableCell>{(cost.duration / 60).toFixed(2)}</TableCell>
                        <TableCell>{(cost.duration / 60 * 0.11).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
      <Toaster />
    </div>
  )
}
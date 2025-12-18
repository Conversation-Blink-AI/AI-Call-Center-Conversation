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
import { useAuth } from "@/contexts/auth-context"

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

// Mock data for payment methods - REMOVED: Now using real Stripe API data

// Mock data for transactions - REMOVED: Now using real Stripe API invoices

export default function BillingPage() {
  const { user } = useAuth()
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
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
  const [subscriptionCount, setSubscriptionCount] = useState<number>(0)
  const [totalMonthlyFee, setTotalMonthlyFee] = useState<number>(0)
  const [loadingPhoneNumbers, setLoadingPhoneNumbers] = useState(false)
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const fetchWalletBalance = async () => {
    try {
      setBalanceLoading(true)
      setError("") // Clear any previous errors
      // Add cache busting to ensure fresh data
      const response = await fetch(`/api/wallet/balance?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        // A balance of 0 is a valid state, not an error
        setBalance(Number(data.balance_dollars) || 0)
        console.log('✅ Balance fetched:', data.balance_dollars)
        setError("") // Ensure error is cleared on success
      } else {
        // Only set error for actual HTTP errors (4xx, 5xx)
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `HTTP ${response.status}: Failed to fetch wallet balance`
        console.error('Failed to fetch wallet balance:', errorMessage)
        // Only show error for server errors, not for client errors like 401/403
        if (response.status >= 500) {
          setError("Failed to load wallet balance. Please try again later.")
        } else if (response.status === 401 || response.status === 403) {
          setError("Authentication error. Please refresh the page.")
        } else {
          // For other errors, set balance to 0 but don't show error (might be temporary)
          setBalance(0)
          console.warn('Non-critical error fetching wallet balance:', errorMessage)
        }
      }
    } catch (err) {
      // Only show error for network errors or unexpected failures
      console.error('Error fetching wallet balance:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setError("Network error. Please check your connection and try again.")
      } else {
        // For other errors, set balance to 0 but don't show persistent error
        setBalance(0)
        console.warn('Error fetching wallet balance, defaulting to 0:', err)
      }
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

  const fetchPhoneNumbers = async () => {
    if (!user?.id) {
      console.log('🔍 [BILLING] No user ID available for fetching phone numbers')
      return
    }

    try {
      setLoadingPhoneNumbers(true)
      const response = await fetch('/api/user/phone-numbers', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.phoneNumbers) {
          const numbers = data.phoneNumbers
          setPhoneNumbers(numbers)
          
          // Calculate subscription count (total number of phone numbers purchased)
          const count = numbers.length
          setSubscriptionCount(count)
          
          // Calculate total monthly fee (sum of all monthly_fee values)
          const totalFee = numbers.reduce((sum: number, phone: any) => {
            const fee = parseFloat(phone.monthly_fee) || 0
            return sum + fee
          }, 0)
          setTotalMonthlyFee(totalFee)
          
          console.log('✅ [BILLING] Phone numbers fetched:', {
            count,
            totalMonthlyFee: totalFee
          })
        } else {
          console.warn('⚠️ [BILLING] No phone numbers found or API returned error')
          setPhoneNumbers([])
          setSubscriptionCount(0)
          setTotalMonthlyFee(0)
        }
      } else {
        console.error('❌ [BILLING] Failed to fetch phone numbers:', response.status)
        setPhoneNumbers([])
        setSubscriptionCount(0)
        setTotalMonthlyFee(0)
      }
    } catch (error) {
      console.error('❌ [BILLING] Error fetching phone numbers:', error)
      setPhoneNumbers([])
      setSubscriptionCount(0)
      setTotalMonthlyFee(0)
    } finally {
      setLoadingPhoneNumbers(false)
    }
  }

  const fetchPaymentMethods = async () => {
    if (!user?.id) {
      console.log('🔍 [BILLING] No user ID available for fetching payment methods')
      return
    }

    try {
      setLoadingPaymentMethods(true)
      const response = await fetch('/api/payments/stripe/payment-methods', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.paymentMethods) {
          setPaymentMethods(data.paymentMethods)
          console.log('✅ [BILLING] Payment methods fetched:', data.paymentMethods.length)
        } else {
          console.warn('⚠️ [BILLING] No payment methods found or API returned error')
          setPaymentMethods([])
        }
      } else {
        console.error('❌ [BILLING] Failed to fetch payment methods:', response.status)
        setPaymentMethods([])
      }
    } catch (error) {
      console.error('❌ [BILLING] Error fetching payment methods:', error)
      setPaymentMethods([])
    } finally {
      setLoadingPaymentMethods(false)
    }
  }

  const fetchTransactions = async () => {
    if (!user?.id) {
      console.log('🔍 [BILLING] No user ID available for fetching transactions')
      return
    }

    try {
      setLoadingTransactions(true)
      const response = await fetch('/api/payments/stripe/invoices?limit=10&status=paid', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.invoices) {
          // Transform invoices to transaction format
          const formattedTransactions = data.invoices.map((invoice: any) => ({
            id: invoice.id,
            date: invoice.date,
            description: invoice.description,
            amount: invoice.amountFormatted,
            status: invoice.status === 'paid' ? 'completed' : invoice.status,
            invoicePdf: invoice.invoicePdf,
            invoiceNumber: invoice.number,
          }))
          setTransactions(formattedTransactions)
          console.log('✅ [BILLING] Transactions fetched:', formattedTransactions.length)
        } else {
          console.warn('⚠️ [BILLING] No transactions found or API returned error')
          setTransactions([])
        }
      } else {
        console.error('❌ [BILLING] Failed to fetch transactions:', response.status)
        setTransactions([])
      }
    } catch (error) {
      console.error('❌ [BILLING] Error fetching transactions:', error)
      setTransactions([])
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber?: string) => {
    try {
      const response = await fetch(`/api/payments/stripe/invoices/${invoiceId}/download`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to download invoice')
      }

      // Get the PDF blob
      const blob = await response.blob()
      
      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoiceNumber || invoiceId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Invoice Downloaded",
        description: "Your invoice has been downloaded successfully.",
      })
    } catch (error) {
      console.error('❌ [BILLING] Error downloading invoice:', error)
      toast({
        title: "Download Failed",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      })
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

        // Fetch phone numbers for subscription data
        await fetchPhoneNumbers()

        // Fetch payment methods from Stripe
        await fetchPaymentMethods()

        // Fetch transactions (invoices) from Stripe
        await fetchTransactions()

        // Simulate API call for other data
        await new Promise((resolve) => setTimeout(resolve, 1000))

        setSubscriptions(mockSubscriptions)
      } catch (err) {
        console.error("Error fetching billing data:", err)
        setError("Failed to load billing data")
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.id) {
      fetchBillingData()
    } else {
      setIsLoading(false)
    }
  }, [user?.id])

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
            <TabsList className="w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
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
                <Badge variant="outline">
                  {loadingPhoneNumbers ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    subscriptionCount
                  )}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingPhoneNumbers ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    `$${totalMonthlyFee.toFixed(2)}/mo`
                  )}
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
                <Badge variant="outline">
                  {loadingPaymentMethods ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    paymentMethods.length
                  )}
                </Badge>
              </CardHeader>
              <CardContent>
                {loadingPaymentMethods ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payment methods found</p>
                ) : (
                  <div className="space-y-2">
                    {paymentMethods.map((pm) => (
                      <div key={pm.id} className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4" />
                          <span className="text-sm">
                            {pm.brand ? pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1) : 'Card'} •••• {pm.last4}
                          </span>
                          {pm.expMonth && pm.expYear && (
                            <span className="text-xs text-muted-foreground">
                              ({pm.expMonth.toString().padStart(2, '0')}/{pm.expYear})
                            </span>
                          )}
                        </div>
                        {pm.isDefault && (
                          <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
              {loadingTransactions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showAllTransactions ? transactions : transactions.slice(0, 2)).map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{transaction.amount}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.status === "completed" ? "default" : "outline"}>
                            {transaction.status === "completed" ? "Paid" : transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.invoicePdf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadInvoice(transaction.id, transaction.invoiceNumber)}
                              className="h-8 w-8 p-0"
                              title="Download Invoice"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {transactions.length > 0 && (
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAllTransactions((prev) => !prev)}
                >
                  {showAllTransactions ? "Hide" : "View All Transactions"}
                </Button>
              </CardFooter>
            )}
          </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
      <Toaster />
    </div>
  )
}
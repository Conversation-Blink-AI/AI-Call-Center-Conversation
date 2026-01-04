"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, CreditCard, ChevronDown, Pencil } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/contexts/auth-context"
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
import { toE164Format } from "@/utils/phone-utils"

interface PhoneNumber {
  id: string
  number: string
  monthly_fee: number
  status: string
  purchased_at: string
}

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number | null
  expYear: number | null
  isDefault: boolean
}

export default function SubscriptionsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null)
  const [showAllSubscriptions, setShowAllSubscriptions] = useState(false)

  // Calculate next billing date (add 1 month to purchased_at)
  const getNextBillingDate = (purchasedAt: string): string => {
    const purchasedDate = new Date(purchasedAt)
    const nextBilling = new Date(purchasedDate)
    nextBilling.setMonth(nextBilling.getMonth() + 1)
    
    return nextBilling.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`
  }

  // Get card brand icon/name
  const getCardBrandName = (brand: string): string => {
    const brandMap: Record<string, string> = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      discover: "Discover",
      jcb: "JCB",
      diners: "Diners Club",
    }
    return brandMap[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1)
  }

  const fetchPhoneNumbers = async () => {
    if (!user?.id) return

    try {
      const response = await fetch("/api/user/phone-numbers", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.phoneNumbers) {
          setPhoneNumbers(data.phoneNumbers)
        }
      }
    } catch (error) {
      console.error("Error fetching phone numbers:", error)
    }
  }

  const fetchPaymentMethods = async () => {
    if (!user?.id) return

    try {
      const response = await fetch("/api/payments/stripe/payment-methods", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.paymentMethods) {
          setPaymentMethods(data.paymentMethods)
        }
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchPhoneNumbers(), fetchPaymentMethods()])
      setLoading(false)
    }

    if (user?.id) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [user?.id])

  const handleCancelClick = (subscriptionId: string) => {
    setSelectedSubscriptionId(subscriptionId)
    setShowCancelDialog(true)
  }

  const handleCancelConfirm = async () => {
    if (!selectedSubscriptionId) return

    setCancellingId(selectedSubscriptionId)
    try {
      // TODO: Implement actual cancellation API call
      // For now, just show a toast notification
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Subscription Cancellation Requested",
        description: "Your subscription will be cancelled at the end of the billing period.",
      })

      // Update the subscription status in the UI
      setPhoneNumbers((prev) =>
        prev.map((phone) =>
          phone.id === selectedSubscriptionId ? { ...phone, status: "cancelling" } : phone
        )
      )
    } catch (error) {
      console.error("Error cancelling subscription:", error)
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCancellingId(null)
      setShowCancelDialog(false)
      setSelectedSubscriptionId(null)
    }
  }

  const defaultPaymentMethod = paymentMethods.find((pm) => pm.isDefault) || paymentMethods[0]

  // Filter active subscriptions
  const activeSubscriptions = phoneNumbers.filter(
    (phone) => phone.status === "active" || phone.status === "Active"
  )

  // Show first 3 subscriptions by default, or all if showAllSubscriptions is true
  const displayedSubscriptions = showAllSubscriptions
    ? activeSubscriptions
    : activeSubscriptions.slice(0, 3)

  if (loading) {
    return (
      <div className="h-full">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/billing")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Billing
            </Button>
          </div>
        </div>

        {/* Current Subscriptions Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Current Subscriptions
          </h2>

          {activeSubscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No active subscriptions found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {displayedSubscriptions.map((phone) => {
                const formattedNumber = toE164Format(phone.number)
                const nextBillingDate = getNextBillingDate(phone.purchased_at)
                const monthlyFee = phone.monthly_fee || 15.0

                return (
                  <Card key={phone.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Title and Price */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">Inbound Phone Number</h3>
                              <p className="text-2xl font-bold mt-1">{formatCurrency(monthlyFee)} per month</p>
                            </div>
                          </div>

                          {/* Phone Number */}
                          <div>
                            <p className="font-medium">{formattedNumber}</p>
                          </div>

                          {/* Next Billing Date */}
                          <div>
                            <p className="text-sm text-muted-foreground">Next Billing Date</p>
                            <p className="text-sm">
                              Your next billing date is {nextBillingDate}
                            </p>
                          </div>

                          {/* Payment Method */}
                          <div className="flex items-center gap-2">
                            {defaultPaymentMethod ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm">
                                    {getCardBrandName(defaultPaymentMethod.brand)} •••• {defaultPaymentMethod.last4}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  title="Edit payment method"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">No payment method on file</p>
                            )}
                          </div>
                        </div>

                        {/* Cancel Button */}
                        <div className="flex-shrink-0">
                          <Button
                            variant="outline"
                            onClick={() => handleCancelClick(phone.id)}
                            disabled={cancellingId === phone.id || phone.status === "cancelling"}
                            className="w-full md:w-auto"
                          >
                            {cancellingId === phone.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Cancelling...
                              </>
                            ) : phone.status === "cancelling" ? (
                              "Cancelling"
                            ) : (
                              "Cancel subscription"
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* View More Subscriptions Link */}
              {activeSubscriptions.length > 3 && !showAllSubscriptions && (
                <div className="flex items-center justify-center pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllSubscriptions(true)}
                    className="flex items-center gap-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                    View more subscriptions
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-8 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <span className="bg-black text-white px-2 py-1 rounded font-semibold">Stripe</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:underline">
              Learn about Stripe Billing
            </a>
            <span>|</span>
            <a href="#" className="hover:underline">
              Terms
            </a>
            <span>|</span>
            <a href="#" className="hover:underline">
              Privacy
            </a>
          </div>
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this subscription? Your phone number will remain active until the end of
              the current billing period. You will not be charged for the next billing cycle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  )
}


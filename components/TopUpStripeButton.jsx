import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { loadStripe } from '@stripe/stripe-js'
import { useToast } from './ui/use-toast'

export default function TopUpStripeButton({ amount, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  const handleTopUp = async () => {
    try {
      setLoading(true)
      setError(null)

      alert(`Initiating Stripe payment for $${amount}`)

      // Create checkout session
      const response = await fetch('/api/payments/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`API ${response.status}: ${text}`)
      }

      const { url, id } = await response.json()

      console.log('Stripe checkout response:', { url, id })

      // Preferred: direct URL redirect
      if (url) {
        console.log('Redirecting to Stripe URL:', url)
        console.log('URL type:', typeof url)
        console.log('URL length:', url.length)

        // Try different redirect methods
        try {
          window.location.href = url
        } catch (redirectError) {
          console.error('window.location.href failed:', redirectError)
          window.open(url, '_self')
        }
        return
      }

      // Fallback: redirect using sessionId
      if (id) {
        console.log('Using session ID fallback:', id)
        const configResponse = await fetch('/api/stripe/config')
        if (!configResponse.ok) {
          const errorText = await configResponse.text()
          throw new Error(`Failed to get Stripe config: ${configResponse.status} ${errorText}`)
        }
        const { publishableKey } = await configResponse.json()
        console.log('Got publishable key:', publishableKey ? 'yes' : 'no')
        const stripe = await loadStripe(publishableKey)
        if (!stripe) {
          throw new Error('Failed to load Stripe')
        }
        const { error } = await stripe.redirectToCheckout({ sessionId: id })
        if (error) throw error
        return
      }

      throw new Error('No url or session id returned from server.')

    } catch (err) {
      console.error('Stripe checkout error:', err)
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === '1') {
      // Show success toast instead of native alert
      toast({
        title: "Payment Successful!",
        description: "Your wallet will be updated shortly.",
        duration: 5000,
      })
      
      // Clean up URL parameters
      const newUrl = new URL(window.location)
      newUrl.searchParams.delete('success')
      newUrl.searchParams.delete('canceled')
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search)
      
      // Call onSuccess callback to refresh balance
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 2000) // Give webhook a moment to process
      }
    }
    
    // Also handle canceled payments
    if (urlParams.get('canceled') === '1') {
      toast({
        title: "Payment Canceled",
        description: "Your payment was canceled. No charges were made.",
        variant: "destructive",
        duration: 5000,
      })
      
      // Clean up URL parameters
      const newUrl = new URL(window.location)
      newUrl.searchParams.delete('success')
      newUrl.searchParams.delete('canceled')
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search)
    }
  }, [onSuccess, toast])

  if (error) {
    return (
      <div className="space-y-2">
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
          {error}
        </div>
        <Button
          onClick={() => setError(null)}
          variant="outline"
          size="sm"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={handleTopUp}
      disabled={loading}
      className="w-full"
    >
      {loading ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
          Processing...
        </>
      ) : (
        `Add $${amount} via Stripe`
      )}
    </Button>
  )
}
import { CheckCircle, CreditCard } from "lucide-react"

export function PricingInfo() {
  const pricingItems = [
    "Dedicated Phone Numbers – $15 per number / month",
    "Voice Call Usage – $0.11 per minute",
    "$5 Free Trial Credit – Test the platform with free wallet balance",
    "Scale anytime – Add numbers or increase call usage as your business grows",
    "Secure Payment Gateway – Safe and encrypted transactions for all payments",
    "No long-term commitments – Pay only for what you use",
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Transparent, usage-based plans for your communication needs
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Pay as You Go
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              Transparent, usage-based pricing for conversations
            </p>

            <p className="text-gray-700 font-medium mb-4">
              Perfect for flexible and scalable communication needs:
            </p>

            <ul className="space-y-3 mb-8">
              {pricingItems.map((item, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-6">
              Built for businesses running AI conversations, customer support, lead qualification, and automated voice workflows.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

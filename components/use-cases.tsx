
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

export function UseCases() {
  const useCases = [
    {
      title: "Lead Qualification Flows",
      description:
        "Automatically qualify leads with intelligent call routing. Ask the right questions and direct prospects to the appropriate sales team based on their responses.",
      benefits: [
        "Qualify leads automatically 24/7",
        "Route to correct sales representative", 
        "Collect customer information upfront",
        "Increase conversion rates by 40%",
      ],
      image: "/placeholder.svg?key=lead-qual",
    },
    {
      title: "Customer Service Routing",
      description:
        "Create smart call routing systems that direct customers to the right department instantly. Reduce wait times and improve customer satisfaction.",
      benefits: [
        "Instant department routing",
        "Reduce wait times by 60%",
        "Handle multiple languages",
        "Escalate complex issues automatically",
      ],
      image: "/placeholder.svg?key=support-routing",
    },
    {
      title: "Appointment Booking Systems", 
      description:
        "Build automated appointment booking flows that check availability, collect customer details, and confirm appointments - all through voice calls.",
      benefits: [
        "24/7 appointment booking",
        "Calendar integration",
        "Automatic confirmations & reminders",
        "Reduce no-shows by 35%",
      ],
      image: "/placeholder.svg?key=appointment",
    },
  ]

  return (
    <section className="py-20 bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Build flows for any use case
          </h2>
          <p className="text-xl text-gray-300">
            From lead qualification to customer support, create intelligent call flows that solve real business problems.
          </p>
        </div>

        <div className="space-y-24">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className={`flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-12 items-center`}
            >
              <div className="lg:w-1/2">
                <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-xl bg-gray-800 p-8">
                  {/* Simple flowchart visualization for each use case */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="inline-block bg-green-600 rounded-lg p-3 text-white text-sm font-medium">
                        📞 Incoming Call
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-px h-6 bg-gray-600"></div>
                    </div>
                    <div className="text-center">
                      <div className="inline-block bg-blue-600 rounded-lg p-3 text-white text-sm max-w-[200px]">
                        {index === 0 && "What's your interest level?"}
                        {index === 1 && "Which department do you need?"}
                        {index === 2 && "Book an appointment?"}
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-px h-6 bg-gray-600"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="bg-purple-600 rounded p-2 text-white text-xs">
                        {index === 0 && "High Interest"}
                        {index === 1 && "Sales"}
                        {index === 2 && "Available Times"}
                      </div>
                      <div className="bg-orange-600 rounded p-2 text-white text-xs">
                        {index === 0 && "Medium Interest"}
                        {index === 1 && "Support"}
                        {index === 2 && "Reschedule"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/2">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">{useCase.title}</h3>
                <p className="text-gray-300 mb-6 text-lg">{useCase.description}</p>

                <div className="space-y-3 mb-8">
                  {useCase.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{benefit}</span>
                    </div>
                  ))}
                </div>

                <Link href="/dashboard/call-flows/editor">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                    Build This Flow <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

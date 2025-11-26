import { Workflow, Phone, BarChart3, Users, Zap, Shield } from "lucide-react"

export function FeatureCards() {
  const features = [
    {
      icon: Workflow,
      title: "Visual Flow Builder",
      description: "Design call flows with our intuitive drag-and-drop interface. No coding required - just connect nodes and build your logic visually.",
      badge: "Core Feature"
    },
    {
      icon: Phone,
      title: "Phone Number Management",
      description: "Purchase and manage phone numbers directly in the platform. Connect your flows to real phone lines instantly.",
      badge: "Integration"
    },
    {
      icon: BarChart3,
      title: "Call Analytics",
      description: "Track call performance, conversion rates, and customer interactions with detailed analytics and reporting.",
      badge: "Analytics"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Work together on call flows with your team. Share, edit, and manage flows with role-based access control.",
      badge: "Collaboration"
    },
    {
      icon: Zap,
      title: "Instant Deployment",
      description: "Deploy your call flows instantly. Test with our built-in simulator and go live with one click.",
      badge: "Deployment"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "SOC 2 compliant with end-to-end encryption. Your call data and customer information stays secure.",
      badge: "Security"
    }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to build call flows
          </h2>
          <p className="text-xl text-gray-600">
            From visual design to deployment, our platform provides all the tools to create intelligent phone systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  {feature.badge}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
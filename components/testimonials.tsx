
export function Testimonials() {
  const testimonials = [
    {
      quote: "The visual flow builder made it so easy to create our lead qualification system. We're now qualifying 3x more leads with zero additional staff.",
      author: "Sarah Chen",
      role: "Head of Sales",
      company: "TechFlow Solutions",
      avatar: "/placeholder-user.jpg"
    },
    {
      quote: "Building call flows used to require developers and weeks of work. Now I can create and deploy a new customer service flow in under an hour.",
      author: "Michael Rodriguez", 
      role: "Operations Manager",
      company: "ServicePro Inc",
      avatar: "/placeholder-user.jpg"
    },
    {
      quote: "The drag-and-drop interface is incredibly intuitive. Our team went from concept to live call flow in just two days. The analytics help us optimize constantly.",
      author: "Emily Foster",
      role: "Customer Success Director", 
      company: "GrowthLabs",
      avatar: "/placeholder-user.jpg"
    }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What our users say
          </h2>
          <p className="text-xl text-gray-600">
            Teams love how easy it is to build and deploy call flows with our visual builder.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-xl p-8 shadow-lg">
              <div className="mb-6">
                <div className="text-yellow-400 text-xl mb-4">★★★★★</div>
                <blockquote className="text-gray-700 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
              </div>
              
              <div className="flex items-center">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                  <div className="text-sm text-gray-500">{testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

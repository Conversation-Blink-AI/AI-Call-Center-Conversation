
import { Button } from "@/components/ui/button"
import { ArrowRight, Workflow } from "lucide-react"
import Link from "next/link"

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-900 to-purple-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6">
            <Workflow className="h-16 w-16 text-white mx-auto mb-4" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Build Your First Call Flow?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join thousands of teams using our visual flowchart builder to create intelligent phone systems that work 24/7.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/signup">
              <Button className="bg-white text-blue-900 hover:bg-gray-100 text-lg px-8 py-6 h-auto">
                Start Building Free
              </Button>
            </Link>
            <Link href="/dashboard/call-flows/editor">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto">
                Try Live Demo <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <p className="text-blue-200">No credit card required. Build unlimited flows on our free plan.</p>
        </div>
      </div>
    </section>
  )
}

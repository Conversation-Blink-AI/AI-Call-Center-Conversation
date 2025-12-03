import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Rocket, 
  Workflow, 
  Phone, 
  Send, 
  Code, 
  BarChart3,
  ArrowRight,
  BookOpen,
  Zap,
  Users
} from 'lucide-react'

export default function DocsHomePage() {
  const quickLinks = [
    {
      title: 'Quick Start Guide',
      description: 'Get up and running in minutes with our step-by-step guide',
      href: '/docs/quick-start',
      icon: Rocket,
      color: 'text-blue-500'
    },
    {
      title: 'Flowchart Builder',
      description: 'Learn how to create pathways using our visual drag-and-drop builder',
      href: '/docs/flowchart-builder',
      icon: Workflow,
      color: 'text-purple-500'
    },
    {
      title: 'Node Types',
      description: 'Understand all available node types and how to use them',
      href: '/docs/node-types',
      icon: Code,
      color: 'text-green-500'
    },
    {
      title: 'Sending Calls',
      description: 'Learn how to make outbound calls with your pathways',
      href: '/docs/sending-calls',
      icon: Send,
      color: 'text-orange-500'
    },
  ]

  const features = [
    {
      title: 'Visual Flow Builder',
      description: 'Design call flows with our intuitive drag-and-drop interface. No coding required - just connect nodes and build your logic visually.',
      icon: Workflow
    },
    {
      title: 'Phone Number Management',
      description: 'Purchase and manage phone numbers directly in the platform. Connect your flows to real phone lines instantly.',
      icon: Phone
    },
    {
      title: 'AI-Powered Generation',
      description: 'Generate complete call flows using AI. Simply describe what you want, and our AI will create a pathway for you.',
      icon: Zap
    },
    {
      title: 'Team Collaboration',
      description: 'Work together on call flows with your team. Share, edit, and manage flows with role-based access control.',
      icon: Users
    },
    {
      title: 'Call Analytics',
      description: 'Track call performance, conversion rates, and customer interactions with detailed analytics and reporting.',
      icon: BarChart3
    },
    {
      title: 'API Integration',
      description: 'Integrate with your existing systems through webhooks and our developer-friendly API.',
      icon: Code
    },
  ]

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      {/* Hero Section */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <BookOpen className="h-4 w-4" />
          Welcome to Documentation
        </div>
        <h1 className="text-4xl font-bold mb-4">Conversation Platform Documentation</h1>
        <p className="text-xl text-muted-foreground mb-6 max-w-3xl">
          Learn how to build intelligent voice AI call flows, manage phone numbers, send calls, and analyze performance. 
          Everything you need to create powerful conversational AI systems.
        </p>
        <div className="flex gap-4">
          <Link href="/docs/quick-start">
            <Button size="lg" className="gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/docs/flowchart-builder">
            <Button size="lg" variant="outline" className="gap-2">
              <Workflow className="h-4 w-4" />
              Explore Flowchart Builder
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Popular Guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Icon className={`h-6 w-6 ${link.color}`} />
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                    </div>
                    <CardDescription>{link.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Getting Started Steps */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Getting Started in 3 Steps</h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div>
                  <CardTitle>Create Your First Pathway</CardTitle>
                  <CardDescription>
                    Use the visual flowchart builder to design your call flow. Drag and drop nodes to create conversations.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/docs/first-pathway">
                <Button variant="outline" className="gap-2">
                  Learn how to create a pathway
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div>
                  <CardTitle>Purchase a Phone Number</CardTitle>
                  <CardDescription>
                    Get a phone number and connect it to your pathway to start receiving calls.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/docs/purchasing-numbers">
                <Button variant="outline" className="gap-2">
                  Learn about phone numbers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div>
                  <CardTitle>Send Your First Call</CardTitle>
                  <CardDescription>
                    Make outbound calls or receive inbound calls using your configured pathway.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/docs/sending-calls">
                <Button variant="outline" className="gap-2">
                  Learn how to send calls
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Need Help Section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Can't find what you're looking for? We're here to help.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Link href="/dashboard">
            <Button variant="outline">
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/docs/api-reference">
            <Button variant="outline">
              View API Reference
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}


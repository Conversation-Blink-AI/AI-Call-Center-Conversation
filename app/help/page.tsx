"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Workflow, Mic, BarChart3, CreditCard, History, FileText, Zap, Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function HelpPage() {
  const router = useRouter()

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Help Center</h1>
          <p className="text-lg text-muted-foreground">
            Learn how to use Conversation to build and manage your AI call flows
          </p>
        </div>

        {/* Getting Started Section */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Getting Started
            </CardTitle>
            <CardDescription>New to Conversation? Start here to learn the basics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">1. Purchase a Phone Number</h3>
              <p className="text-muted-foreground mb-3">
                To make and receive calls, you need a phone number. You can purchase one directly from the platform.
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Navigate to <strong>Phone Numbers</strong> in the sidebar</li>
                <li>Click <strong>Purchase Number</strong></li>
                <li>Select your preferred area code and number type</li>
                <li>Complete the purchase (you'll need funds in your wallet)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">2. Assign a Flow to Your Number</h3>
              <p className="text-muted-foreground mb-3">
                Once you have both a call flow and a phone number, connect them together.
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Go to <strong>My Pathway</strong> to see your flows and phone numbers</li>
                <li>Click on a phone number card</li>
                <li>Select the call flow you want to assign</li>
                <li>Your number is now ready to handle calls using that flow!</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Features Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Key Features</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  Visual Flow Builder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Build call flows visually with our drag-and-drop interface. No coding required! 
                  Connect different nodes to create complex conversation logic, handle user responses, 
                  and route calls based on conditions.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Phone Number Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Purchase and manage phone numbers directly in the platform. Assign different call flows 
                  to different numbers, or use the same flow across multiple numbers. View and manage 
                  all your numbers in one place.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  AI Voices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Browse and select from a library of AI voices for your calls. Preview voices before 
                  using them, and choose the perfect voice that matches your brand and use case. 
                  Each voice has unique characteristics and ratings.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Analytics & Reporting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Track your call performance with detailed analytics. View call history, success rates, 
                  conversion metrics, and more. Use the data to optimize your call flows and improve results.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Call History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Review all your past calls in one place. See call duration, status, outcomes, and 
                  listen to recordings. Use this information to understand how your flows are performing 
                  and identify areas for improvement.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Billing & Wallet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Manage your account balance and billing information. Add funds to your wallet to 
                  purchase phone numbers and make calls. View your transaction history and manage 
                  payment methods.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Common Tasks Section */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Common Tasks
            </CardTitle>
            <CardDescription>Step-by-step guides for frequently performed actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">How to Send a Test Call</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                <li>Go to <strong>Send Call</strong> in the sidebar</li>
                <li>Select the phone number you want to use</li>
                <li>Choose the call flow (pathway) to use</li>
                <li>Enter the recipient's phone number</li>
                <li>Click <strong>Send Call</strong> to initiate the call</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">How to Edit a Call Flow</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                <li>Navigate to <strong>My Pathway</strong> or <strong>Call Flows</strong></li>
                <li>Find the flow you want to edit</li>
                <li>Click on the flow to open it in the editor</li>
                <li>Make your changes using the visual editor</li>
                <li>Save your changes - they'll be applied to all calls using that flow</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">How to View Call Analytics</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                <li>Go to <strong>Analytics</strong> in the sidebar</li>
                <li>View your dashboard with key metrics like total calls, success rate, and active flows</li>
                <li>Use filters to view data for specific time periods or phone numbers</li>
                <li>Click on individual calls to see detailed information</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">How to Add Funds to Your Wallet</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                <li>Navigate to <strong>Billing</strong> in the sidebar</li>
                <li>View your current wallet balance</li>
                <li>Click <strong>Add Funds</strong> or <strong>Top Up</strong></li>
                <li>Enter the amount you want to add</li>
                <li>Complete the payment using your preferred method</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Tips & Best Practices */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Tips & Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Designing Effective Call Flows</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Keep your flows simple and easy to follow</li>
                <li>Use clear, conversational language in your prompts</li>
                <li>Test your flows with sample calls before going live</li>
                <li>Handle common edge cases and user responses</li>
                <li>Provide clear next steps or call-to-actions</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Optimizing Call Performance</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Review your call analytics regularly to identify patterns</li>
                <li>Listen to call recordings to understand user behavior</li>
                <li>A/B test different flows to see what works best</li>
                <li>Update your flows based on real call data</li>
                <li>Monitor success rates and adjust accordingly</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Managing Your Account</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Keep your wallet funded to avoid service interruptions</li>
                <li>Organize your call flows with descriptive names</li>
                <li>Use teams and collaboration features for larger projects</li>
                <li>Regularly review and archive unused flows</li>
                <li>Keep your profile information up to date</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Help */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Need More Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              If you need additional assistance, here are some resources:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Review your <Link href="/dashboard" className="text-primary hover:underline">Dashboard</Link> for an overview of your account</li>
              <li>Visit <Link href="/dashboard/profile" className="text-primary hover:underline">Profile Settings</Link> to manage your account</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

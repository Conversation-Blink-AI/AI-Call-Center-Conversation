
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Workflow, Phone, Users } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  const [email, setEmail] = useState("")

  return (
    <section className="pt-24 pb-16 bg-gradient-to-b from-gray-900 to-gray-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 text-center lg:text-left">
            <div className="inline-block px-3 py-1 mb-6 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-blue-400 text-sm font-medium">
              No-Code Call Flow Builder
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight flex items-center justify-center lg:justify-start gap-4">
              <img
                src="/ConvLogoG.png"
                alt="Conversation.ai Logo"
                className="h-12 md:h-16 lg:h-20 w-auto object-contain"
              />
              <span className="bg-gradient-to-r from-purple-500 via-pink-600 to-blue-500 bg-clip-text text-transparent">
                Conversation
              </span>
            </h1>
            <p className="mt-6 text-xl text-gray-300 max-w-2xl">
              Create intelligent conversation flows with Conversation drag-and-drop flowchart builder. Design call routing, 
              lead qualification, and customer service flows without writing code.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <div className="flex gap-4">
                <Link href="/signup">
                  <Button className="h-12 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                    Sign Up <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="h-12 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2">
            <div className="relative">
              {/* Glowing effect behind the flowchart */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl filter blur-3xl opacity-20"></div>

              {/* Flowchart mockup */}
              <div className="relative bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <Workflow className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-white font-medium">Call Flow Builder</h3>
                      <p className="text-gray-400 text-sm">Visual Designer</p>
                    </div>
                  </div>
                </div>

                {/* Simple flowchart visualization */}
                <div className="space-y-4">
                  {/* Start node */}
                  <div className="flex justify-center">
                    <div className="bg-green-600 rounded-lg p-3 text-white text-sm font-medium flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Incoming Call
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-gray-600"></div>
                  </div>

                  {/* Greeting node */}
                  <div className="flex justify-center">
                    <div className="bg-blue-600 rounded-lg p-3 text-white text-sm font-medium max-w-[200px] text-center">
                      "Hi! How can I help you today?"
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-gray-600"></div>
                  </div>

                  {/* Decision node */}
                  <div className="flex justify-center">
                    <div className="bg-purple-600 rounded-lg p-3 text-white text-sm font-medium max-w-[180px] text-center">
                      Customer Response
                    </div>
                  </div>

                  {/* Branches */}
                  <div className="flex justify-between items-start">
                    <div className="bg-orange-600 rounded-lg p-2 text-white text-xs font-medium">
                      Sales
                    </div>
                    <div className="bg-teal-600 rounded-lg p-2 text-white text-xs font-medium">
                      Support
                    </div>
                    <div className="bg-pink-600 rounded-lg p-2 text-white text-xs font-medium">
                      Billing
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    <Users className="h-3 w-3 inline mr-1" />
                    Team collaboration
                  </div>
                  <div className="text-xs text-gray-400">
                    Drag & drop interface
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

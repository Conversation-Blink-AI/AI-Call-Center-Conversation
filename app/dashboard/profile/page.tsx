"use client"

import { useState, useEffect } from "react"
import { useAuth, type User } from "@/contexts/auth-context"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Moon, Sun, Monitor } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [profileData, setProfileData] = useState<Partial<User>>(user || {})
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p>You must be logged in to view this page.</p>
              <Button className="mt-4" onClick={() => (window.location.href = "/login")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setIsUpdating(true)

    try {
      const result = await updateProfile(profileData)

      if (result.success) {
        setSuccessMessage(result.message)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Account Settings</h1>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Profile Information</CardTitle>
              <CardDescription className="text-xs">Update your account information</CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              {successMessage && (
                <Alert className="mb-3 bg-green-50 text-green-800 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-800" />
                  <AlertDescription className="text-sm">{successMessage}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleProfileUpdate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm">First Name</Label>
                    <Input id="firstName" name="firstName" value={profileData.firstName || ""} onChange={handleChange} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                    <Input id="lastName" name="lastName" value={profileData.lastName || ""} onChange={handleChange} className="h-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profileData.email || ""}
                    onChange={handleChange}
                    disabled
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="company" className="text-sm">Company</Label>
                    <Input id="company" name="company" value={profileData.company || ""} onChange={handleChange} className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phoneNumber" className="text-sm">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={profileData.phoneNumber || ""}
                      onChange={handleChange}
                      className="h-9"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isUpdating} className="mt-2">
                  {isUpdating ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {successMessage && (
                <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-800" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <h3 className="text-lg font-medium">Change Password</h3>
                    <p className="text-sm text-gray-500">Update your password regularly for better security</p>
                  </div>
                  <Button variant="outline">Change Password</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Manage your application preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between pt-6">
                <div>
                  <h3 className="text-lg font-medium">Theme Preferences</h3>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
                <div className="flex items-center space-x-2">
                  {mounted ? (
                    <div className="flex items-center space-x-1 rounded-lg border p-1">
                      <Button
                        variant={theme === "light" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTheme("light")}
                        className="h-8 w-8 p-0"
                        title="Light theme"
                      >
                        <Sun className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTheme("dark")}
                        className="h-8 w-8 p-0"
                        title="Dark theme"
                      >
                        <Moon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setTheme("system")}
                        className="h-8 w-8 p-0"
                        title="System theme"
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 rounded-lg border p-1">
                      <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
                      <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
                      <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { useAuth, type User } from "@/contexts/auth-context"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Moon, Sun, Monitor, Eye, EyeOff } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [profileData, setProfileData] = useState<Partial<User>>(user || {})
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [metaConfigs, setMetaConfigs] = useState<Array<{
    id: string
    nickname: string
    pixel_id: string
    event_name: string
    created_at: string
  }>>([])
  const [metaConfigLoading, setMetaConfigLoading] = useState(false)
  const [metaConfigError, setMetaConfigError] = useState("")
  const [metaConfigSuccess, setMetaConfigSuccess] = useState("")
  const [newMetaConfig, setNewMetaConfig] = useState({
    nickname: "",
    pixelId: "",
    accessToken: "",
    eventName: ""
  })
  const [editingMetaConfigId, setEditingMetaConfigId] = useState<string | null>(null)
  const [editMetaConfig, setEditMetaConfig] = useState({
    nickname: "",
    pixelId: "",
    accessToken: "",
    eventName: ""
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadMetaConfigs = async () => {
    if (!user) return
    setMetaConfigLoading(true)
    setMetaConfigError("")
    try {
      const response = await fetch("/api/meta-capi/configs", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Failed to load Meta CAPI configs")
      }
      setMetaConfigs(result.configs || [])
    } catch (error: any) {
      setMetaConfigError(error.message || "Failed to load Meta CAPI configs")
    } finally {
      setMetaConfigLoading(false)
    }
  }

  useEffect(() => {
    loadMetaConfigs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")
    setIsChangingPassword(true)

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long")
      setIsChangingPassword(false)
      return
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
      })

      const result = await response.json()

      if (result.success) {
        setPasswordSuccess(result.message || "Password changed successfully")
        setNewPassword("")
        setTimeout(() => {
          setIsChangePasswordOpen(false)
          setPasswordSuccess("")
        }, 2000)
      } else {
        setPasswordError(result.message || "Failed to change password")
      }
    } catch (err) {
      setPasswordError("An unexpected error occurred. Please try again.")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleCreateMetaConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setMetaConfigError("")
    setMetaConfigSuccess("")

    try {
      const response = await fetch("/api/meta-capi/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: newMetaConfig.nickname,
          pixel_id: newMetaConfig.pixelId,
          access_token: newMetaConfig.accessToken,
          event_name: newMetaConfig.eventName
        })
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Failed to create config")
      }
      setMetaConfigSuccess("Meta CAPI config created")
      setNewMetaConfig({ nickname: "", pixelId: "", accessToken: "", eventName: "" })
      await loadMetaConfigs()
    } catch (error: any) {
      setMetaConfigError(error.message || "Failed to create config")
    }
  }

  const handleStartEditMetaConfig = (config: {
    id: string
    nickname: string
    pixel_id: string
    event_name: string
  }) => {
    setEditingMetaConfigId(config.id)
    setEditMetaConfig({
      nickname: config.nickname,
      pixelId: config.pixel_id,
      accessToken: "",
      eventName: config.event_name
    })
    setMetaConfigError("")
    setMetaConfigSuccess("")
  }

  const handleUpdateMetaConfig = async (configId: string) => {
    setMetaConfigError("")
    setMetaConfigSuccess("")
    try {
      const payload: Record<string, string> = {
        nickname: editMetaConfig.nickname,
        pixel_id: editMetaConfig.pixelId,
        event_name: editMetaConfig.eventName
      }
      if (editMetaConfig.accessToken.trim()) {
        payload.access_token = editMetaConfig.accessToken
      }

      const response = await fetch(`/api/meta-capi/configs/${configId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Failed to update config")
      }
      setMetaConfigSuccess("Meta CAPI config updated")
      setEditingMetaConfigId(null)
      setEditMetaConfig({ nickname: "", pixelId: "", accessToken: "", eventName: "" })
      await loadMetaConfigs()
    } catch (error: any) {
      setMetaConfigError(error.message || "Failed to update config")
    }
  }

  const handleDeleteMetaConfig = async (configId: string) => {
    const confirmed = window.confirm("Delete this Meta CAPI config? This cannot be undone.")
    if (!confirmed) return
    setMetaConfigError("")
    setMetaConfigSuccess("")
    try {
      const response = await fetch(`/api/meta-capi/configs/${configId}`, {
        method: "DELETE"
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete config")
      }
      setMetaConfigSuccess("Meta CAPI config deleted")
      await loadMetaConfigs()
    } catch (error: any) {
      setMetaConfigError(error.message || "Failed to delete config")
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
                  <Button variant="outline" onClick={() => setIsChangePasswordOpen(true)}>Change Password</Button>
                </div>
              </div>

              <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Enter your new password. Make sure it's at least 8 characters long.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword}>
                    <div className="space-y-4 py-4">
                      {passwordSuccess && (
                        <Alert className="bg-green-50 text-green-800 border-green-200">
                          <CheckCircle2 className="h-4 w-4 text-green-800" />
                          <AlertDescription>{passwordSuccess}</AlertDescription>
                        </Alert>
                      )}

                      {passwordError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{passwordError}</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            disabled={isChangingPassword}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                            disabled={isChangingPassword}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsChangePasswordOpen(false)
                          setNewPassword("")
                          setPasswordError("")
                          setPasswordSuccess("")
                        }}
                        disabled={isChangingPassword}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isChangingPassword}>
                        {isChangingPassword ? "Changing..." : "Change Password"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
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
              <div className="mt-8 border-t pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium">Meta CAPI Configs</h3>
                    <p className="text-sm text-muted-foreground">Store Meta Pixel credentials for Bland webhooks.</p>
                  </div>
                </div>

                {metaConfigError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{metaConfigError}</AlertDescription>
                  </Alert>
                )}

                {metaConfigSuccess && (
                  <Alert className="mt-4 bg-green-50 text-green-800 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-800" />
                    <AlertDescription className="text-sm">{metaConfigSuccess}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleCreateMetaConfig} className="mt-4 grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="meta-nickname" className="text-sm">Nickname</Label>
                      <Input
                        id="meta-nickname"
                        value={newMetaConfig.nickname}
                        onChange={(e) => setNewMetaConfig((prev) => ({ ...prev, nickname: e.target.value }))}
                        placeholder="Main Pixel"
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="meta-event-name" className="text-sm">Event Name</Label>
                      <Input
                        id="meta-event-name"
                        value={newMetaConfig.eventName}
                        onChange={(e) => setNewMetaConfig((prev) => ({ ...prev, eventName: e.target.value }))}
                        placeholder="CallLead"
                        className="h-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="meta-pixel-id" className="text-sm">Pixel ID</Label>
                      <Input
                        id="meta-pixel-id"
                        value={newMetaConfig.pixelId}
                        onChange={(e) => setNewMetaConfig((prev) => ({ ...prev, pixelId: e.target.value }))}
                        placeholder="123456789012345"
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="meta-access-token" className="text-sm">Access Token</Label>
                      <Input
                        id="meta-access-token"
                        type="password"
                        value={newMetaConfig.accessToken}
                        onChange={(e) => setNewMetaConfig((prev) => ({ ...prev, accessToken: e.target.value }))}
                        placeholder="EAAG..."
                        className="h-9"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Button type="submit" size="sm">
                      Add Config
                    </Button>
                  </div>
                </form>

                <div className="mt-6 space-y-3">
                  {metaConfigLoading && (
                    <p className="text-sm text-muted-foreground">Loading configs...</p>
                  )}

                  {!metaConfigLoading && metaConfigs.length === 0 && (
                    <p className="text-sm text-muted-foreground">No configs yet. Add your first Meta CAPI config above.</p>
                  )}

                  {!metaConfigLoading && metaConfigs.map((config) => (
                    <Card key={config.id} className="border">
                      <CardContent className="pt-4 space-y-3">
                        {editingMetaConfigId === config.id ? (
                          <>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Nickname</Label>
                                <Input
                                  value={editMetaConfig.nickname}
                                  onChange={(e) => setEditMetaConfig((prev) => ({ ...prev, nickname: e.target.value }))}
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Event Name</Label>
                                <Input
                                  value={editMetaConfig.eventName}
                                  onChange={(e) => setEditMetaConfig((prev) => ({ ...prev, eventName: e.target.value }))}
                                  className="h-8"
                                />
                              </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Pixel ID</Label>
                                <Input
                                  value={editMetaConfig.pixelId}
                                  onChange={(e) => setEditMetaConfig((prev) => ({ ...prev, pixelId: e.target.value }))}
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">New Access Token</Label>
                                <Input
                                  type="password"
                                  value={editMetaConfig.accessToken}
                                  onChange={(e) => setEditMetaConfig((prev) => ({ ...prev, accessToken: e.target.value }))}
                                  placeholder="Leave blank to keep existing"
                                  className="h-8"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdateMetaConfig(config.id)}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingMetaConfigId(null)
                                  setEditMetaConfig({ nickname: "", pixelId: "", accessToken: "", eventName: "" })
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium">{config.nickname}</p>
                                <p className="text-xs text-muted-foreground">Pixel: {config.pixel_id}</p>
                                <p className="text-xs text-muted-foreground">Event: {config.event_name}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleStartEditMetaConfig(config)}>
                                  Edit
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteMetaConfig(config.id)}>
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
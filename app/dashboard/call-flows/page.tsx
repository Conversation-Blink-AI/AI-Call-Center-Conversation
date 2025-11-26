"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

// Sample data for call flows
const callFlows = [
  {
    id: 1,
    name: "Lead Qualification",
    description: "Qualify leads based on budget, timeline, and requirements",
    status: "active",
    calls: 342,
    successRate: 68,
    lastModified: "2 days ago",
  },
  {
    id: 2,
    name: "Appointment Scheduling",
    description: "Schedule appointments with qualified leads",
    status: "active",
    calls: 215,
    successRate: 82,
    lastModified: "1 week ago",
  },
  {
    id: 3,
    name: "Customer Feedback",
    description: "Collect feedback from customers after service delivery",
    status: "active",
    calls: 127,
    successRate: 91,
    lastModified: "3 days ago",
  },
  {
    id: 4,
    name: "Renewal Reminder",
    description: "Remind customers about upcoming subscription renewals",
    status: "draft",
    calls: 0,
    successRate: 0,
    lastModified: "1 day ago",
  },
  {
    id: 5,
    name: "Support Triage",
    description: "Initial triage for support calls to determine urgency",
    status: "draft",
    calls: 0,
    successRate: 0,
    lastModified: "5 hours ago",
  },
]

export default function CallFlowsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [pathways, setPathways] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newPathwayName, setNewPathwayName] = useState('')
  const [newPathwayDescription, setNewPathwayDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadPathways()
  }, [user])

  // Show success message if redirected from generate page
  useEffect(() => {
    const savedPathwayId = searchParams.get('saved')
    if (savedPathwayId) {
      toast.success('Pathway saved successfully! You can now edit it or assign it to a phone number.')
      // Remove the query parameter from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('saved')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])


  // Filter call flows based on search query and active tab
  const filteredFlows = callFlows.filter((flow) => {
    const matchesSearch =
      flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flow.description.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === "all") return matchesSearch
    if (activeTab === "active") return matchesSearch && flow.status === "active"
    if (activeTab === "draft") return matchesSearch && flow.status === "draft"

    return matchesSearch
  })

  // Mock function to load pathways (replace with actual API call)
  const loadPathways = async () => {
    setIsLoading(true)
    // Replace with your actual API endpoint to fetch pathways
    // const response = await fetch('/api/pathways')
    // const data = await response.json()
    // setPathways(data)

    // Mock data for now
    setPathways([
      {
        id: 'pathway-1',
        name: 'Initial Sales Outreach',
        description: 'Engage potential customers and guide them through the sales funnel.',
        createdAt: '2023-10-26T10:00:00Z',
        updatedAt: '2023-10-26T12:30:00Z',
        nodes: 10,
        edges: 15,
      },
      {
        id: 'pathway-2',
        name: 'Customer Onboarding',
        description: 'Welcome new users and help them get started with the product.',
        createdAt: '2023-10-25T09:00:00Z',
        updatedAt: '2023-10-25T11:00:00Z',
        nodes: 8,
        edges: 12,
      },
    ])
    setIsLoading(false)
  }

  // Function to handle creating a new pathway
  const handleCreatePathway = async () => {
    if (!newPathwayName.trim() || !newPathwayDescription.trim()) {
      toast.error('Please enter a name and description for the pathway.')
      return
    }
    setIsCreating(true)
    try {
      // Replace with your actual API endpoint to create a pathway
      // const response = await fetch('/api/pathways', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ name: newPathwayName, description: newPathwayDescription }),
      // })
      // const createdPathway = await response.json()
      // setPathways([...pathways, createdPathway])

      // Mock creation
      const newPathway = {
        id: `pathway-${Date.now()}`,
        name: newPathwayName,
        description: newPathwayDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: 0,
        edges: 0,
      }
      setPathways([...pathways, newPathway])

      toast.success('Pathway created successfully!')
      setIsCreateDialogOpen(false)
      setNewPathwayName('')
      setNewPathwayDescription('')
      router.push(`/dashboard/pathway/edit/${newPathway.id}?created=true`)
    } catch (error) {
      console.error('Error creating pathway:', error)
      toast.error('Failed to create pathway. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  // Function to handle deleting a pathway
  const handleDeletePathway = async (pathwayId: string) => {
    // Add confirmation dialog here if needed
    if (window.confirm('Are you sure you want to delete this pathway?')) {
      try {
        // Replace with your actual API endpoint to delete a pathway
        // await fetch(`/api/pathways/${pathwayId}`, { method: 'DELETE' })
        setPathways(pathways.filter((pathway) => pathway.id !== pathwayId))
        toast.success('Pathway deleted successfully!')
      } catch (error) {
        console.error('Error deleting pathway:', error)
        toast.error('Failed to delete pathway. Please try again.')
      }
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setSearchQuery('') // Clear search when changing tabs
  }

  return (
    <PageContainer>
      <PageHeader
        title="My Call Flows"
        description="Manage and create your call flows for automated conversations."
        rightComponent={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create New Flow
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Call Flow</DialogTitle>
                <DialogDescription>Enter the details for your new call flow below.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newPathwayName}
                    onChange={(e) => setNewPathwayName(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g., Lead Qualification Flow"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={newPathwayDescription}
                    onChange={(e) => setNewPathwayDescription(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g., Qualify leads based on budget and timeline"
                  />
                </div>
              </div>
              <Button onClick={handleCreatePathway} disabled={isCreating || !newPathwayName.trim() || !newPathwayDescription.trim()}>
                {isCreating ? 'Creating...' : 'Create Flow'}
              </Button>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button
              variant={activeTab === "all" ? "default" : "outline"}
              onClick={() => handleTabChange("all")}
              className="rounded-full"
            >
              All <Badge variant="secondary" className="ml-2">{callFlows.length}</Badge>
            </Button>
            <Button
              variant={activeTab === "active" ? "default" : "outline"}
              onClick={() => handleTabChange("active")}
              className="rounded-full"
            >
              Active <Badge variant="secondary" className="ml-2">{callFlows.filter(f => f.status === 'active').length}</Badge>
            </Button>
            <Button
              variant={activeTab === "draft" ? "default" : "outline"}
              onClick={() => handleTabChange("draft")}
              className="rounded-full"
            >
              Draft <Badge variant="secondary" className="ml-2">{callFlows.filter(f => f.status === 'draft').length}</Badge>
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search flows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-background pl-8 md:w-2lg"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="text-muted-foreground">Loading your call flows...</p>
            </div>
          </div>
        ) : pathways.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed p-12">
            <Wand2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No call flows yet</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Your call flows will appear here once you create them. Click the "Create New Flow" button to get started.
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create New Flow
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Call Flow</DialogTitle>
                  <DialogDescription>Enter the details for your new call flow below.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newPathwayName}
                      onChange={(e) => setNewPathwayName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Lead Qualification Flow"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={newPathwayDescription}
                      onChange={(e) => setNewPathwayDescription(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Qualify leads based on budget and timeline"
                    />
                  </div>
                </div>
                <Button onClick={handleCreatePathway} disabled={isCreating || !newPathwayName.trim() || !newPathwayDescription.trim()}>
                  {isCreating ? 'Creating...' : 'Create Flow'}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pathways.map((pathway) => (
                <Card key={pathway.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{pathway.name}</CardTitle>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => router.push(`/dashboard/pathway/edit/${pathway.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-500"
                          onClick={() => handleDeletePathway(pathway.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{pathway.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>{pathway.nodes} Nodes</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{pathway.edges} Edges</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Updated: {new Date(pathway.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <Button
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => router.push(`/dashboard/pathway/edit/${pathway.id}`)}
                      >
                        View Flow
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </PageContainer>
  )
}
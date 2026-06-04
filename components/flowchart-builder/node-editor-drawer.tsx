'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Send, Lock, FileText, Code, HelpCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface NodeEditorDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedNode: any | null
  onUpdateNode: (nodeId: string, updates: any) => void
  availableVariables: string[]
}

export function NodeEditorDrawer({ isOpen, onClose, selectedNode, onUpdateNode, availableVariables }: NodeEditorDrawerProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  
  // Webhook settings state - must be at component level (React hooks rules)
  const [showAuthorization, setShowAuthorization] = React.useState(false);
  const [showHeaders, setShowHeaders] = React.useState(false);
  const [showBody, setShowBody] = React.useState(false);
  const [isTestingAPI, setIsTestingAPI] = React.useState(false);
  const [testResult, setTestResult] = React.useState<any>(null);
  const [metaConfigs, setMetaConfigs] = React.useState<Array<{
    id: string
    nickname: string
    pixel_id: string
    event_name: string
  }>>([]);
  const [metaConfigsLoading, setMetaConfigsLoading] = React.useState(false);
  const [metaConfigsError, setMetaConfigsError] = React.useState<string>('');
  const metaUserDataKeys = [
    'em',
    'ph',
    'fn',
    'ln',
    'ge',
    'db',
    'ct',
    'st',
    'zp',
    'country',
    'external_id',
    'client_ip_address',
    'client_user_agent',
    'fbc',
    'fbp',
    'subscription_id',
    'fb_login_id',
    'lead_id',
    'anon_id',
    'madid',
    'page_id',
    'page_scoped_user_id',
    'ctwa_clid',
    'ig_account_id',
    'ig_sid',
    'custom_data'
  ]
  
  // Static text toggle state for question nodes
  const [useStaticText, setUseStaticText] = React.useState(true);
  const [showStaticTextHelp, setShowStaticTextHelp] = React.useState(false);
  const previousNodeIdRef = React.useRef<string | null>(null);
  
  // Sync static text toggle with node data - only on node change, not on data updates
  React.useEffect(() => {
    if (selectedNode && selectedNode.id !== previousNodeIdRef.current) {
      // Only initialize toggle when switching to a different node
      previousNodeIdRef.current = selectedNode.id;
      // Default to static text if text field exists, otherwise check for prompt
      const hasText = selectedNode.data?.text && selectedNode.data.text.trim() !== '';
      const hasPrompt = selectedNode.data?.prompt && selectedNode.data.prompt.trim() !== '';
      const calculatedValue = hasText || !hasPrompt;
      setUseStaticText(calculatedValue);
    }
  }, [selectedNode]);

  React.useEffect(() => {
    const loadMetaConfigs = async () => {
      if (!selectedNode || selectedNode.type !== 'facebookPixelNode') return
      setMetaConfigsLoading(true)
      setMetaConfigsError('')
      try {
        const response = await fetch('/api/meta-capi/configs', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result?.error || 'Failed to load Meta CAPI configs')
        }
        setMetaConfigs(result.configs || [])
      } catch (error: any) {
        setMetaConfigsError(error.message || 'Failed to load Meta CAPI configs')
      } finally {
        setMetaConfigsLoading(false)
      }
    }

    loadMetaConfigs()
  }, [selectedNode?.id, selectedNode?.type])

  if (!selectedNode) return null

  const handleFieldChange = (field: string, value: any) => {
    const updates = {
      data: {
        ...selectedNode.data,
        [field]: value
      }
    }
    onUpdateNode(selectedNode.id, updates)
  }

  const handleNestedFieldChange = (field: string, nestedField: string, value: any) => {
    const currentValue = selectedNode.data[field] || {}
    const updates = {
      data: {
        ...selectedNode.data,
        [field]: {
          ...currentValue,
          [nestedField]: value
        }
      }
    }
    onUpdateNode(selectedNode.id, updates)
  }

  const handleMetaConfigSelect = (configId: string) => {
    const selectedConfig = metaConfigs.find((config) => config.id === configId)
    const updates = {
      data: {
        ...selectedNode.data,
        configId,
        configNickname: selectedConfig?.nickname || '',
        eventName: selectedConfig?.event_name || selectedNode?.data?.eventName || ''
      }
    }
    onUpdateNode(selectedNode.id, updates)
  }

  const handleUserDataMappingAdd = () => {
    const currentMappings = selectedNode.data.userDataMappings || []
    const updates = {
      data: {
        ...selectedNode.data,
        userDataMappings: [...currentMappings, { key: '', variable: '' }]
      }
    }
    onUpdateNode(selectedNode.id, updates)
  }

  const handleUserDataMappingUpdate = (index: number, field: 'key' | 'variable', value: string) => {
    const currentMappings = [...(selectedNode.data.userDataMappings || [])]
    currentMappings[index] = {
      ...currentMappings[index],
      [field]: value
    }
    const updates = {
      data: {
        ...selectedNode.data,
        userDataMappings: currentMappings
      }
    }
    onUpdateNode(selectedNode.id, updates)
  }

  const handleUserDataMappingRemove = (index: number) => {
    const currentMappings = [...(selectedNode.data.userDataMappings || [])]
    currentMappings.splice(index, 1)
    const updates = {
      data: {
        ...selectedNode.data,
        userDataMappings: currentMappings
      }
    }
    onUpdateNode(selectedNode.id, updates)
  }

  const handleExtractVarAdd = () => {
    const currentVars = selectedNode.data.extractVars || []
    const newVar = ['variable_name', 'string', 'Description of variable']
    handleFieldChange('extractVars', [...currentVars, newVar])
    
    // Scroll to bottom after adding variable
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }
    }, 100)
  }

  const handleExtractVarUpdate = (index: number, field: number, value: string) => {
    const currentVars = [...(selectedNode.data.extractVars || [])]
    currentVars[index][field] = value
    handleFieldChange('extractVars', currentVars)
  }

  const handleExtractVarRemove = (index: number) => {
    const currentVars = [...(selectedNode.data.extractVars || [])]
    currentVars.splice(index, 1)
    handleFieldChange('extractVars', currentVars)
  }

  const renderNodeFields = () => {
    try {
      if (!selectedNode || !selectedNode.data) {
        return (
          <div className="text-sm text-gray-500">
            Node data is missing. Please try selecting the node again.
          </div>
        )
      }

      const nodeType = selectedNode.type

      switch (nodeType) {
      case 'greetingNode':
      case 'Default':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Node Name</Label>
              <Input
                id="name"
                value={selectedNode.data.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Enter node name"
              />
            </div>

            <div>
              <Label htmlFor="text">Greeting Message</Label>
              <Textarea
                id="text"
                value={selectedNode.data.text || ''}
                onChange={(e) => handleFieldChange('text', e.target.value)}
                placeholder="Hey there, how are you doing today?"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="globalPrompt">Global Prompt (Optional)</Label>
              <Textarea
                id="globalPrompt"
                value={selectedNode.data.globalPrompt || ''}
                onChange={(e) => handleFieldChange('globalPrompt', e.target.value)}
                placeholder="This is a phone call. Do not use exclamation marks..."
                rows={3}
              />
            </div>

            {renderExtractVars()}
          </div>
        )

      case 'questionNode':
      case 'customerResponseNode':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Node Name</Label>
              <Input
                id="name"
                value={selectedNode.data.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Enter node name"
              />
            </div>

            {/* Static Text Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="static-text-toggle" className="text-base font-semibold">
                    Static Text
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowStaticTextHelp((prev) => !prev)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Static Text help"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  When you want the agent to say a specific dialogue. Uncheck to use AI generated text
                </p>
                {showStaticTextHelp && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Use Static Text when you need exact wording for compliance or consistency. Turn it off to let the AI
                    generate responses based on the prompt and context.
                  </p>
                )}
              </div>
              <Switch
                id="static-text-toggle"
                checked={useStaticText}
                onCheckedChange={(checked) => {
                  setUseStaticText(checked);
                  // Clear the opposite field when switching
                  if (checked) {
                    handleFieldChange('prompt', '');
                  } else {
                    handleFieldChange('text', '');
                  }
                }}
              />
            </div>

            {/* Conditional Text/Prompt Field */}
            {useStaticText ? (
              <div>
                <Label htmlFor="text">Text</Label>
                <Textarea
                  id="text"
                  value={selectedNode.data.text || ''}
                  onChange={(e) => handleFieldChange('text', e.target.value)}
                  placeholder="Exact text to be spoken by the agent"
                  rows={3}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={selectedNode.data.prompt || ''}
                  onChange={(e) => handleFieldChange('prompt', e.target.value)}
                  placeholder="Prompt for AI-generated dialogue"
                  rows={3}
                />
              </div>
            )}

            <div>
              <Label htmlFor="globalPrompt">Global Prompt (Optional)</Label>
              <Textarea
                id="globalPrompt"
                value={selectedNode.data.globalPrompt || ''}
                onChange={(e) => handleFieldChange('globalPrompt', e.target.value)}
                placeholder="Additional context or instructions..."
                rows={2}
              />
            </div>

            {/* Advanced Options - Accordion */}
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="fine-tuning-examples">
                <AccordionTrigger>Fine-tuning Examples</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <div>
                      <Label htmlFor="pathwayExamples" className="text-xs">Pathway Examples</Label>
                      <Textarea
                        id="pathwayExamples"
                        value={selectedNode.data.pathwayExamples || ''}
                        onChange={(e) => handleFieldChange('pathwayExamples', e.target.value)}
                        placeholder="Fine-tuning examples for the agent at this node for the pathways chosen"
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="conditionExamples" className="text-xs">Condition Examples</Label>
                      <Textarea
                        id="conditionExamples"
                        value={selectedNode.data.conditionExamples || ''}
                        onChange={(e) => handleFieldChange('conditionExamples', e.target.value)}
                        placeholder="Fine-tuning examples for the condition at this node"
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dialogueExamples" className="text-xs">Dialogue Examples</Label>
                      <Textarea
                        id="dialogueExamples"
                        value={selectedNode.data.dialogueExamples || ''}
                        onChange={(e) => handleFieldChange('dialogueExamples', e.target.value)}
                        placeholder="Fine-tuning examples for the dialogue at this node"
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="model-options">
                <AccordionTrigger>Model Options</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <div>
                      <Label htmlFor="modelName" className="text-xs">Model Name</Label>
                      <Input
                        id="modelName"
                        value={selectedNode.data.modelOptions?.modelName || ''}
                        onChange={(e) => handleNestedFieldChange('modelOptions', 'modelName', e.target.value)}
                        placeholder="Model name to use for this node"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="interruptionThreshold" className="text-xs">Interruption Threshold (0-1)</Label>
                      <Input
                        id="interruptionThreshold"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedNode.data.modelOptions?.interruptionThreshold ?? ''}
                        onChange={(e) => handleNestedFieldChange('modelOptions', 'interruptionThreshold', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0.5"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="temperature" className="text-xs">Temperature (0-1)</Label>
                      <Input
                        id="temperature"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedNode.data.modelOptions?.temperature ?? ''}
                        onChange={(e) => handleNestedFieldChange('modelOptions', 'temperature', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0.7"
                        className="h-8"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Extract Variables */}
            {renderExtractVars()}
          </div>
        )

      case 'facebookPixelNode':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Node Name</Label>
              <Input
                id="name"
                value={selectedNode.data.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Facebook Pixel Event"
              />
            </div>

            <div>
              <Label htmlFor="text">Display Message</Label>
              <Textarea
                id="text"
                value={selectedNode.data.text || ''}
                onChange={(e) => handleFieldChange('text', e.target.value)}
                placeholder="Tracking conversion event..."
                rows={2}
              />
            </div>

            <div className="bg-muted p-3 rounded-lg border border-border">
              <h4 className="text-sm font-semibold text-foreground mb-3">Facebook Pixel Configuration</h4>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="metaConfig">Saved Config *</Label>
                  <Select
                    value={selectedNode.data.configId || ''}
                    onValueChange={(value) => handleMetaConfigSelect(value)}
                  >
                    <SelectTrigger id="metaConfig">
                      <SelectValue placeholder={metaConfigsLoading ? "Loading configs..." : "Select a config"} />
                    </SelectTrigger>
                    <SelectContent>
                      {metaConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          {config.nickname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {metaConfigsError && (
                    <p className="text-xs text-destructive mt-1">{metaConfigsError}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Create configs in Settings → Meta CAPI Configs.</p>
                </div>

                {selectedNode.data.configId && (
                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <p>Nickname: {selectedNode.data.configNickname || 'Unknown'}</p>
                    {selectedNode.data.eventName && <p>Event: {selectedNode.data.eventName}</p>}
                  </div>
                )}

                <div>
                  <Label htmlFor="testEventCode">Test Event Code (optional)</Label>
                  <Input
                    id="testEventCode"
                    value={selectedNode.data.testEventCode || ''}
                    onChange={(e) => handleFieldChange('testEventCode', e.target.value)}
                    placeholder="TEST28924"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Only used for Meta Test Events.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Meta User Data Mappings</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUserDataMappingAdd}
                      className="h-8"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Mapping
                    </Button>
                  </div>

                  {(selectedNode.data.userDataMappings || []).map((mapping: any, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-2 items-center">
                      <Select
                        value={mapping.key || ''}
                        onValueChange={(value) => handleUserDataMappingUpdate(index, 'key', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Meta key" />
                        </SelectTrigger>
                        <SelectContent>
                          {metaUserDataKeys.map((key) => (
                            <SelectItem key={key} value={key}>
                              {key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={mapping.variable || ''}
                        onValueChange={(value) => handleUserDataMappingUpdate(index, 'variable', value)}
                        disabled={availableVariables.length === 0}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder={availableVariables.length === 0 ? "No variables yet" : "Select variable"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVariables.map((variable) => (
                            <SelectItem key={variable} value={variable}>
                              {variable}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUserDataMappingRemove(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  {(selectedNode.data.userDataMappings || []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No user data mappings yet.</p>
                  )}

                  {availableVariables.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Available variables: {availableVariables.join(', ')}
                    </p>
                  )}
                </div>

                <div className="bg-card p-2 rounded border border-border">
                  <p className="text-xs text-primary font-medium">Pre-configured Settings:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>Method: POST</li>
                    <li>Content-Type: application/json</li>
                    <li>Auto SHA-256 hashing for PII</li>
                    <li>Auto timestamp generation</li>
                    <li>Action source: phone_call</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      case 'webhookNode':
      case 'Webhook':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Node Name</Label>
              <Input
                id="name"
                value={selectedNode.data.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Webhook Request"
              />
            </div>

            <div>
              <Label htmlFor="text">Display Message</Label>
              <Textarea
                id="text"
                value={selectedNode.data.text || ''}
                onChange={(e) => handleFieldChange('text', e.target.value)}
                placeholder="Please give me a moment as I check our system.."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select
                value={selectedNode.data.method || 'POST'}
                onValueChange={(value) => handleFieldChange('method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="url">API URL</Label>
              <Input
                id="url"
                value={selectedNode.data.url || ''}
                onChange={(e) => handleFieldChange('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
              />
            </div>

            {renderWebhookSettings()}

            {renderExtractVars()}
            {renderResponseData()}
          </div>
        )

      case 'transferNode':
        return (
          <div className="space-y-4">
            {/* Basic Fields */}
            <div>
              <Label htmlFor="name">Node Name</Label>
              <Input
                id="name"
                value={selectedNode.data.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Transferring the call"
              />
            </div>

            <div>
              <Label htmlFor="text">Transfer Message (Static Text)</Label>
              <Textarea
                id="text"
                value={selectedNode.data.text || ''}
                onChange={(e) => handleFieldChange('text', e.target.value)}
                placeholder="Transferring the call now. Please hold.."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="prompt">Prompt (Dynamic Text - Alternative to Static Text)</Label>
              <Textarea
                id="prompt"
                value={selectedNode.data.prompt || ''}
                onChange={(e) => handleFieldChange('prompt', e.target.value)}
                placeholder="Generate a dynamic transfer message based on context..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="transferNumber">Transfer Number</Label>
              <Input
                id="transferNumber"
                type="tel"
                value={selectedNode.data.transferNumber || ''}
                onChange={(e) => handleFieldChange('transferNumber', e.target.value)}
                placeholder="+19547951234"
              />
            </div>

            <div>
              <Label htmlFor="condition">Condition</Label>
              <Textarea
                id="condition"
                value={selectedNode.data.condition || ''}
                onChange={(e) => handleFieldChange('condition', e.target.value)}
                placeholder="Condition that needs to be met to proceed from this node"
                rows={2}
              />
            </div>

            {/* Advanced Options - Accordion */}
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="model-options">
                <AccordionTrigger>Model Options</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <div>
                      <Label htmlFor="modelName" className="text-xs">Model Name</Label>
                      <Input
                        id="modelName"
                        value={selectedNode.data.modelOptions?.modelName || ''}
                        onChange={(e) => handleNestedFieldChange('modelOptions', 'modelName', e.target.value)}
                        placeholder="Model name to use for this node"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="interruptionThreshold" className="text-xs">Interruption Threshold (0-1)</Label>
                      <Input
                        id="interruptionThreshold"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedNode.data.modelOptions?.interruptionThreshold ?? ''}
                        onChange={(e) => handleNestedFieldChange('modelOptions', 'interruptionThreshold', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0.5"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="temperature" className="text-xs">Temperature (0-1)</Label>
                      <Input
                        id="temperature"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedNode.data.modelOptions?.temperature ?? ''}
                        onChange={(e) => handleNestedFieldChange('modelOptions', 'temperature', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0.7"
                        className="h-8"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="fine-tuning-examples">
                <AccordionTrigger>Fine-tuning Examples</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <div>
                      <Label htmlFor="pathwayExamples" className="text-xs">Pathway Examples</Label>
                      <Textarea
                        id="pathwayExamples"
                        value={selectedNode.data.pathwayExamples || ''}
                        onChange={(e) => handleFieldChange('pathwayExamples', e.target.value)}
                        placeholder="Fine-tuning examples for the agent at this node for the pathways chosen"
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="conditionExamples" className="text-xs">Condition Examples</Label>
                      <Textarea
                        id="conditionExamples"
                        value={selectedNode.data.conditionExamples || ''}
                        onChange={(e) => handleFieldChange('conditionExamples', e.target.value)}
                        placeholder="Fine-tuning examples for the condition at this node"
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dialogueExamples" className="text-xs">Dialogue Examples</Label>
                      <Textarea
                        id="dialogueExamples"
                        value={selectedNode.data.dialogueExamples || ''}
                        onChange={(e) => handleFieldChange('dialogueExamples', e.target.value)}
                        placeholder="Fine-tuning examples for the dialogue at this node"
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Extract Variables */}
            {renderExtractVars()}
          </div>
        )

      case 'endCallNode':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Node Name</Label>
              <Input
                id="name"
                value={selectedNode.data.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="End call"
              />
            </div>

            <div>
              <Label htmlFor="prompt">Goodbye Message</Label>
              <Textarea
                id="prompt"
                value={selectedNode.data.prompt || selectedNode.data.text || ''}
                onChange={(e) => handleFieldChange('prompt', e.target.value)}
                placeholder="Say goodbye to the user"
                rows={2}
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="text-sm text-gray-500">
            No editor available for this node type: {nodeType}
          </div>
        )
      }
    } catch (error: any) {
      console.error('Error rendering node fields:', error);
      return (
        <div className="p-4 border border-red-500 rounded-lg bg-red-50">
          <p className="text-sm font-semibold text-red-700 mb-2">Error loading node editor</p>
          <p className="text-xs text-red-600 mb-2">{error.message || 'Unknown error'}</p>
          <p className="text-xs text-gray-600">Node type: {selectedNode?.type || 'unknown'}</p>
        </div>
      );
    }
  }

  const handleResponseDataAdd = () => {
    const currentData = selectedNode.data.responseData || []
    const newData = { data: '$.result', name: 'response_value', context: 'Response data description' }
    handleFieldChange('responseData', [...currentData, newData])
  }

  const handleResponseDataUpdate = (index: number, field: string, value: string) => {
    const currentData = [...(selectedNode.data.responseData || [])]
    currentData[index][field] = value
    handleFieldChange('responseData', currentData)
  }

  const handleResponseDataRemove = (index: number) => {
    const currentData = [...(selectedNode.data.responseData || [])]
    currentData.splice(index, 1)
    handleFieldChange('responseData', currentData)
  }

  const renderResponseData = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Response Data</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={handleResponseDataAdd}
          className="h-8"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Data
        </Button>
      </div>

      {(selectedNode.data.responseData || []).map((responseData: any, index: number) => (
        <div key={index} className="p-3 border rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">Data {index + 1}</Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleResponseDataRemove(index)}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <Label className="text-xs">JSONPath</Label>
              <Input
                value={responseData.data || ''}
                onChange={(e) => handleResponseDataUpdate(index, 'data', e.target.value)}
                placeholder="$.result"
                className="h-8"
              />
            </div>

            <div>
              <Label className="text-xs">Variable Name</Label>
              <Input
                value={responseData.name || ''}
                onChange={(e) => handleResponseDataUpdate(index, 'name', e.target.value)}
                placeholder="response_value"
                className="h-8"
              />
            </div>

            <div>
              <Label className="text-xs">Context</Label>
              <Input
                value={responseData.context || ''}
                onChange={(e) => handleResponseDataUpdate(index, 'context', e.target.value)}
                placeholder="Description of the response data"
                className="h-8"
              />
            </div>
          </div>
        </div>
      ))}

      {(selectedNode.data.responseData || []).length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4">
          No response data configured. Click "Add Data" to start capturing API responses.
        </div>
      )}
    </div>
  )

  const handleHeaderAdd = () => {
    const currentHeaders = selectedNode.data.headers || []
    const newHeader = { key: '', value: '' }
    handleFieldChange('headers', [...currentHeaders, newHeader])
  }

  const handleHeaderUpdate = (index: number, field: string, value: string) => {
    const currentHeaders = [...(selectedNode.data.headers || [])]
    currentHeaders[index][field] = value
    handleFieldChange('headers', currentHeaders)
  }

  const handleHeaderRemove = (index: number) => {
    const currentHeaders = [...(selectedNode.data.headers || [])]
    currentHeaders.splice(index, 1)
    handleFieldChange('headers', currentHeaders)
  }

  const renderWebhookSettings = () => {
    // State hooks are now at component level (above) to comply with React hooks rules

    const handleTestAPI = async () => {
      if (!selectedNode.data.url) {
        alert('Please enter an API URL first');
        return;
      }

      setIsTestingAPI(true);
      setTestResult(null);
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        // Prepare headers
        const headers: any = {
          'Content-Type': selectedNode.data.contentType || 'application/json'
        };

        // Add custom headers
        if (selectedNode.data.headers && selectedNode.data.headers.length > 0) {
          selectedNode.data.headers.forEach((header: any) => {
            if (header.key && header.value) {
              headers[header.key] = header.value;
            }
          });
        }

        // Add authorization header
        if (selectedNode.data.authorization && selectedNode.data.authType) {
          switch (selectedNode.data.authType) {
            case 'bearer':
              headers['Authorization'] = `Bearer ${selectedNode.data.authorization}`;
              break;
            case 'apikey':
              headers['X-API-Key'] = selectedNode.data.authorization;
              break;
            case 'basic':
              headers['Authorization'] = `Basic ${btoa(selectedNode.data.authorization)}`;
              break;
          }
        }

        // Prepare request options with timeout support
        const timeout = (selectedNode.data.timeout || 10) * 1000
        const controller = new AbortController()
        timeoutId = setTimeout(() => controller.abort(), timeout)
        
        const requestOptions: RequestInit = {
          method: selectedNode.data.method || 'GET',
          headers,
          signal: controller.signal
        };

        // Add body for POST/PUT/PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(selectedNode.data.method) && selectedNode.data.body) {
          requestOptions.body = selectedNode.data.body;
        }

        console.log('?? Testing API:', selectedNode.data.url);
        console.log('?? Request options:', requestOptions);

        const response = await fetch(selectedNode.data.url, requestOptions);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        let responseData: any;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        setTestResult({
          success: true,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
          timestamp: new Date().toISOString()
        });

      } catch (error: any) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        console.error('? API Test failed:', error);
        setTestResult({
          success: false,
          error: error.message || 'Unknown error occurred',
          timestamp: new Date().toISOString()
        });
      } finally {
        setIsTestingAPI(false);
      }
    };

    return (
      <div className="space-y-4">
        {/* Authorization Section */}
        <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${
          showAuthorization 
            ? 'border-primary bg-primary/5 shadow-md' 
            : 'border-border bg-muted/50 hover:border-primary/50 hover:bg-muted'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className={`w-4 h-4 ${showAuthorization ? 'text-primary' : 'text-muted-foreground'}`} />
              <Label className="text-base font-semibold text-foreground">Authorization</Label>
              {showAuthorization && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium transition-colors ${
                showAuthorization ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {showAuthorization ? 'ON' : 'OFF'}
              </span>
              <Switch 
                checked={showAuthorization} 
                onCheckedChange={setShowAuthorization}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
              />
            </div>
          </div>

          {showAuthorization && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={selectedNode.data.authType || 'none'}
                  onValueChange={(value) => handleFieldChange('authType', value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="apikey">API Key</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Token/Key</Label>
                <Input
                  value={selectedNode.data.authorization || ''}
                  onChange={(e) => handleFieldChange('authorization', e.target.value)}
                  placeholder="Enter token or API key"
                  className="h-8"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-6 text-xs"
                >
                  Encode
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Headers Section */}
        <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${
          showHeaders 
            ? 'border-primary bg-primary/5 shadow-md' 
            : 'border-border bg-muted/50 hover:border-primary/50 hover:bg-muted'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${showHeaders ? 'text-primary' : 'text-muted-foreground'}`} />
              <Label className="text-base font-semibold text-foreground">Headers</Label>
              {showHeaders && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium transition-colors ${
                showHeaders ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {showHeaders ? 'ON' : 'OFF'}
              </span>
              <Switch 
                checked={showHeaders} 
                onCheckedChange={setShowHeaders}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
              />
            </div>
          </div>

          {showHeaders && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleHeaderAdd}
                  className="h-8"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Header
                </Button>
              </div>

              {(selectedNode.data.headers || []).map((header: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={header.key || ''}
                    onChange={(e) => handleHeaderUpdate(index, 'key', e.target.value)}
                    placeholder="Key"
                    className="h-8"
                  />
                  <Input
                    value={header.value || ''}
                    onChange={(e) => handleHeaderUpdate(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="h-8"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleHeaderRemove(index)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    ?
                  </Button>
                </div>
              ))}

              {(selectedNode.data.headers || []).length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No headers configured. Click "Add Header" to start.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body Section */}
        <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${
          showBody 
            ? 'border-primary bg-primary/5 shadow-md' 
            : 'border-border bg-muted/50 hover:border-primary/50 hover:bg-muted'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code className={`w-4 h-4 ${showBody ? 'text-primary' : 'text-muted-foreground'}`} />
              <Label className="text-base font-semibold text-foreground">Body</Label>
              {showBody && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium transition-colors ${
                showBody ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {showBody ? 'ON' : 'OFF'}
              </span>
              <Switch 
                checked={showBody} 
                onCheckedChange={setShowBody}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
              />
            </div>
          </div>

          {showBody && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Content Type</Label>
                <Select
                  value={selectedNode.data.contentType || 'application/json'}
                  onValueChange={(value) => handleFieldChange('contentType', value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="application/json">JSON</SelectItem>
                    <SelectItem value="application/x-www-form-urlencoded">Form URL Encoded</SelectItem>
                    <SelectItem value="text/plain">Text</SelectItem>
                    <SelectItem value="application/xml">XML</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Request Body</Label>
                <Textarea
                  value={selectedNode.data.body || ''}
                  onChange={(e) => handleFieldChange('body', e.target.value)}
                  placeholder='{ "key": "value" }'
                  className="h-24 font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Other Settings */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Timeout (seconds)</Label>
              <Input
                type="number"
                value={selectedNode.data.timeout || 10}
                onChange={(e) => handleFieldChange('timeout', parseInt(e.target.value) || 10)}
                className="h-8"
              />
            </div>

            <div>
              <Label className="text-xs">Retry Attempts</Label>
              <Input
                type="number"
                value={selectedNode.data.retryAttempts || 0}
                onChange={(e) => handleFieldChange('retryAttempts', parseInt(e.target.value) || 0)}
                className="h-8"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={selectedNode.data.rerouteServer || false}
              onCheckedChange={(checked) => handleFieldChange('rerouteServer', checked)}
            />
            <Label className="text-xs">Reroute through server</Label>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full h-8"
            disabled={!selectedNode.data.url || isTestingAPI}
            onClick={handleTestAPI}
          >
            <Send className="w-3 h-3 mr-2" />
            {isTestingAPI ? 'Testing...' : 'Test API Request'}
          </Button>

          {/* Test Result Display */}
          {testResult && (
            <div className="mt-3 p-3 border rounded-lg bg-muted">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">
                  {testResult.success ? '? Test Result' : '? Test Failed'}
                </Label>
                <Badge variant={testResult.success ? "default" : "destructive"} className="text-xs">
                  {testResult.success ? `${testResult.status} ${testResult.statusText}` : 'Error'}
                </Badge>
              </div>
              
              {testResult.success ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Response Data:</Label>
                    <div className="mt-1 p-2 bg-card border rounded text-xs font-mono text-foreground max-h-32 overflow-y-auto">
                      {typeof testResult.data === 'string' 
                        ? testResult.data 
                        : JSON.stringify(testResult.data, null, 2)
                      }
                    </div>
                  </div>
                  {Object.keys(testResult.headers).length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Response Headers:</Label>
                      <div className="mt-1 p-2 bg-card border rounded text-xs font-mono text-foreground max-h-20 overflow-y-auto">
                        {Object.entries(testResult.headers).slice(0, 5).map(([key, value]) => (
                          <div key={key}>{key}: {String(value)}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Label className="text-xs text-muted-foreground">Error:</Label>
                  <div className="mt-1 p-2 bg-destructive/10 border border-destructive/50 rounded text-xs text-destructive">
                    {testResult.error}
                  </div>
                </div>
              )}
              
              <div className="mt-2 text-xs text-gray-500">
                Tested at: {new Date(testResult.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }


  const renderExtractVars = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Extract Variables</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExtractVarAdd}
          className="h-8"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Variable
        </Button>
      </div>

      {(selectedNode.data.extractVars || []).map((extractVar: any[], index: number) => (
        <div key={index} className="p-3 border rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">Variable {index + 1}</Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleExtractVarRemove(index)}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <Label className="text-xs">Variable Name</Label>
              <Input
                value={extractVar[0] || ''}
                onChange={(e) => handleExtractVarUpdate(index, 0, e.target.value)}
                placeholder="variable_name"
                className="h-8"
              />
            </div>

            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={extractVar[1] || 'string'}
                onValueChange={(value) => handleExtractVarUpdate(index, 1, value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="integer">Integer</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Input
                value={extractVar[2] || ''}
                onChange={(e) => handleExtractVarUpdate(index, 2, e.target.value)}
                placeholder="Description of what to extract"
                className="h-8"
              />
            </div>
          </div>
        </div>
      ))}

      {(selectedNode.data.extractVars || []).length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4">
          No variables configured. Click "Add Variable" to start extracting data.
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Edit Node Properties</DialogTitle>
        </DialogHeader>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 node-editor-content">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" title={`ID: ${selectedNode.id}`} className="cursor-help">
              {selectedNode.type}
            </Badge>
          </div>

          {renderNodeFields()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
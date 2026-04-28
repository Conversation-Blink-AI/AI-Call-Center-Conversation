'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Send, Lock, FileText, Code, HelpCircle, RefreshCw, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface NodeEditorDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedNode: any | null
  onUpdateNode: (nodeId: string, updates: any) => void
}

export function NodeEditorDrawer({ isOpen, onClose, selectedNode, onUpdateNode }: NodeEditorDrawerProps) {
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

  // Knowledge base selection state (used by Knowledge Base node)
  const [knowledgeBases, setKnowledgeBases] = React.useState<Array<{
    id: string
    bland_kb_id: string | null
    name: string
    description: string | null
    status: string
    type: string
    kb_text: string | null
  }>>([]);
  const [knowledgeBasesLoading, setKnowledgeBasesLoading] = React.useState(false);
  const [knowledgeBasesError, setKnowledgeBasesError] = React.useState<string>('');
  const [kbResyncLoading, setKbResyncLoading] = React.useState(false);
  const [kbResyncError, setKbResyncError] = React.useState<string>('');
  const [kbResyncNotice, setKbResyncNotice] = React.useState<string>('');
  
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

  React.useEffect(() => {
    const loadKnowledgeBases = async () => {
      if (!selectedNode || selectedNode.type !== 'knowledgeBaseNode') return
      setKnowledgeBasesLoading(true)
      setKnowledgeBasesError('')
      try {
        const response = await fetch('/api/knowledge-bases', { cache: 'no-store', credentials: 'include' })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result?.error || 'Failed to load knowledge bases')
        }
        setKnowledgeBases(result.knowledgeBases || [])
      } catch (error: any) {
        setKnowledgeBasesError(error?.message || 'Failed to load knowledge bases')
      } finally {
        setKnowledgeBasesLoading(false)
      }
    }

    loadKnowledgeBases()
  }, [selectedNode?.id, selectedNode?.type])

  // Normalize headers to array format for webhook nodes when node is selected
  React.useEffect(() => {
    if (selectedNode && selectedNode.type === 'webhookNode' && selectedNode.data.headers) {
      // If headers is not an array, convert it to array format
      if (!Array.isArray(selectedNode.data.headers)) {
        const headersArray = Object.entries(selectedNode.data.headers).map(([key, val]) => ({ 
          key, 
          value: typeof val === 'string' ? val : String(val) 
        }))
        // Only update if headers actually changed format
        if (headersArray.length > 0 || Object.keys(selectedNode.data.headers).length > 0) {
          handleFieldChange('headers', headersArray)
        }
      }
    } else if (selectedNode && selectedNode.type === 'webhookNode' && !selectedNode.data.headers) {
      // Initialize headers as empty array if it doesn't exist
      handleFieldChange('headers', [])
    }
  }, [selectedNode?.id])

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

  const handleKnowledgeBaseSelect = (kbRowId: string) => {
    const selectedKb = knowledgeBases.find((kb) => kb.id === kbRowId)
    setKbResyncError('')
    setKbResyncNotice('')
    const updates = {
      data: {
        ...selectedNode.data,
        kbId: kbRowId,
        kbName: selectedKb?.name || '',
        kb: selectedKb?.kb_text || '',
      },
    }
    onUpdateNode(selectedNode.id, updates)
  }

  const handleResyncKnowledgeBase = async () => {
    const kbRowId = selectedNode?.data?.kbId
    if (!kbRowId) return
    setKbResyncLoading(true)
    setKbResyncError('')
    setKbResyncNotice('')
    try {
      const response = await fetch(`/api/knowledge-bases/${kbRowId}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to load knowledge base')
      }
      const kb = result.knowledgeBase as {
        id: string
        name: string
        kb_text: string | null
      } | null
      if (!kb) throw new Error('Knowledge base not found')

      setKnowledgeBases((current) =>
        current.map((item) =>
          item.id === kb.id ? { ...item, name: kb.name, kb_text: kb.kb_text } : item
        )
      )
      onUpdateNode(selectedNode.id, {
        data: {
          ...selectedNode.data,
          kbName: kb.name,
          kb: kb.kb_text || '',
        },
      })
      setKbResyncNotice('Pulled latest snippet from KB.')
    } catch (error: any) {
      setKbResyncError(error?.message || 'Failed to sync')
    } finally {
      setKbResyncLoading(false)
    }
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

            {/* Static Text Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="static-text-toggle-greeting" className="text-base font-semibold">
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
                id="static-text-toggle-greeting"
                checked={useStaticText}
                onCheckedChange={(checked) => {
                  setUseStaticText(checked);
                  if (checked) {
                    handleFieldChange('prompt', '');
                  } else {
                    handleFieldChange('text', '');
                  }
                }}
              />
            </div>

            {useStaticText ? (
              <div>
                <Label htmlFor="text">Greeting Message</Label>
                <AutoResizeTextarea
                  id="text"
                  value={selectedNode.data.text || ''}
                  onChange={(e) => handleFieldChange('text', e.target.value)}
                  placeholder="Exact text to be spoken by the agent"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <AutoResizeTextarea
                  id="prompt"
                  value={selectedNode.data.prompt || ''}
                  onChange={(e) => handleFieldChange('prompt', e.target.value)}
                  placeholder="Prompt for AI-generated dialogue"
                />
              </div>
            )}

            <div>
              <Label htmlFor="globalPrompt">Global Prompt (Optional)</Label>
              <AutoResizeTextarea
                id="globalPrompt"
                value={selectedNode.data.globalPrompt || ''}
                onChange={(e) => handleFieldChange('globalPrompt', e.target.value)}
                placeholder="This is a phone call. Do not use exclamation marks..."
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
                <AutoResizeTextarea
                  id="text"
                  value={selectedNode.data.text || ''}
                  onChange={(e) => handleFieldChange('text', e.target.value)}
                  placeholder="Exact text to be spoken by the agent"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <AutoResizeTextarea
                  id="prompt"
                  value={selectedNode.data.prompt || ''}
                  onChange={(e) => handleFieldChange('prompt', e.target.value)}
                  placeholder="Prompt for AI-generated dialogue"
                />
              </div>
            )}

            <div>
              <Label htmlFor="globalPrompt">Global Prompt (Optional)</Label>
              <AutoResizeTextarea
                id="globalPrompt"
                value={selectedNode.data.globalPrompt || ''}
                onChange={(e) => handleFieldChange('globalPrompt', e.target.value)}
                placeholder="Additional context or instructions..."
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

            {/* Static Text Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="static-text-toggle-fb" className="text-base font-semibold">
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
                id="static-text-toggle-fb"
                checked={useStaticText}
                onCheckedChange={(checked) => {
                  setUseStaticText(checked);
                  if (checked) {
                    handleFieldChange('prompt', '');
                  } else {
                    handleFieldChange('text', '');
                  }
                }}
              />
            </div>

            {useStaticText ? (
              <div>
                <Label htmlFor="text">Display Message</Label>
                <AutoResizeTextarea
                  id="text"
                  value={selectedNode.data.text || ''}
                  onChange={(e) => handleFieldChange('text', e.target.value)}
                  placeholder="Exact text to be spoken by the agent"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <AutoResizeTextarea
                  id="prompt"
                  value={selectedNode.data.prompt || ''}
                  onChange={(e) => handleFieldChange('prompt', e.target.value)}
                  placeholder="Prompt for AI-generated dialogue"
                />
              </div>
            )}

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

            {/* Static Text Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="static-text-toggle-webhook" className="text-base font-semibold">
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
                id="static-text-toggle-webhook"
                checked={useStaticText}
                onCheckedChange={(checked) => {
                  setUseStaticText(checked);
                  if (checked) {
                    handleFieldChange('prompt', '');
                  } else {
                    handleFieldChange('text', '');
                  }
                }}
              />
            </div>

            {useStaticText ? (
              <div>
                <Label htmlFor="text">Display Message</Label>
                <AutoResizeTextarea
                  id="text"
                  value={selectedNode.data.text || ''}
                  onChange={(e) => handleFieldChange('text', e.target.value)}
                  placeholder="Exact text to be spoken by the agent"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <AutoResizeTextarea
                  id="prompt"
                  value={selectedNode.data.prompt || ''}
                  onChange={(e) => handleFieldChange('prompt', e.target.value)}
                  placeholder="Prompt for AI-generated dialogue"
                />
              </div>
            )}

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

            {/* Static Text Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="static-text-toggle-transfer" className="text-base font-semibold">
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
                id="static-text-toggle-transfer"
                checked={useStaticText}
                onCheckedChange={(checked) => {
                  setUseStaticText(checked);
                  if (checked) {
                    handleFieldChange('prompt', '');
                  } else {
                    handleFieldChange('text', '');
                  }
                }}
              />
            </div>

            {useStaticText ? (
              <div>
                <Label htmlFor="text">Transfer Message</Label>
                <AutoResizeTextarea
                  id="text"
                  value={selectedNode.data.text || ''}
                  onChange={(e) => handleFieldChange('text', e.target.value)}
                  placeholder="Exact text to be spoken by the agent"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <AutoResizeTextarea
                  id="prompt"
                  value={selectedNode.data.prompt || ''}
                  onChange={(e) => handleFieldChange('prompt', e.target.value)}
                  placeholder="Prompt for AI-generated dialogue"
                />
              </div>
            )}

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
              <AutoResizeTextarea
                id="condition"
                value={selectedNode.data.condition || ''}
                onChange={(e) => handleFieldChange('condition', e.target.value)}
                placeholder="Condition that needs to be met to proceed from this node"
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
                      <AutoResizeTextarea
                        id="pathwayExamples"
                        value={selectedNode.data.pathwayExamples || ''}
                        onChange={(e) => handleFieldChange('pathwayExamples', e.target.value)}
                        placeholder="Fine-tuning examples for the agent at this node for the pathways chosen"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="conditionExamples" className="text-xs">Condition Examples</Label>
                      <AutoResizeTextarea
                        id="conditionExamples"
                        value={selectedNode.data.conditionExamples || ''}
                        onChange={(e) => handleFieldChange('conditionExamples', e.target.value)}
                        placeholder="Fine-tuning examples for the condition at this node"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dialogueExamples" className="text-xs">Dialogue Examples</Label>
                      <AutoResizeTextarea
                        id="dialogueExamples"
                        value={selectedNode.data.dialogueExamples || ''}
                        onChange={(e) => handleFieldChange('dialogueExamples', e.target.value)}
                        placeholder="Fine-tuning examples for the dialogue at this node"
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

      case 'knowledgeBaseNode':
      case 'Knowledge Base':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Node Name</Label>
              <Input
                id="name"
                value={selectedNode.data.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g., Restaurant Questions"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="knowledgeBase">Knowledge Base *</Label>
                {selectedNode.data.kbId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => void handleResyncKnowledgeBase()}
                    disabled={kbResyncLoading}
                  >
                    {kbResyncLoading ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-3 w-3" />
                    )}
                    Re-sync from KB
                  </Button>
                ) : null}
              </div>
              <Select
                value={selectedNode.data.kbId || ''}
                onValueChange={(value) => handleKnowledgeBaseSelect(value)}
              >
                <SelectTrigger id="knowledgeBase">
                  <SelectValue
                    placeholder={
                      knowledgeBasesLoading
                        ? 'Loading knowledge bases...'
                        : knowledgeBases.length === 0
                          ? 'No knowledge bases available'
                          : 'Select a knowledge base'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {knowledgeBases.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      {kb.name} {kb.status !== 'COMPLETED' ? `(${kb.status})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {knowledgeBasesError ? (
                <p className="text-xs text-destructive mt-1">{knowledgeBasesError}</p>
              ) : kbResyncError ? (
                <p className="text-xs text-destructive mt-1">{kbResyncError}</p>
              ) : kbResyncNotice ? (
                <p className="text-xs text-emerald-600 mt-1">{kbResyncNotice}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Manage knowledge bases in the Knowledge Base section of the dashboard.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="kb">Knowledge Base Content</Label>
              <AutoResizeTextarea
                id="kb"
                value={selectedNode.data.kb || ''}
                onChange={(e) => handleFieldChange('kb', e.target.value)}
                placeholder={'Opening Hours : 9am - 5pm\nStore Locations : 426 Ivy Street...'}
                minHeight={96}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-filled with the distilled snippet from the selected knowledge base. Edit freely to tweak
                what gets sent to the pathway as <code className="font-mono">kb</code>.
              </p>
            </div>

            <div>
              <Label htmlFor="prompt">Prompt</Label>
              <AutoResizeTextarea
                id="prompt"
                value={selectedNode.data.prompt || ''}
                onChange={(e) => handleFieldChange('prompt', e.target.value)}
                placeholder="Answer any questions the user may have by referring to the knowledge base..."
                minHeight={96}
              />
            </div>
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

            {/* Static Text Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="static-text-toggle-endcall" className="text-base font-semibold">
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
                id="static-text-toggle-endcall"
                checked={useStaticText}
                onCheckedChange={(checked) => {
                  setUseStaticText(checked);
                  if (checked) {
                    handleFieldChange('prompt', '');
                  } else {
                    handleFieldChange('text', '');
                  }
                }}
              />
            </div>

            {useStaticText ? (
              <div>
                <Label htmlFor="text">Goodbye Message</Label>
                <AutoResizeTextarea
                  id="text"
                  value={selectedNode.data.text || ''}
                  onChange={(e) => handleFieldChange('text', e.target.value)}
                  placeholder="Exact text to be spoken by the agent"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <AutoResizeTextarea
                  id="prompt"
                  value={selectedNode.data.prompt || ''}
                  onChange={(e) => handleFieldChange('prompt', e.target.value)}
                  placeholder="Prompt for AI-generated goodbye message"
                />
              </div>
            )}
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
    // Ensure headers is always an array
    let currentHeaders = selectedNode.data.headers || []
    
    // If headers is not an array (e.g., it's an object), convert it to an array
    if (!Array.isArray(currentHeaders)) {
      currentHeaders = Object.entries(currentHeaders).map(([key, val]) => ({ key, value: val }))
    }
    
    const newHeader = { key: '', value: '' }
    handleFieldChange('headers', [...currentHeaders, newHeader])
  }

  const handleHeaderUpdate = (index: number, field: string, value: string) => {
    // Ensure headers is always an array
    let currentHeaders = selectedNode.data.headers || []
    
    // If headers is not an array (e.g., it's an object), convert it to an array
    if (!Array.isArray(currentHeaders)) {
      currentHeaders = Object.entries(currentHeaders).map(([key, val]) => ({ key, value: val }))
    }
    
    // Create a new array with updated header
    const updatedHeaders = [...currentHeaders]
    if (updatedHeaders[index]) {
      updatedHeaders[index] = {
        ...updatedHeaders[index],
        [field]: value
      }
      handleFieldChange('headers', updatedHeaders)
    }
  }

  const handleHeaderRemove = (index: number) => {
    // Ensure headers is always an array
    let currentHeaders = selectedNode.data.headers || []
    
    // If headers is not an array (e.g., it's an object), convert it to an array
    if (!Array.isArray(currentHeaders)) {
      currentHeaders = Object.entries(currentHeaders).map(([key, val]) => ({ key, value: val }))
    }
    
    const updatedHeaders = [...currentHeaders]
    updatedHeaders.splice(index, 1)
    handleFieldChange('headers', updatedHeaders)
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

        // Add custom headers - ensure it's an array
        let customHeaders = selectedNode.data.headers || []
        if (!Array.isArray(customHeaders)) {
          // If headers is an object, convert to array format
          customHeaders = Object.entries(customHeaders).map(([key, val]) => ({ key, value: val }))
        }
        
        if (customHeaders.length > 0) {
          customHeaders.forEach((header: any) => {
            if (header && header.key && header.value) {
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

        const responseHeaders: Record<string, string> = {}
        try {
          if (response?.headers && typeof response.headers.forEach === "function") {
            response.headers.forEach((value, key) => {
              responseHeaders[key] = value
            })
          } else if ((response as any)?.headers) {
            Object.entries((response as any).headers).forEach(([key, value]) => {
              responseHeaders[key] = String(value)
            })
          }
        } catch (headerError) {
          console.warn("⚠️ Failed to read response headers:", headerError)
        }

        setTestResult({
          success: true,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
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

              {(() => {
                // Ensure headers is always an array for rendering
                let headers = selectedNode.data.headers || []
                if (!Array.isArray(headers)) {
                  headers = Object.entries(headers).map(([key, val]) => ({ key, value: val }))
                }
                return headers
              })().map((header: any, index: number) => (
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

              {(() => {
                // Ensure headers is always an array for length check
                let headers = selectedNode.data.headers || []
                if (!Array.isArray(headers)) {
                  headers = Object.entries(headers).map(([key, val]) => ({ key, value: val }))
                }
                return headers.length === 0
              })() && (
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
                <AutoResizeTextarea
                  value={selectedNode.data.body || ''}
                  onChange={(e) => handleFieldChange('body', e.target.value)}
                  placeholder='{ "key": "value" }'
                  className="font-mono text-sm"
                  minHeight={96}
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
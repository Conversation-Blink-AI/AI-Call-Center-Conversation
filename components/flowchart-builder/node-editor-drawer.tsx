'use client'

import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Send } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface NodeEditorDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedNode: any | null
  onUpdateNode: (nodeId: string, updates: any) => void
}

export function NodeEditorDrawer({ isOpen, onClose, selectedNode, onUpdateNode }: NodeEditorDrawerProps) {
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

  const handleExtractVarAdd = () => {
    const currentVars = selectedNode.data.extractVars || []
    const newVar = ['variable_name', 'string', 'Description of variable']
    handleFieldChange('extractVars', [...currentVars, newVar])
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

            <div>
              <Label htmlFor="text">Message</Label>
              <Textarea
                id="text"
                value={selectedNode.data.text || ''}
                onChange={(e) => handleFieldChange('text', e.target.value)}
                placeholder="What would you like to know?"
                rows={3}
              />
            </div>

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

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">Facebook Pixel Configuration</h4>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="pixelId">Pixel ID *</Label>
                  <Input
                    id="pixelId"
                    value={selectedNode.data.pixelId || ''}
                    onChange={(e) => handleFieldChange('pixelId', e.target.value)}
                    placeholder="123456789012345"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your Facebook Pixel ID</p>
                </div>

                <div>
                  <Label htmlFor="accessToken">Access Token *</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={selectedNode.data.accessToken || ''}
                    onChange={(e) => handleFieldChange('accessToken', e.target.value)}
                    placeholder="EAAG..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Facebook Pixel Access Token</p>
                </div>

                <div>
                  <Label htmlFor="eventName">Event Name *</Label>
                  <Input
                    id="eventName"
                    value={selectedNode.data.eventName || ''}
                    onChange={(e) => handleFieldChange('eventName', e.target.value)}
                    placeholder="Lead"
                  />
                  <p className="text-xs text-gray-500 mt-1">Standard events: Lead, Purchase, Contact, etc.</p>
                </div>

                <div className="bg-white p-2 rounded border border-blue-100">
                  <p className="text-xs text-blue-700 font-medium">✓ Pre-configured Settings:</p>
                  <ul className="text-xs text-gray-600 mt-1 space-y-1">
                    <li>• Method: POST</li>
                    <li>• Content-Type: application/json</li>
                    <li>• Auto SHA-256 hashing for PII</li>
                    <li>• Auto timestamp generation</li>
                    <li>• Action source: voice_call</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      case 'webhookNode':
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
              <Label htmlFor="text">Transfer Message</Label>
              <Textarea
                id="text"
                value={selectedNode.data.text || ''}
                onChange={(e) => handleFieldChange('text', e.target.value)}
                placeholder="Transferring the call now. Please hold.."
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
    const [showAuthorization, setShowAuthorization] = React.useState(false);
    const [showHeaders, setShowHeaders] = React.useState(false);
    const [showBody, setShowBody] = React.useState(false);
    const [isTestingAPI, setIsTestingAPI] = React.useState(false);
    const [testResult, setTestResult] = React.useState<any>(null);

    const handleTestAPI = async () => {
      if (!selectedNode.data.url) {
        alert('Please enter an API URL first');
        return;
      }

      setIsTestingAPI(true);
      setTestResult(null);

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

        // Prepare request options
        const requestOptions: RequestInit = {
          method: selectedNode.data.method || 'GET',
          headers,
          ...(selectedNode.data.timeout && { 
            signal: AbortSignal.timeout((selectedNode.data.timeout || 10) * 1000) 
          })
        };

        // Add body for POST/PUT/PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(selectedNode.data.method) && selectedNode.data.body) {
          requestOptions.body = selectedNode.data.body;
        }

        console.log('🧪 Testing API:', selectedNode.data.url);
        console.log('🧪 Request options:', requestOptions);

        const response = await fetch(selectedNode.data.url, requestOptions);
        
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
        console.error('❌ API Test failed:', error);
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
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Authorization</Label>
            <Switch checked={showAuthorization} onCheckedChange={setShowAuthorization} />
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
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Headers</Label>
            <Switch checked={showHeaders} onCheckedChange={setShowHeaders} />
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
                    ✕
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
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Body</Label>
            <Switch checked={showBody} onCheckedChange={setShowBody} />
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
            <div className="mt-3 p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">
                  {testResult.success ? '✅ Test Result' : '❌ Test Failed'}
                </Label>
                <Badge variant={testResult.success ? "default" : "destructive"} className="text-xs">
                  {testResult.success ? `${testResult.status} ${testResult.statusText}` : 'Error'}
                </Badge>
              </div>
              
              {testResult.success ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-gray-600">Response Data:</Label>
                    <div className="mt-1 p-2 bg-white border rounded text-xs font-mono max-h-32 overflow-y-auto">
                      {typeof testResult.data === 'string' 
                        ? testResult.data 
                        : JSON.stringify(testResult.data, null, 2)
                      }
                    </div>
                  </div>
                  {Object.keys(testResult.headers).length > 0 && (
                    <div>
                      <Label className="text-xs text-gray-600">Response Headers:</Label>
                      <div className="mt-1 p-2 bg-white border rounded text-xs font-mono max-h-20 overflow-y-auto">
                        {Object.entries(testResult.headers).slice(0, 5).map(([key, value]) => (
                          <div key={key}>{key}: {String(value)}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Label className="text-xs text-gray-600">Error:</Label>
                  <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-96 sm:w-[400px] flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Edit Node Properties</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-6 space-y-4 pr-2">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{selectedNode.type}</Badge>
            <span className="text-sm text-gray-500">ID: {selectedNode.id}</span>
          </div>

          {renderNodeFields()}
        </div>
      </SheetContent>
    </Sheet>
  )
}
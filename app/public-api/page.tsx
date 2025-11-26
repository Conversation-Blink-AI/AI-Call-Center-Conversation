
"use client"

import { Metadata } from 'next'

export default function PublicApiDocumentationPage() {
  const handleTestApi = () => {
    const email = (document.getElementById('test-email') as HTMLInputElement).value;
    const resultDiv = document.getElementById('test-result');
    
    if (!email) {
      if (resultDiv) resultDiv.innerHTML = '<div style="color: #ef4444; padding: 15px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;"><strong>Error:</strong> Please enter an email address</div>';
      return;
    }
    
    if (resultDiv) resultDiv.innerHTML = '<div style="color: #3b82f6; padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">🔄 Testing API...</div>';
    
    fetch(`/api/Public_api/getPurchaseNumber?email=${encodeURIComponent(email)}`)
      .then(response => response.json())
      .then(data => {
        if (resultDiv) {
          resultDiv.innerHTML = `
            <div style="padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">API Response:</h4>
              <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 14px; margin: 0;">${JSON.stringify(data, null, 2)}</pre>
            </div>
          `;
        }
      })
      .catch(error => {
        if (resultDiv) {
          resultDiv.innerHTML = `
            <div style="color: #ef4444; padding: 15px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;">
              <strong>Error:</strong> ${error.message}
            </div>
          `;
        }
      });
  };

  const handleMouseOver = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb';
  };

  const handleMouseOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.target as HTMLButtonElement).style.backgroundColor = '#3b82f6';
  };

  return (
    <div>
      <div style={{display: 'none'}}>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Public API Documentation - getPurchaseNumber</title>
        <style dangerouslySetInnerHTML={{
          __html: `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              line-height: 1.6;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8fafc;
              color: #334155;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #1e293b;
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 10px;
              margin-bottom: 30px;
              font-size: 2.5rem;
            }
            h2 {
              color: #475569;
              margin-top: 40px;
              margin-bottom: 20px;
              font-size: 1.8rem;
              border-left: 4px solid #3b82f6;
              padding-left: 15px;
            }
            h3 {
              color: #64748b;
              margin-top: 30px;
              margin-bottom: 15px;
              font-size: 1.3rem;
            }
            .endpoint-info {
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .method {
              background: #10b981;
              color: white;
              padding: 4px 12px;
              border-radius: 4px;
              font-weight: bold;
              display: inline-block;
              margin-right: 10px;
            }
            .url {
              font-family: 'Monaco', 'Menlo', monospace;
              background: #1e293b;
              color: #f8fafc;
              padding: 4px 8px;
              border-radius: 4px;
              display: inline-block;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e2e8f0;
            }
            th {
              background: #f8fafc;
              font-weight: 600;
              color: #475569;
            }
            code {
              background: #f1f5f9;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: 'Monaco', 'Menlo', monospace;
              color: #dc2626;
            }
            pre {
              background: #1e293b;
              color: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              overflow-x: auto;
              margin: 20px 0;
              line-height: 1.4;
            }
            .response-example {
              background: #f0f9ff;
              border: 1px solid #7dd3fc;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .error-example {
              background: #fef2f2;
              border: 1px solid #fca5a5;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .success-badge {
              background: #10b981;
              color: white;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 0.8rem;
              font-weight: bold;
            }
            .error-badge {
              background: #ef4444;
              color: white;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 0.8rem;
              font-weight: bold;
            }
            .info-badge {
              background: #3b82f6;
              color: white;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 0.8rem;
              font-weight: bold;
            }
            .warning-box {
              background: #fef3c7;
              border: 1px solid #fbbf24;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
            .tip-box {
              background: #dbeafe;
              border: 1px solid #60a5fa;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
          `
        }} />
      </div>
      <div>
        <div className="container">
          <h1>📚 Public API Documentation</h1>
          
          <div className="endpoint-info">
            <h2>getPurchaseNumber Endpoint</h2>
            <p><span className="method">GET</span> <span className="url">/Public_api/getPurchaseNumber</span></p>
            <p>Retrieve all purchased phone numbers for a specific user by providing their email address. This is a public API endpoint that doesn't require authentication.</p>
          </div>

          <h2>🔧 Quick Start</h2>
          <p>Get started with a simple request:</p>
          <pre>{`curl -X GET "https://your-domain.com/Public_api/getPurchaseNumber?email=user@example.com"`}</pre>

          <h2>📋 Parameters</h2>
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>email</code></td>
                <td>string</td>
                <td><span className="error-badge">Required</span></td>
                <td>The email address of the user whose phone numbers you want to retrieve</td>
              </tr>
            </tbody>
          </table>

          <h2>💻 Code Examples</h2>
          
          <h3>JavaScript/Fetch</h3>
          <pre>{`const email = "user@example.com";
const response = await fetch(\`/api/Public_api/getPurchaseNumber?email=\${encodeURIComponent(email)}\`);
const data = await response.json();

if (data.success) {
  console.log(\`Found \${data.count} phone numbers for \${data.email}\`);
  data.phoneNumbers.forEach(phone => {
    console.log(\`Number: \${phone.number}, Location: \${phone.location}\`);
  });
} else {
  console.error('Error:', data.message);
}`}</pre>

          <h3>Python</h3>
          <pre>{`import requests

email = "user@example.com"
response = requests.get(f"https://your-domain.com/Public_api/getPurchaseNumber?email={email}")
data = response.json()

if data['success']:
    print(f"Found {data['count']} phone numbers for {data['email']}")
    for phone in data['phoneNumbers']:
        print(f"Number: {phone['number']}, Location: {phone['location']}")
else:
    print(f"Error: {data['message']}")`}</pre>

          <h3>Node.js</h3>
          <pre>{`const fetch = require('node-fetch');

async function getPurchaseNumbers(email) {
  try {
    const response = await fetch(\`https://your-domain.com/Public_api/getPurchaseNumber?email=\${email}\`);
    const data = await response.json();
    
    if (data.success) {
      console.log(\`Found \${data.count} phone numbers\`);
      return data.phoneNumbers;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('API Error:', error.message);
    return [];
  }
}

// Usage
getPurchaseNumbers("user@example.com").then(numbers => {
  numbers.forEach(phone => console.log(phone.number));
});`}</pre>

          <h2>📤 Response Format</h2>

          <h3>Successful Response <span className="success-badge">200 OK</span></h3>
          <div className="response-example">
            <pre>{`{
  "success": true,
  "email": "user@example.com",
  "user_name": "John Doe",
  "phoneNumbers": [
    {
      "id": "123",
      "number": "+1234567890",
      "status": "active",
      "location": "San Francisco, CA",
      "type": "Local",
      "purchased_at": "2024-01-15T10:30:00.000Z",
      "user_id": "user-123",
      "monthly_fee": 1.50,
      "pathway_id": "pathway-456",
      "pathway_name": "Pathway 456"
    }
  ],
  "count": 1
}`}</pre>
          </div>

          <h3>User Not Found <span className="info-badge">200 OK</span></h3>
          <div className="response-example">
            <pre>{`{
  "success": false,
  "message": "User not found",
  "email": "nonexistent@example.com",
  "phoneNumbers": [],
  "count": 0
}`}</pre>
          </div>

          <h3>Missing Email Parameter <span className="error-badge">400 Bad Request</span></h3>
          <div className="error-example">
            <pre>{`{
  "success": false,
  "message": "Email parameter is required"
}`}</pre>
          </div>

          <h3>Server Error <span className="error-badge">500 Internal Server Error</span></h3>
          <div className="error-example">
            <pre>{`{
  "success": false,
  "message": "Internal server error"
}`}</pre>
          </div>

          <h2>📊 Response Fields</h2>

          <h3>Root Level Fields</h3>
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>success</code></td>
                <td>boolean</td>
                <td>Indicates if the request was successful</td>
              </tr>
              <tr>
                <td><code>email</code></td>
                <td>string</td>
                <td>The email address that was queried</td>
              </tr>
              <tr>
                <td><code>user_name</code></td>
                <td>string</td>
                <td>The name of the user (if found)</td>
              </tr>
              <tr>
                <td><code>message</code></td>
                <td>string</td>
                <td>Error message (only when success=false)</td>
              </tr>
              <tr>
                <td><code>phoneNumbers</code></td>
                <td>array</td>
                <td>Array of phone number objects</td>
              </tr>
              <tr>
                <td><code>count</code></td>
                <td>number</td>
                <td>Total number of phone numbers returned</td>
              </tr>
            </tbody>
          </table>

          <h3>Phone Number Object Fields</h3>
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>id</code></td>
                <td>string</td>
                <td>Unique identifier for the phone number</td>
              </tr>
              <tr>
                <td><code>number</code></td>
                <td>string</td>
                <td>The actual phone number (e.g., +1234567890)</td>
              </tr>
              <tr>
                <td><code>status</code></td>
                <td>string</td>
                <td>Current status (typically "active")</td>
              </tr>
              <tr>
                <td><code>location</code></td>
                <td>string</td>
                <td>Geographic location of the number</td>
              </tr>
              <tr>
                <td><code>type</code></td>
                <td>string</td>
                <td>Type of number (typically "Local")</td>
              </tr>
              <tr>
                <td><code>purchased_at</code></td>
                <td>string</td>
                <td>ISO timestamp when number was purchased</td>
              </tr>
              <tr>
                <td><code>user_id</code></td>
                <td>string</td>
                <td>ID of the user who owns the number</td>
              </tr>
              <tr>
                <td><code>monthly_fee</code></td>
                <td>number</td>
                <td>Monthly subscription fee for the number</td>
              </tr>
              <tr>
                <td><code>pathway_id</code></td>
                <td>string</td>
                <td>ID of associated pathway (if any)</td>
              </tr>
              <tr>
                <td><code>pathway_name</code></td>
                <td>string</td>
                <td>Name of associated pathway (if any)</td>
              </tr>
            </tbody>
          </table>

          <h2>⚠️ Error Handling</h2>
          <p>The API returns different HTTP status codes based on the situation:</p>
          <ul>
            <li><span className="success-badge">200 OK</span> - Request successful (even if user not found)</li>
            <li><span className="error-badge">400 Bad Request</span> - Missing required email parameter</li>
            <li><span className="error-badge">500 Internal Server Error</span> - Database connection issues or other server errors</li>
          </ul>

          <div className="warning-box">
            <strong>⚠️ Important Notes:</strong>
            <ul>
              <li>The endpoint is publicly accessible and doesn't require authentication</li>
              <li>Phone numbers are returned in descending order by purchase date (newest first)</li>
              <li>If a user has no purchased phone numbers, an empty array is returned</li>
              <li>All timestamps are in UTC format</li>
              <li>Phone numbers are trimmed of whitespace for consistency</li>
            </ul>
          </div>

          <h2>🚀 Integration Tips</h2>
          <div className="tip-box">
            <strong>💡 Best Practices:</strong>
            <ol>
              <li>Always check the <code>success</code> field before processing the response</li>
              <li>Handle the case where <code>phoneNumbers</code> array might be empty</li>
              <li>Use <code>encodeURIComponent()</code> when passing email addresses with special characters</li>
              <li>The <code>count</code> field can be used for pagination or display purposes</li>
              <li>Store the <code>pathway_id</code> if you need to correlate numbers with specific call flows</li>
            </ol>
          </div>

          <h2>📝 Rate Limiting</h2>
          <p>Currently, no rate limiting is implemented. Please use this API responsibly to ensure optimal performance for all users.</p>

          <h2>🧪 Test the API</h2>
          <div className="endpoint-info">
            <h3>Try it yourself</h3>
            <p>Enter an email address to test the getPurchaseNumber endpoint:</p>
            
            <div style={{marginTop: '20px'}}>
              <label htmlFor="test-email" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Email Address:</label>
              <input 
                type="email" 
                id="test-email" 
                placeholder="user@example.com"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '12px',
                  border: '2px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginBottom: '15px'
                }}
              />
              <br />
              <button 
                id="test-btn"
                onClick={handleTestApi}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={handleMouseOver}
                onMouseOut={handleMouseOut}
              >
                Test API
              </button>
            </div>
            
            <div id="test-result" style={{marginTop: '20px'}}></div>
          </div>

          <h2>🆘 Support</h2>
          <p>If you encounter any issues or have questions about this API, please contact our support team or check the server logs for detailed error information.</p>
        </div>
      </div>
    </div>
  )
}


"use client"

export default function PublicApiDocumentationPage() {
  const handleTestPurchaseNumber = () => {
    const email = (document.getElementById('test-email') as HTMLInputElement).value;
    const userId = (document.getElementById('test-userid') as HTMLInputElement)?.value.trim() || '';
    const orgId = (document.getElementById('test-orgid') as HTMLInputElement)?.value.trim() || '';
    const resultDiv = document.getElementById('test-result');
    
    if (!email) {
      if (resultDiv) resultDiv.innerHTML = '<div style="color: #ef4444; padding: 15px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;"><strong>Error:</strong> Please enter an email address</div>';
      return;
    }

    if (orgId && !userId) {
      if (resultDiv) resultDiv.innerHTML = '<div style="color: #ef4444; padding: 15px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;"><strong>Error:</strong> userId is required when orgId is provided</div>';
      return;
    }
    
    if (resultDiv) resultDiv.innerHTML = '<div style="color: #3b82f6; padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">🔄 Testing API...</div>';
    
    const query = new URLSearchParams({ email });
    if (userId) query.set('userId', userId);
    if (orgId) query.set('orgId', orgId);
    fetch(`/api/Public_api/getPurchaseNumber?${query.toString()}`)
      .then(response => response.json().then((data) => ({ data, status: response.status })))
      .then(({ data, status }) => {
        if (resultDiv) {
          const statusColor = status >= 200 && status < 300 ? '#10b981' : '#ef4444';
          resultDiv.innerHTML = `
            <div style="padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">
                API Response
                <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px;">HTTP ${status}</span>
              </h4>
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

  const handleTestCallHistory = () => {
    const email = (document.getElementById('call-history-email') as HTMLInputElement).value;
    const userId = (document.getElementById('call-history-userid') as HTMLInputElement).value.trim();
    const phoneNumber = (document.getElementById('call-history-phone') as HTMLInputElement).value.trim();
    const page = (document.getElementById('call-history-page') as HTMLInputElement).value || "1";
    const limit = (document.getElementById('call-history-limit') as HTMLInputElement).value || "50";
    const resultDiv = document.getElementById('call-history-result');

    if (!email || !userId || !phoneNumber) {
      if (resultDiv) resultDiv.innerHTML = '<div style="color: #ef4444; padding: 15px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;"><strong>Error:</strong> Please enter email, userId (from getPurchaseNumber), and phoneNumber (purchased number)</div>';
      return;
    }

    if (resultDiv) resultDiv.innerHTML = '<div style="color: #3b82f6; padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">🔄 Testing API...</div>';

    const query = new URLSearchParams({
      email,
      userId,
      phoneNumber,
      page,
      limit
    });

    fetch(`/api/Public_api/getCallHistory?${query.toString()}`)
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

  const handleTestGetPlans = () => {
    const platform = (document.getElementById('plans-platform') as HTMLInputElement).value.trim();
    const planId = (document.getElementById('plans-planid') as HTMLInputElement).value.trim();
    const resultDiv = document.getElementById('plans-result');

    if (resultDiv) resultDiv.innerHTML = '<div style="color: #3b82f6; padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">🔄 Testing API...</div>';

    const params = new URLSearchParams();
    if (platform) params.append('platform', platform);
    if (planId) params.append('planId', planId);
    const qs = params.toString();
    const url = `/api/Public_api/getPlans${qs ? `?${qs}` : ''}`;

    fetch(url)
      .then(response => response.json().then(data => ({ data, status: response.status })))
      .then(({ data, status }) => {
        if (resultDiv) {
          const statusColor = status >= 200 && status < 300 ? '#10b981' : '#ef4444';
          resultDiv.innerHTML = `
            <div style="padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">
                API Response
                <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px;">HTTP ${status}</span>
              </h4>
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;"><strong>URL:</strong> <code>${url}</code></p>
              <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 14px; margin: 0; max-height: 600px;">${JSON.stringify(data, null, 2)}</pre>
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

  const handleTestGetWallet = () => {
    const email = (document.getElementById('wallet-email') as HTMLInputElement).value;
    const userId = (document.getElementById('wallet-userid') as HTMLInputElement).value.trim();
    const orgId = (document.getElementById('wallet-orgid') as HTMLInputElement).value.trim();
    const resultDiv = document.getElementById('wallet-result');

    if (!email || !userId) {
      if (resultDiv) resultDiv.innerHTML = '<div style="color: #ef4444; padding: 15px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;"><strong>Error:</strong> Please enter email and userId (orgId is optional)</div>';
      return;
    }

    if (resultDiv) resultDiv.innerHTML = '<div style="color: #3b82f6; padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">🔄 Testing API...</div>';

    const query = new URLSearchParams({ email, userId });
    if (orgId) query.set('orgId', orgId);
    fetch(`/api/Public_api/getWallet?${query.toString()}`)
      .then((response) => response.json().then((data) => ({ data, status: response.status })))
      .then(({ data, status }) => {
        if (resultDiv) {
          const statusColor = status >= 200 && status < 300 ? '#10b981' : '#ef4444';
          resultDiv.innerHTML = `
            <div style="padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">
                API Response
                <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px;">HTTP ${status}</span>
              </h4>
              <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 14px; margin: 0; max-height: 600px;">${JSON.stringify(data, null, 2)}</pre>
            </div>
          `;
        }
      })
      .catch((error) => {
        if (resultDiv) {
          resultDiv.innerHTML = `<div style="color: #ef4444; padding: 15px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;"><strong>Error:</strong> ${error.message}</div>`;
        }
      });
  };

  const handleTestGetAnalytics = () => {
    const email = (document.getElementById('analytics-email') as HTMLInputElement).value;
    const userId = (document.getElementById('analytics-userid') as HTMLInputElement).value.trim();
    const orgId = (document.getElementById('analytics-orgid') as HTMLInputElement).value.trim();
    const startDate = (document.getElementById('analytics-start') as HTMLInputElement).value.trim();
    const endDate = (document.getElementById('analytics-end') as HTMLInputElement).value.trim();
    const allTime = (document.getElementById('analytics-alltime') as HTMLInputElement).checked;
    const resultDiv = document.getElementById('analytics-result');

    if (!email || !userId) {
      if (resultDiv) resultDiv.innerHTML = '<div style="color: #ef4444; padding: 15px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;"><strong>Error:</strong> Please enter email and userId (orgId is optional)</div>';
      return;
    }

    if (resultDiv) resultDiv.innerHTML = '<div style="color: #3b82f6; padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">🔄 Testing API...</div>';

    const query = new URLSearchParams({ email, userId });
    if (orgId) query.set('orgId', orgId);
    if (allTime) {
      query.set('allTime', 'true');
    } else {
      if (startDate) query.set('startDate', new Date(startDate).toISOString());
      if (endDate) query.set('endDate', new Date(endDate).toISOString());
    }

    fetch(`/api/Public_api/getAnalytics?${query.toString()}`)
      .then((response) => response.json().then((data) => ({ data, status: response.status })))
      .then(({ data, status }) => {
        if (resultDiv) {
          const statusColor = status >= 200 && status < 300 ? '#10b981' : '#ef4444';
          resultDiv.innerHTML = `
            <div style="padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">
                API Response
                <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px;">HTTP ${status}</span>
              </h4>
              <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 14px; margin: 0; max-height: 600px;">${JSON.stringify(data, null, 2)}</pre>
            </div>
          `;
        }
      })
      .catch((error) => {
        if (resultDiv) {
          resultDiv.innerHTML = `<div style="color: #ef4444; padding: 15px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px;"><strong>Error:</strong> ${error.message}</div>`;
        }
      });
  };

  const handleTestHustleHealth = (endpoint: string, resultId: string) => {
    const resultDiv = document.getElementById(resultId);
    if (resultDiv) {
      resultDiv.innerHTML =
        '<div style="color: #3b82f6; padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">🔄 Testing GET health...</div>';
    }

    fetch(endpoint)
      .then((response) => response.json().then((data) => ({ data, status: response.status })))
      .then(({ data, status }) => {
        if (resultDiv) {
          const statusColor = status >= 200 && status < 300 ? "#10b981" : "#ef4444";
          resultDiv.innerHTML = `
            <div style="padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">
                Health Response
                <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px;">HTTP ${status}</span>
              </h4>
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;"><strong>URL:</strong> <code>${endpoint}</code></p>
              <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 14px; margin: 0;">${JSON.stringify(data, null, 2)}</pre>
            </div>
          `;
        }
      })
      .catch((error) => {
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
        <title>Public API Documentation</title>
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
            .method-post {
              background: #f59e0b;
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
            input {
              background-color: #ffffff;
              color: #0f172a;
              caret-color: #0f172a;
              color-scheme: light;
            }
            input::placeholder {
              color: #64748b;
              opacity: 1;
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
          <h1>📚 API Documentation</h1>
          <p style={{ marginTop: '-10px', marginBottom: '24px', color: '#64748b' }}>
            Public endpoints for phone numbers, call history, plans, org wallet, and org analytics — plus Hustle server-to-server org/member sync.
          </p>
          
          <div className="endpoint-info">
            <h2>getPurchaseNumber Endpoint</h2>
            <p><span className="method">GET</span> <span className="url">/Public_api/getPurchaseNumber</span></p>
            <p>
              Dual-mode purchased phone numbers. With <strong>email</strong> only, returns that user&apos;s numbers (<code>scopedTo: &quot;self&quot;</code>).
              With <strong>email</strong> + <strong>userId</strong> + <strong>orgId</strong> (<code>forex_organizations.external_org_id</code>), any active org member — including <code>organization_user</code> — receives the <code>organization_admin</code>&apos;s purchased numbers (<code>scopedTo: &quot;organization_admin&quot;</code>).
            </p>
            <pre>{`# Personal numbers
curl -s "/Public_api/getPurchaseNumber?email=user@example.com"

# Org admin numbers (organization_user proxies to admin)
curl -s "/Public_api/getPurchaseNumber?email=user@example.com&userId=550e8400-e29b-41d4-a716-446655440000&orgId=6a3fa22872bf1d9f23eabc6d"`}</pre>
          </div>

          <div className="endpoint-info">
            <h2>getCallHistory Endpoint</h2>
            <p><span className="method">GET</span> <span className="url">/Public_api/getCallHistory</span></p>
            <p>
              Retrieve call history from the <code>call_logs</code> table with pagination. <strong>Email alone is not accepted.</strong> You must call{' '}
              <code>getPurchaseNumber</code> first, then pass <strong>email</strong>, <strong>userId</strong> (from that response), and <strong>phoneNumber</strong> (the purchased <code>number</code> from <code>phoneNumbers</code>) so the server can verify they all belong together.
            </p>
          </div>

          <div className="endpoint-info">
            <h2>getPlans Endpoint</h2>
            <p><span className="method">GET</span> <span className="url">/Public_api/getPlans</span></p>
            <p>
              Returns the full plan and pricing catalogue for the Call Center platform: wallet top-up tiers (<code>plans</code>), per-usage rates (<code>usagePricing</code>) for AI calls and phone numbers, supported payment providers, and product URLs. Optional query params: <code>platform</code> (currently only <code>callCenter</code>) and <code>planId</code> to fetch a single plan.
            </p>
          </div>

          <div className="endpoint-info">
            <h2>getWallet Endpoint</h2>
            <p><span className="method">GET</span> <span className="url">/Public_api/getWallet</span></p>
            <p>
              Dual-mode wallet balance (wallets are per-user). Requires <strong>email</strong> and <strong>userId</strong> (from <code>getPurchaseNumber</code>).
              Without <strong>orgId</strong>, returns the verified user&apos;s personal wallet (<code>scopedTo: &quot;self&quot;</code>).
              With <strong>orgId</strong> (<code>forex_organizations.external_org_id</code>), any active org member — including <code>organization_user</code> — receives the org owner / <code>organization_admin</code> personal wallet (<code>scopedTo: &quot;organization_admin&quot;</code>). No <code>canViewWallet</code> gate.
            </p>
            <pre>{`# Personal wallet
curl -s "/Public_api/getWallet?email=user@example.com&userId=550e8400-e29b-41d4-a716-446655440000"

# Org admin wallet (organization_user proxies to admin)
curl -s "/Public_api/getWallet?email=user@example.com&userId=550e8400-e29b-41d4-a716-446655440000&orgId=6a3fa22872bf1d9f23eabc6d"`}</pre>
          </div>

          <div className="endpoint-info">
            <h2>getAnalytics Endpoint</h2>
            <p><span className="method">GET</span> <span className="url">/Public_api/getAnalytics</span></p>
            <p>
              Dual-mode call analytics matching the <code>/dashboard/calls</code> metrics: total calls, duration, cost, transfer leads, timeframe counts, chart series, and Meta CAPI stats.
              Requires <strong>email</strong> and <strong>userId</strong>. Without <strong>orgId</strong>, returns the verified user&apos;s personal analytics (<code>scopedTo: &quot;self&quot;</code>).
              With <strong>orgId</strong>, any active org member (including <code>organization_user</code>) receives analytics for the <code>organization_admin</code> only (<code>scopedTo: &quot;organization_admin&quot;</code>).
              Optional date filters: <code>startDate</code>, <code>endDate</code>, <code>allTime=true</code>, or <code>timeframe</code> (e.g. <code>7d</code>).
            </p>
            <pre>{`# Personal analytics
curl -s "/Public_api/getAnalytics?email=user@example.com&userId=550e8400-e29b-41d4-a716-446655440000&timeframe=7d"

# Org admin analytics (organization_user proxies to admin)
curl -s "/Public_api/getAnalytics?email=user@example.com&userId=550e8400-e29b-41d4-a716-446655440000&orgId=6a3fa22872bf1d9f23eabc6d&timeframe=7d"`}</pre>
          </div>

          <h2>🔗 Hustle Integration API (Server-to-Server)</h2>
          <p>
            These endpoints are called by the Hustle backend to sync organizations, members, and Call Center permissions into the Call Center database.
            They require authentication and are <strong>not</strong> public — unlike the <code>/Public_api/*</code> routes above.
          </p>

          <div className="warning-box">
            <strong>Deprecated:</strong> <code>POST /api/webhooks/forex/organization</code> now returns <strong>410 Gone</strong>.
            Use the routes below instead.
          </div>

          <div className="endpoint-info">
            <h3>Base URL</h3>
            <p><span className="url">/api/v1/integrations/hustle</span></p>
            <p>Production example: <code>https://conversation.hustleapp.co/api/v1/integrations/hustle</code></p>
          </div>

          <div className="endpoint-info">
            <h3>Authentication headers</h3>
            <table>
              <thead>
                <tr>
                  <th>Header</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>Content-Type: application/json</code></td>
                  <td>Yes</td>
                  <td>JSON request body</td>
                </tr>
                <tr>
                  <td><code>Authorization: Bearer &lt;SUBSCRIPTION_INTERNAL_API_TOKEN&gt;</code></td>
                  <td>Yes (prod)</td>
                  <td>Shared internal token</td>
                </tr>
                <tr>
                  <td><code>X-Hustle-Timestamp</code></td>
                  <td>If HMAC enabled</td>
                  <td>Unix timestamp (seconds)</td>
                </tr>
                <tr>
                  <td><code>X-Hustle-Request-Id</code></td>
                  <td>Recommended</td>
                  <td>Unique id for tracing (logged server-side)</td>
                </tr>
                <tr>
                  <td><code>X-Hustle-Signature: sha256=&lt;hmac&gt;</code></td>
                  <td>If HMAC enabled</td>
                  <td>HMAC-SHA256 of <code>timestamp + &quot;.&quot; + rawBody</code> when <code>SUBSCRIPTION_INTERNAL_HMAC_SECRET</code> is set</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="endpoint-info">
            <h3>org-sync — Create / update organization</h3>
            <p><span className="method-post">POST</span> <span className="url">/api/v1/integrations/hustle/org-sync</span></p>
            <p>Event: <code>org.synced</code>. Upserts the organization and creates an owner membership with <code>call_center_admin</code> access.</p>
            <pre>{`{
  "event": "org.synced",
  "orgId": "6a3fa22872bf1d9f23eabc6d",
  "workspaceId": "org_6a3fa22872bf1d9f23eabc6d",
  "workspaceType": "organization",
  "ownerUserId": "507f1f77bcf86cd799439011",
  "ownerEmail": "owner@example.com",
  "ownerName": "Owner Name",
  "orgName": "Acme Corp",
  "status": "active",
  "hustlePlan": "trial",
  "createdAt": "2026-07-01T00:00:00.000Z",
  "updatedAt": "2026-07-08T00:00:00.000Z"
}`}</pre>
          </div>

          <div className="endpoint-info">
            <h3>member-sync — Invite or accept member</h3>
            <p><span className="method-post">POST</span> <span className="url">/api/v1/integrations/hustle/member-sync</span></p>
            <p>Event: <code>member.synced</code>. Used when inviting a user (<code>status: pending</code>) or when they accept (<code>status: active</code>). Returns <strong>404</strong> if the org does not exist yet.</p>
            <pre>{`{
  "event": "member.synced",
  "orgId": "6a3fa22872bf1d9f23eabc6d",
  "workspaceId": "org_6a3fa22872bf1d9f23eabc6d",
  "userId": "608a1234567890abcdef",
  "email": "member@example.com",
  "name": "Jane Doe",
  "hustleRole": "organization_user",
  "role": "no_access",
  "callCenterRole": "no_access",
  "status": "pending",
  "permissions": {
    "canBuyNumber": false,
    "canTopUpWallet": false,
    "canManageAgents": false,
    "canManageCallFlows": false,
    "canAssignNumbers": false,
    "canUseAssignedNumbers": false,
    "canEditAssignedFlow": false,
    "canViewOwnCallLogs": false,
    "canViewAllCallLogs": false,
    "canViewOrgAnalytics": false,
    "canViewWallet": false,
    "canManageBilling": false
  },
  "createdAt": "2026-07-08T00:00:00.000Z",
  "updatedAt": "2026-07-08T00:00:00.000Z"
}`}</pre>
          </div>

          <div className="endpoint-info">
            <h3>permission-sync — Update Call Center role</h3>
            <p><span className="method-post">POST</span> <span className="url">/api/v1/integrations/hustle/permission-sync</span></p>
            <p>Event: <code>member.permission.updated</code>. Updates an existing member&apos;s Call Center role and permissions. Returns <strong>404</strong> if membership not found.</p>
            <p><strong>callCenterRole values:</strong></p>
            <ul>
              <li><code>call_center_admin</code> — full Call Center access</li>
              <li><code>call_center_operator</code> — assigned numbers + own logs</li>
              <li><code>no_access</code> — no Call Center access (default for invited users)</li>
            </ul>
            <pre>{`{
  "event": "member.permission.updated",
  "orgId": "6a3fa22872bf1d9f23eabc6d",
  "workspaceId": "org_6a3fa22872bf1d9f23eabc6d",
  "userId": "608a1234567890abcdef",
  "role": "call_center_operator",
  "callCenterRole": "call_center_operator",
  "status": "active",
  "permissions": {
    "canBuyNumber": false,
    "canTopUpWallet": false,
    "canManageAgents": false,
    "canManageCallFlows": false,
    "canAssignNumbers": false,
    "canUseAssignedNumbers": true,
    "canEditAssignedFlow": true,
    "canViewOwnCallLogs": true,
    "canViewAllCallLogs": false,
    "canViewOrgAnalytics": false,
    "canViewWallet": false,
    "canManageBilling": false
  },
  "updatedAt": "2026-07-08T07:30:00.000Z"
}`}</pre>
          </div>

          <h3>Hustle integration curl example</h3>
          <pre>{`curl -X POST "https://conversation.hustleapp.co/api/v1/integrations/hustle/org-sync" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SUBSCRIPTION_INTERNAL_API_TOKEN" \\
  -H "X-Hustle-Timestamp: $(date +%s)" \\
  -H "X-Hustle-Request-Id: hustle_cc_test_001" \\
  -d '{
    "event": "org.synced",
    "orgId": "6a3fa22872bf1d9f23eabc6d",
    "workspaceId": "org_6a3fa22872bf1d9f23eabc6d",
    "workspaceType": "organization",
    "ownerUserId": "507f1f77bcf86cd799439011",
    "ownerEmail": "owner@example.com",
    "ownerName": "Owner Name",
    "orgName": "Acme Corp",
    "status": "active",
    "hustlePlan": "trial"
  }'`}</pre>

          <h3>Success response <span className="success-badge">200 OK</span></h3>
          <div className="response-example">
            <pre>{`{
  "status": "success",
  "message": "HUSTLE-ORG-SYNC processed",
  "data": {
    "externalOrgId": "6a3fa22872bf1d9f23eabc6d",
    "ownerExternalUserId": "507f1f77bcf86cd799439011",
    "localOwnerUserId": null
  }
}`}</pre>
          </div>

          <h2>🔧 Quick Start (Public APIs)</h2>
          <p>Get started with a simple request:</p>
          <pre>{`curl -X GET "https://conversation.hustleapp.co/Public_api/getPurchaseNumber?email=user@example.com"`}</pre>
          <pre>{`curl -G "https://conversation.hustleapp.co/Public_api/getCallHistory" \\
  --data-urlencode "email=user@example.com" \\
  --data-urlencode "userId=550e8400-e29b-41d4-a716-446655440000" \\
  --data-urlencode "phoneNumber=%2B1234567890" \\
  --data-urlencode "page=1" \\
  --data-urlencode "limit=50"`}</pre>

          <h2>📋 Parameters</h2>
          <h3>getPurchaseNumber</h3>
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

          <h3>getCallHistory</h3>
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
                <td>Must match the account email (same as used for getPurchaseNumber)</td>
              </tr>
              <tr>
                <td><code>userId</code></td>
                <td>string (UUID)</td>
                <td><span className="error-badge">Required</span></td>
                <td><code>userId</code> from the successful getPurchaseNumber response</td>
              </tr>
              <tr>
                <td><code>phoneNumber</code></td>
                <td>string</td>
                <td><span className="error-badge">Required</span></td>
                <td>The purchased number: <code>number</code> from a phone object in getPurchaseNumber (alias: <code>purchasedNumber</code>)</td>
              </tr>
              <tr>
                <td><code>page</code></td>
                <td>number</td>
                <td>Optional</td>
                <td>Page number (default <code>1</code>)</td>
              </tr>
              <tr>
                <td><code>limit</code></td>
                <td>number</td>
                <td>Optional</td>
                <td>Page size (default <code>50</code>)</td>
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

          <pre>{`// 1) getPurchaseNumber, then 2) getCallHistory with email + userId + purchased number
const purchaseRes = await fetch(\`/api/Public_api/getPurchaseNumber?email=\${encodeURIComponent("user@example.com")}\`);
const purchase = await purchaseRes.json();
if (!purchase.success || !purchase.phoneNumbers?.length) throw new Error(purchase.message || "No numbers");

const phoneNumber = purchase.phoneNumbers[0].number;
const userId = purchase.userId;
const email = purchase.email;

const page = 1;
const limit = 50;
const q = new URLSearchParams({
  email,
  userId,
  phoneNumber,
  page: String(page),
  limit: String(limit)
});
const response = await fetch(\`/api/Public_api/getCallHistory?\${q.toString()}\`);
const data = await response.json();

if (data.success) {
  console.log(\`Found \${data.count} calls (page \${data.page} of \${data.totalPages})\`);
  data.callLogs.forEach(call => {
    console.log(\`Call: \${call.call_id} • Status: \${call.status}\`);
  });
} else {
  console.error('Error:', data.message);
}`}</pre>

          <h3>Python</h3>
          <pre>{`import requests

email = "user@example.com"
response = requests.get(f"https://conversation.hustleapp.co/Public_api/getPurchaseNumber?email={email}")
data = response.json()

if data['success']:
    print(f"Found {data['count']} phone numbers for {data['email']}")
    for phone in data['phoneNumbers']:
        print(f"Number: {phone['number']}, Location: {phone['location']}")
else:
    print(f"Error: {data['message']}")`}</pre>

          <pre>{`import requests

base = "https://conversation.hustleapp.co/Public_api"
r = requests.get(f"{base}/getPurchaseNumber", params={"email": "user@example.com"})
purchase = r.json()
if not purchase.get("success") or not purchase.get("phoneNumbers"):
    raise SystemExit(purchase.get("message", "No numbers"))

phone = purchase["phoneNumbers"][0]
params = {
    "email": purchase["email"],
    "userId": purchase["userId"],
    "phoneNumber": phone["number"],
    "page": 1,
    "limit": 50,
}
response = requests.get(f"{base}/getCallHistory", params=params)
data = response.json()

if data['success']:
    print(f"Found {data['count']} calls for {data['email']}")
    for call in data['callLogs']:
        print(f"Call ID: {call['call_id']}, Status: {call['status']}")
else:
    print(f"Error: {data['message']}")`}</pre>

          <h3>Node.js</h3>
          <pre>{`const fetch = require('node-fetch');

async function getPurchaseNumbers(email) {
  try {
    const response = await fetch(\`https://conversation.hustleapp.co/Public_api/getPurchaseNumber?email=\${email}\`);
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

          <pre>{`const fetch = require('node-fetch');

async function getCallHistory(email, userId, phoneNumber, page = 1, limit = 50) {
  const q = new URLSearchParams({
    email,
    userId,
    phoneNumber,
    page: String(page),
    limit: String(limit)
  });
  const response = await fetch(
    \`https://conversation.hustleapp.co/Public_api/getCallHistory?\${q.toString()}\`
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  return data.callLogs;
}

// Usage: obtain userId + phoneNumber from getPurchaseNumber first
getCallHistory("user@example.com", "uuid-from-purchase", "+1234567890").then(calls => {
  calls.forEach(call => console.log(call.call_id));
});`}</pre>

          <h2>📤 Response Format</h2>

          <h3>Successful Response <span className="success-badge">200 OK</span></h3>
          <div className="response-example">
            <pre>{`{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
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
      "monthly_fee": 15.00,
      "pathway_id": "pathway-456",
      "pathway_name": "Pathway 456"
    }
  ],
  "count": 1
}`}</pre>
          </div>

          <h3>Successful Response (Call History) <span className="success-badge">200 OK</span></h3>
          <div className="response-example">
            <pre>{`{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "user_name": "John Doe",
  "callLogs": [
    {
      "id": "call-log-123",
      "call_id": "call-abc",
      "from_number": "+14155550100",
      "to_number": "+14155550200",
      "duration_seconds": 120,
      "status": "completed",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "total": 12,
  "page": 1,
  "limit": 50,
  "totalPages": 1
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
                <td><code>userId</code></td>
                <td>string (UUID)</td>
                <td>Internal user id — use for follow-up calls to avoid re-resolving by email</td>
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

          <h3>Call History Root Fields</h3>
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
                <td><code>userId</code></td>
                <td>string (UUID)</td>
                <td>Internal user id — matches the user resolved from email</td>
              </tr>
              <tr>
                <td><code>callLogs</code></td>
                <td>array</td>
                <td>Array of call log objects</td>
              </tr>
              <tr>
                <td><code>total</code></td>
                <td>number</td>
                <td>Total number of calls available</td>
              </tr>
              <tr>
                <td><code>page</code></td>
                <td>number</td>
                <td>Current page number</td>
              </tr>
              <tr>
                <td><code>limit</code></td>
                <td>number</td>
                <td>Number of items per page</td>
              </tr>
              <tr>
                <td><code>totalPages</code></td>
                <td>number</td>
                <td>Total pages available</td>
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

          <h3>Call Log Object Fields</h3>
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
                <td><code>call_id</code></td>
                <td>string</td>
                <td>Unique call identifier</td>
              </tr>
              <tr>
                <td><code>from_number</code></td>
                <td>string</td>
                <td>Caller phone number</td>
              </tr>
              <tr>
                <td><code>to_number</code></td>
                <td>string</td>
                <td>Recipient phone number</td>
              </tr>
              <tr>
                <td><code>duration_seconds</code></td>
                <td>number</td>
                <td>Call duration in seconds</td>
              </tr>
              <tr>
                <td><code>status</code></td>
                <td>string</td>
                <td>Call status</td>
              </tr>
              <tr>
                <td><code>created_at</code></td>
                <td>string</td>
                <td>Call creation timestamp (ISO)</td>
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
              <li>For <code>getCallHistory</code>, call <code>getPurchaseNumber</code> first and pass <code>email</code>, <code>userId</code>, and <code>phoneNumber</code> together — email alone is not accepted</li>
            </ol>
          </div>

          <h2>📝 Rate Limiting</h2>
          <p>Currently, no rate limiting is implemented. Please use this API responsibly to ensure optimal performance for all users.</p>

          <h2>🧪 Test the API</h2>
          <div className="endpoint-info">
            <h3>Try it yourself</h3>
            <p>Enter email for personal numbers. For org admin numbers, also pass userId + orgId:</p>
            
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
              <label htmlFor="test-userid" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>userId (required with orgId):</label>
              <input
                type="text"
                id="test-userid"
                placeholder="uuid from personal getPurchaseNumber"
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
              <label htmlFor="test-orgid" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>orgId (optional):</label>
              <input
                type="text"
                id="test-orgid"
                placeholder="Leave empty for personal numbers"
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
                onClick={handleTestPurchaseNumber}
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

          <div className="endpoint-info">
            <h3>Try getCallHistory</h3>
            <p>Call <strong>getPurchaseNumber</strong> first, then enter the same email plus <strong>userId</strong> and a <strong>purchased phone number</strong> (<code>number</code> from <code>phoneNumbers</code>):</p>

            <div style={{marginTop: '20px'}}>
              <label htmlFor="call-history-email" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Email:</label>
              <input
                type="email"
                id="call-history-email"
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
              <label htmlFor="call-history-userid" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>userId (from getPurchaseNumber):</label>
              <input
                type="text"
                id="call-history-userid"
                placeholder="uuid from purchase response"
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
              <label htmlFor="call-history-phone" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>phoneNumber (purchased number):</label>
              <input
                type="text"
                id="call-history-phone"
                placeholder="+1234567890"
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
              <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '15px'}}>
                <div>
                  <label htmlFor="call-history-page" style={{display: 'block', marginBottom: '6px', fontWeight: 'bold'}}>Page</label>
                  <input
                    type="number"
                    id="call-history-page"
                    defaultValue="1"
                    min="1"
                    style={{
                      width: '120px',
                      padding: '10px',
                      border: '2px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="call-history-limit" style={{display: 'block', marginBottom: '6px', fontWeight: 'bold'}}>Limit</label>
                  <input
                    type="number"
                    id="call-history-limit"
                    defaultValue="50"
                    min="1"
                    max="500"
                    style={{
                      width: '120px',
                      padding: '10px',
                      border: '2px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
              <button
                id="call-history-test-btn"
                onClick={handleTestCallHistory}
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
                Test Call History
              </button>
            </div>

            <div id="call-history-result" style={{marginTop: '20px'}}></div>
          </div>

          <div className="endpoint-info">
            <h3>Try getPlans</h3>
            <p>
              Both fields are <strong>optional</strong>. Leave them blank to fetch the entire pricing catalogue, set <code>platform</code> to filter (only <code>callCenter</code> is supported today), or set <code>planId</code> to fetch one plan.
            </p>

            <div style={{marginTop: '20px'}}>
              <label htmlFor="plans-platform" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>platform (optional):</label>
              <input
                type="text"
                id="plans-platform"
                placeholder="callCenter (leave blank for all)"
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
              <label htmlFor="plans-planid" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>planId (optional):</label>
              <input
                type="text"
                id="plans-planid"
                placeholder="starter | growth | pro | scale"
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
              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px'}}>
                <button
                  type="button"
                  onClick={() => {
                    (document.getElementById('plans-platform') as HTMLInputElement).value = '';
                    (document.getElementById('plans-planid') as HTMLInputElement).value = '';
                  }}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    (document.getElementById('plans-platform') as HTMLInputElement).value = 'callCenter';
                    (document.getElementById('plans-planid') as HTMLInputElement).value = '';
                  }}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Preset: callCenter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    (document.getElementById('plans-platform') as HTMLInputElement).value = '';
                    (document.getElementById('plans-planid') as HTMLInputElement).value = 'growth';
                  }}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Preset: planId=growth
                </button>
                <button
                  type="button"
                  onClick={() => {
                    (document.getElementById('plans-platform') as HTMLInputElement).value = 'lander';
                    (document.getElementById('plans-planid') as HTMLInputElement).value = '';
                  }}
                  style={{
                    background: '#fef2f2',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Preset: 404 (unknown platform)
                </button>
              </div>
              <button
                id="plans-test-btn"
                onClick={handleTestGetPlans}
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
                Test getPlans
              </button>
            </div>

            <div id="plans-result" style={{marginTop: '20px'}}></div>
          </div>

          <div className="endpoint-info">
            <h3>Try getWallet</h3>
            <p>Enter email and userId (from getPurchaseNumber). Leave orgId empty for personal wallet; set orgId for organization_admin wallet:</p>
            <div style={{marginTop: '20px'}}>
              <label htmlFor="wallet-email" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Email:</label>
              <input type="email" id="wallet-email" placeholder="user@example.com" style={{width: '100%', maxWidth: '400px', padding: '12px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', marginBottom: '15px'}} />
              <label htmlFor="wallet-userid" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>userId:</label>
              <input type="text" id="wallet-userid" placeholder="uuid from getPurchaseNumber" style={{width: '100%', maxWidth: '400px', padding: '12px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', marginBottom: '15px'}} />
              <label htmlFor="wallet-orgid" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>orgId (optional):</label>
              <input type="text" id="wallet-orgid" placeholder="Leave empty for personal wallet" style={{width: '100%', maxWidth: '400px', padding: '12px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', marginBottom: '15px'}} />
              <button type="button" onClick={handleTestGetWallet} style={{background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'}} onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>Test getWallet</button>
            </div>
            <div id="wallet-result" style={{marginTop: '20px'}}></div>
          </div>

          <div className="endpoint-info">
            <h3>Try getAnalytics</h3>
            <p>Enter email and userId. Leave orgId empty for personal analytics; set orgId for org-scoped analytics. Optional date range:</p>
            <div style={{marginTop: '20px'}}>
              <label htmlFor="analytics-email" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Email:</label>
              <input type="email" id="analytics-email" placeholder="user@example.com" style={{width: '100%', maxWidth: '400px', padding: '12px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', marginBottom: '15px'}} />
              <label htmlFor="analytics-userid" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>userId:</label>
              <input type="text" id="analytics-userid" placeholder="uuid from getPurchaseNumber" style={{width: '100%', maxWidth: '400px', padding: '12px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', marginBottom: '15px'}} />
              <label htmlFor="analytics-orgid" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>orgId (optional):</label>
              <input type="text" id="analytics-orgid" placeholder="Leave empty for personal analytics" style={{width: '100%', maxWidth: '400px', padding: '12px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', marginBottom: '15px'}} />
              <label htmlFor="analytics-start" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>startDate (optional):</label>
              <input type="date" id="analytics-start" style={{width: '100%', maxWidth: '400px', padding: '12px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', marginBottom: '15px'}} />
              <label htmlFor="analytics-end" style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>endDate (optional):</label>
              <input type="date" id="analytics-end" style={{width: '100%', maxWidth: '400px', padding: '12px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', marginBottom: '15px'}} />
              <label style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px'}}>
                <input type="checkbox" id="analytics-alltime" />
                <span>allTime (ignore date range)</span>
              </label>
              <button type="button" onClick={handleTestGetAnalytics} style={{background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'}} onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>Test getAnalytics</button>
            </div>
            <div id="analytics-result" style={{marginTop: '20px'}}></div>
          </div>

          <div className="endpoint-info">
            <h3>Hustle integration health checks (GET)</h3>
            <p>
              Each Hustle sync route exposes a <code>GET</code> handler that returns endpoint metadata without authentication.
              Use these to verify routes are deployed. <code>POST</code> sync calls require the Bearer token (and optional HMAC) — test those with curl, not from the browser.
            </p>
            <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px'}}>
              <button
                type="button"
                onClick={() => handleTestHustleHealth('/api/v1/integrations/hustle/org-sync', 'hustle-org-health')}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                GET org-sync
              </button>
              <button
                type="button"
                onClick={() => handleTestHustleHealth('/api/v1/integrations/hustle/member-sync', 'hustle-member-health')}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                GET member-sync
              </button>
              <button
                type="button"
                onClick={() => handleTestHustleHealth('/api/v1/integrations/hustle/permission-sync', 'hustle-permission-health')}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                GET permission-sync
              </button>
              <button
                type="button"
                onClick={() => handleTestHustleHealth('/api/webhooks/forex/organization', 'hustle-legacy-health')}
                style={{
                  background: '#94a3b8',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                GET legacy webhook (deprecated)
              </button>
            </div>
            <div id="hustle-org-health" style={{marginTop: '16px'}}></div>
            <div id="hustle-member-health" style={{marginTop: '16px'}}></div>
            <div id="hustle-permission-health" style={{marginTop: '16px'}}></div>
            <div id="hustle-legacy-health" style={{marginTop: '16px'}}></div>
          </div>

          <h2>🆘 Support</h2>
          <p>If you encounter any issues or have questions about this API, please contact our support team or check the server logs for detailed error information.</p>
        </div>
      </div>
    </div>
  )
}

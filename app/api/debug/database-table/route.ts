
import { NextResponse } from "next/server"
import { listAllKeys, getAllUsers } from "@/lib/replit-db-server"
import Database from "@replit/database"

const db = new Database()

export async function GET() {
  try {
    const keys = await listAllKeys()
    
    // Group keys by type for table display
    const tables = {
      users: [],
      pathways: [],
      phones: [],
      calls: [],
      other: []
    }
    
    // Fetch data for each key type
    for (const key of keys) {
      const value = await db.get(key)
      
      if (key.startsWith('user:')) {
        const { passwordHash, ...safeUser } = value || {}
        tables.users.push({
          key,
          ...safeUser
        })
      } else if (key.startsWith('pathway:')) {
        tables.pathways.push({
          key,
          ...value
        })
      } else if (key.startsWith('phone:')) {
        tables.phones.push({
          key,
          ...value
        })
      } else if (key.startsWith('call:')) {
        tables.calls.push({
          key,
          ...value
        })
      } else {
        tables.other.push({
          key,
          value: JSON.stringify(value)
        })
      }
    }

    // Generate HTML table view
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Replit Database Tables</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 30px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .json { max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
        .count { color: #888; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <h1>Replit Database Contents</h1>
      <p class="count">Total Keys: ${keys.length}</p>
      
      <h2>Users Table <span class="count">(${tables.users.length} records)</span></h2>
      <table>
        <tr>
          <th>Email</th>
          <th>Name</th>
          <th>Company</th>
          <th>Phone</th>
          <th>Role</th>
          <th>Created</th>
        </tr>
        ${tables.users.map(user => `
          <tr>
            <td>${user.email || 'N/A'}</td>
            <td>${user.name || 'N/A'}</td>
            <td>${user.company || 'N/A'}</td>
            <td>${user.phoneNumber || 'N/A'}</td>
            <td>${user.role || 'N/A'}</td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
          </tr>
        `).join('')}
      </table>

      <h2>Pathways Table <span class="count">(${tables.pathways.length} records)</span></h2>
      <table>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Description</th>
          <th>Creator ID</th>
          <th>Phone Number</th>
          <th>Created</th>
        </tr>
        ${tables.pathways.map(pathway => `
          <tr>
            <td>${pathway.id || 'N/A'}</td>
            <td>${pathway.name || 'N/A'}</td>
            <td>${pathway.description || 'N/A'}</td>
            <td>${pathway.creatorId || 'N/A'}</td>
            <td>${pathway.phoneNumber || 'N/A'}</td>
            <td>${pathway.createdAt ? new Date(pathway.createdAt).toLocaleDateString() : 'N/A'}</td>
          </tr>
        `).join('')}
      </table>

      <h2>Phone Numbers Table <span class="count">(${tables.phones.length} records)</span></h2>
      <table>
        <tr>
          <th>Phone Number</th>
          <th>User ID</th>
          <th>Pathway ID</th>
          <th>Location</th>
          <th>Type</th>
          <th>Status</th>
          <th>Purchased</th>
        </tr>
        ${tables.phones.map(phone => `
          <tr>
            <td>${phone.phoneNumber || 'N/A'}</td>
            <td>${phone.userId || 'N/A'}</td>
            <td>${phone.pathwayId || 'N/A'}</td>
            <td>${phone.location || 'N/A'}</td>
            <td>${phone.type || 'N/A'}</td>
            <td>${phone.status || 'N/A'}</td>
            <td>${phone.purchasedAt ? new Date(phone.purchasedAt).toLocaleDateString() : 'N/A'}</td>
          </tr>
        `).join('')}
      </table>

      <h2>Call History Table <span class="count">(${tables.calls.length} records)</span></h2>
      <table>
        <tr>
          <th>Call ID</th>
          <th>To Number</th>
          <th>From Number</th>
          <th>Duration</th>
          <th>Status</th>
          <th>Pathway</th>
          <th>Start Time</th>
        </tr>
        ${tables.calls.map(call => `
          <tr>
            <td>${call.id || 'N/A'}</td>
            <td>${call.toNumber || 'N/A'}</td>
            <td>${call.fromNumber || 'N/A'}</td>
            <td>${call.duration || 'N/A'}s</td>
            <td>${call.status || 'N/A'}</td>
            <td>${call.pathwayName || 'N/A'}</td>
            <td>${call.startTime ? new Date(call.startTime).toLocaleString() : 'N/A'}</td>
          </tr>
        `).join('')}
      </table>

      <h2>Other Data <span class="count">(${tables.other.length} records)</span></h2>
      <table>
        <tr>
          <th>Key</th>
          <th>Value</th>
        </tr>
        ${tables.other.map(item => `
          <tr>
            <td>${item.key}</td>
            <td class="json">${item.value}</td>
          </tr>
        `).join('')}
      </table>

      <br><br>
      <p><a href="/api/debug/database">View Raw JSON Data</a></p>
    </body>
    </html>
    `

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error: any) {
    console.error("[DEBUG/DATABASE-TABLE] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}

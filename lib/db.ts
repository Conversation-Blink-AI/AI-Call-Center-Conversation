// Database utilities using PostgreSQL directly instead of Supabase
import { Client } from "pg"
import { getSSLConfig } from "./db-client"

// Database connection pool
export const db = {
  query: async (text: string, params?: any[]) => {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })
    
    try {
      await client.connect()
      const result = await client.query(text, params)
      return result
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    } finally {
      await client.end()
    }
  }
}

export async function testDatabaseConnection() {
  try {
    const response = await fetch('/api/database/tables', {
      credentials: 'include'
    })
    return response.ok
  } catch (error) {
    console.error("Database connection test failed:", error)
    return false
  }
}

export async function getUserById(id: string) {
  try {
    const response = await fetch(`/api/auth/me`, {
      credentials: 'include'
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.user
  } catch (error) {
    console.error("Error fetching user:", error)
    return null
  }
}

export async function getTeamsByUserId(userId: string) {
  try {
    const response = await fetch(`/api/teams?userId=${userId}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.teams || []
  } catch (error) {
    console.error("Error fetching teams:", error)
    return []
  }
}

// Pathway functions
export async function getPathwaysByUserId(userId: string) {
  // Get pathways created by user
  try {
    const response = await fetch(`/api/pathways?creatorId=${userId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      console.error("Error fetching owned pathways:", response.status);
      return [];
    }

    const data = await response.json();
    const ownedPathways = data.pathways || [];

    const response2 = await fetch(`/api/teams?userId=${userId}`, {
      credentials: 'include'
    });

    if (!response2.ok) {
      console.error("Error fetching teams:", response2.status);
      return ownedPathways;
    }

    const teamData = await response2.json();
    const teamIds = teamData.teams.map((team) => team.id);

    if (teamIds.length === 0) {
      return ownedPathways;
    }

    const response3 = await fetch(`/api/pathways?teamIds=${teamIds.join(',')}`, {
      credentials: 'include'
    });

    if (!response3.ok) {
      console.error("Error fetching team pathways:", response3.status);
      return ownedPathways;
    }

    const teamPathwaysData = await response3.json();
    const teamPathways = teamPathwaysData.pathways || [];

    const allPathways = [...ownedPathways, ...teamPathways];
    const uniquePathways = allPathways.filter(
      (pathway, index, self) => index === self.findIndex((p) => p.id === pathway.id),
    );
    return uniquePathways;

  } catch (error) {
    console.error("Error fetching pathways:", error);
    return [];
  }
}

// Activity logging
export async function logActivity(pathwayId: string, userId: string, action: string, details?: any) {
  try {
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pathway_id: pathwayId,
        user_id: userId,
        action,
        details: details || null,
        created_at: new Date().toISOString(),
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      console.error("Error logging activity:", response.status);
    }
  } catch (error) {
    console.error("Error logging activity:", error)
  }
}

// Permission checking
export async function checkTeamPermission(teamId: string, userId: string, allowedRoles: string[]): Promise<boolean> {
  try {
    const response = await fetch(`/api/teams/${teamId}/permissions?userId=${userId}&allowedRoles=${allowedRoles.join(',')}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      console.error("Error checking team permissions:", response.status);
      return false;
    }

    const data = await response.json();
    return data.hasPermission || false;

  } catch (error) {
    console.error("Error checking team permissions:", error);
    return false;
  }
}
// In-memory mock database for demo purposes
// Replace with actual database integration (Supabase, Neon, etc.) for production

export interface User {
  id: string
  email: string
  password_hash: string
  name: string | null
  role: 'admin' | 'coordinator' | 'leader' | 'volunteer' | 'delegate' | 'witness'
  campaign_id: string | null
  created_at: Date
  updated_at: Date
  profile?: UserProfile
}

export interface UserProfile {
  id: string
  user_id: string
  phone: string | null
  role_extended: string | null
  assigned_department: string | null
  assigned_municipality: string | null
}

export interface AuthSession {
  id: string
  user_id: string
  token: string
  expires_at: Date
  created_at: Date
}

// In-memory stores
const users: Map<string, User> = new Map()
const sessions: Map<string, AuthSession> = new Map()
const profiles: Map<string, UserProfile> = new Map()

// Pre-seed a demo user (password: "demo1234")
const demoUserId = 'demo-user-001'
const demoProfileId = 'demo-profile-001'
const demoWitnessId = 'demo-witness-001'
const demoWitnessProfileId = 'demo-witness-profile-001'

users.set(demoUserId, {
  id: demoUserId,
  email: 'demo@seguridad-electoral.com',
  password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VyLQp1xEf1fK4y', // "demo1234"
  name: 'Usuario Demo',
  role: 'admin',
  campaign_id: 'campaign-001',
  created_at: new Date(),
  updated_at: new Date(),
})

profiles.set(demoProfileId, {
  id: demoProfileId,
  user_id: demoUserId,
  phone: '+57 300 123 4567',
  role_extended: 'Coordinador General',
  assigned_department: 'Cundinamarca',
  assigned_municipality: 'Bogotá',
})

users.set(demoWitnessId, {
  id: demoWitnessId,
  email: 'testigo@seguridad-electoral.com',
  password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VyLQp1xEf1fK4y',
  name: 'Testigo Demo',
  role: 'witness',
  campaign_id: 'campaign-001',
  created_at: new Date(),
  updated_at: new Date(),
})

profiles.set(demoWitnessProfileId, {
  id: demoWitnessProfileId,
  user_id: demoWitnessId,
  phone: '+57 302 555 0000',
  role_extended: 'Testigo Electoral',
  assigned_department: 'Atlántico',
  assigned_municipality: 'Barranquilla',
})

// Mock database operations
export const db = {
  user: {
    findUnique: async ({ where }: { where: { email?: string; id?: string } }): Promise<User | null> => {
      if (where.email) {
        const target = where.email.toLowerCase()
        for (const user of users.values()) {
          if (user.email.toLowerCase() === target) {
            const profile = Array.from(profiles.values()).find(p => p.user_id === user.id)
            return { ...user, profile }
          }
        }
      }
      if (where.id) {
        const user = users.get(where.id)
        if (user) {
          const profile = Array.from(profiles.values()).find(p => p.user_id === user.id)
          return { ...user, profile }
        }
      }
      return null
    },
    create: async ({ data }: { data: Omit<Partial<User>, 'profile'> & { profile?: { create: Partial<UserProfile> } } }): Promise<User> => {
      const id = `user-${Date.now()}`
      const user: User = {
        id,
        email: data.email || '',
        password_hash: data.password_hash || '',
        name: data.name || null,
        role: data.role || 'delegate',
        campaign_id: data.campaign_id || null,
        created_at: new Date(),
        updated_at: new Date(),
      }
      users.set(id, user)
      
      if (data.profile?.create) {
        const profileId = `profile-${Date.now()}`
        const profile: UserProfile = {
          id: profileId,
          user_id: id,
          phone: data.profile.create.phone || null,
          role_extended: data.profile.create.role_extended || null,
          assigned_department: data.profile.create.assigned_department || null,
          assigned_municipality: data.profile.create.assigned_municipality || null,
        }
        profiles.set(profileId, profile)
        user.profile = profile
      }
      
      return user
    },
  },
  authSession: {
    findUnique: async ({ where, include }: { where: { token?: string; id?: string }; include?: { user?: { include?: { profile?: boolean } } } }): Promise<(AuthSession & { user?: User }) | null> => {
      let session: AuthSession | null = null
      
      if (where.token) {
        for (const s of sessions.values()) {
          if (s.token === where.token) {
            session = s
            break
          }
        }
      }
      if (where.id) {
        session = sessions.get(where.id) || null
      }
      
      if (session && include?.user) {
        const user = users.get(session.user_id)
        if (user) {
          const profile = include.user.include?.profile 
            ? Array.from(profiles.values()).find(p => p.user_id === user.id)
            : undefined
          return { ...session, user: { ...user, profile } }
        }
      }
      
      return session
    },
    create: async ({ data }: { data: { user_id: string; token: string; expires_at: Date } }): Promise<AuthSession> => {
      const id = `session-${Date.now()}`
      const session: AuthSession = {
        id,
        user_id: data.user_id,
        token: data.token,
        expires_at: data.expires_at,
        created_at: new Date(),
      }
      sessions.set(id, session)
      return session
    },
    delete: async ({ where }: { where: { id?: string; token?: string } }): Promise<void> => {
      if (where.id) {
        sessions.delete(where.id)
      }
      if (where.token) {
        for (const [id, session] of sessions.entries()) {
          if (session.token === where.token) {
            sessions.delete(id)
            break
          }
        }
      }
    },
    deleteMany: async ({ where }: { where: { token?: string } }): Promise<void> => {
      if (where.token) {
        for (const [id, session] of sessions.entries()) {
          if (session.token === where.token) {
            sessions.delete(id)
          }
        }
      }
    },
  },
}

export default db

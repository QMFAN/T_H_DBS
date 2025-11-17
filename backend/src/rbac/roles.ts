export type Role = 'admin' | 'manager' | 'user'

export type ModuleKey = 'import' | 'status' | 'analysis' | 'settings' | 'users'

export const ROLE_PERMISSIONS: Record<Role, ModuleKey[]> = {
  admin: ['import', 'status', 'analysis', 'settings', 'users'],
  manager: ['import', 'status', 'analysis', 'settings'],
  user: ['analysis'],
}
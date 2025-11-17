export type Role = 'admin' | 'manager' | 'user';
export type ModuleKey = 'import' | 'status' | 'analysis' | 'settings' | 'users';
export declare const ROLE_PERMISSIONS: Record<Role, ModuleKey[]>;

export declare class UserEntity {
    id: number;
    username: string;
    wecom_user_id?: string | null;
    password_hash?: string | null;
    role: 'admin' | 'manager' | 'user';
    status: number;
    created_at: Date;
    updated_at: Date;
}

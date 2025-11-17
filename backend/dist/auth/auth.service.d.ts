import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private readonly users;
    private readonly jwt;
    private readonly config;
    constructor(users: UsersService, jwt: JwtService, config: ConfigService);
    buildWeComLoginUrls(redirect: string, corpId: string, agentId: string): {
        qr_url: string;
        oauth_url: string;
        state: string;
    };
    handleCallback(code: string, state: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: any;
            username: any;
            role: any;
        };
    }>;
    private hashPassword;
    private verifyPassword;
    passwordLogin(username: string, password: string): Promise<{
        success: boolean;
        access_token?: undefined;
        refresh_token?: undefined;
        user?: undefined;
    } | {
        success: boolean;
        access_token: string;
        refresh_token: string;
        user: {
            id: number;
            username: string;
            role: "user" | "admin" | "manager";
        };
    }>;
    setPassword(userId: number, newPassword: string): Promise<{
        success: boolean;
    }>;
    private issueTokens;
    verifyAccess(token: string): any;
    refresh(refreshToken: string): {
        success: boolean;
        access_token?: undefined;
        refresh_token?: undefined;
    } | {
        success: boolean;
        access_token: string;
        refresh_token: string;
    };
}

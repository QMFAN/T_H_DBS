import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly auth;
    private readonly config;
    constructor(auth: AuthService, config: ConfigService);
    loginUrl(): {
        qr_url: string;
        oauth_url: string;
        state: string;
    };
    callback(code: string, state: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: import("../entities/user.entity").UserEntity;
    }>;
    login(body: {
        username: string;
        password: string;
    }): Promise<{
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
}

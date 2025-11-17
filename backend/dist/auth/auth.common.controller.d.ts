import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
export declare class AuthCommonController {
    private readonly authService;
    private readonly jwt;
    constructor(authService: AuthService, jwt: JwtService);
    me(req: Request): {
        user: {
            id: any;
            username: any;
            role: any;
        };
    } | {
        user: null;
    };
    setPassword(body: {
        userId: number;
        newPassword: string;
    }): Promise<{
        success: boolean;
    }>;
    refresh(body: {
        refresh_token: string;
    }): Promise<{
        success: boolean;
        access_token?: undefined;
        refresh_token?: undefined;
    } | {
        success: boolean;
        access_token: string;
        refresh_token: string;
    }>;
}

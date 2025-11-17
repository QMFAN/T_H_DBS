"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const index_1 = require("./index");
const users_module_1 = require("../users/users.module");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            config_1.ConfigModule,
            jwt_1.JwtModule.registerAsync({
                inject: [config_1.ConfigService],
                useFactory: (cfg) => {
                    const raw = cfg.get('JWT_EXPIRES_IN', '2h');
                    const expiresIn = (/^\d+$/.test(String(raw)) ? Number(raw) : raw);
                    return {
                        secret: cfg.get('JWT_SECRET', 'dev_secret'),
                        signOptions: { expiresIn },
                    };
                },
            }),
        ],
        providers: [index_1.AuthService],
        controllers: [index_1.AuthController, index_1.AuthCommonController],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map
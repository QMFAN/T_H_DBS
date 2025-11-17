"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
let AuthController = class AuthController {
    auth;
    config;
    constructor(auth, config) {
        this.auth = auth;
        this.config = config;
    }
    loginUrl() {
        const corpId = this.config.get('WE_COM_CORP_ID') || '';
        const agentId = this.config.get('WE_COM_AGENT_ID') || '';
        const redirect = this.config.get('WE_COM_REDIRECT_URI') || 'http://localhost:3006/login/callback';
        return this.auth.buildWeComLoginUrls(redirect, corpId, agentId);
    }
    async callback(code, state) {
        return this.auth.handleCallback(code, state);
    }
    async login(body) {
        return this.auth.passwordLogin(body.username, body.password);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('wecom/login-url'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "loginUrl", null);
__decorate([
    (0, common_1.Get)('wecom/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "callback", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService, config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map
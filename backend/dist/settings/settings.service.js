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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const area_defaults_entity_1 = require("../entities/area-defaults.entity");
const area_entity_1 = require("../entities/area.entity");
let SettingsService = class SettingsService {
    repo;
    areaRepo;
    constructor(repo, areaRepo) {
        this.repo = repo;
        this.areaRepo = areaRepo;
    }
    async listAreas() {
        const as = await this.areaRepo.find({ order: { id: 'ASC' } });
        return as.map((a) => ({ code: a.code, name: a.name }));
    }
    async getDefaults(area_code) {
        return this.repo.findOne({ where: { area_code } });
    }
    async upsertDefaults(payload) {
        const ex = await this.repo.findOne({ where: { area_code: payload.area_code } });
        if (ex) {
            Object.assign(ex, payload);
            return this.repo.save(ex);
        }
        const base = {
            temp_min: 20,
            temp_max: 26,
            humidity_min: 40,
            humidity_max: 70,
            temp_duration_min: 30,
            humidity_duration_min: 30,
            gap_tolerance_minutes: 30,
            tolerance_normal_budget: 0,
        };
        const toSave = { ...base, ...payload };
        const entity = this.repo.create(toSave);
        return this.repo.save(entity);
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(area_defaults_entity_1.AreaDefaultsEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(area_entity_1.Area)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SettingsService);
//# sourceMappingURL=settings.service.js.map
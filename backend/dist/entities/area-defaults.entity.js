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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AreaDefaultsEntity = void 0;
const typeorm_1 = require("typeorm");
let AreaDefaultsEntity = class AreaDefaultsEntity {
    id;
    area_code;
    temp_min;
    temp_max;
    humidity_min;
    humidity_max;
    temp_duration_min;
    humidity_duration_min;
    gap_tolerance_minutes;
    tolerance_normal_budget;
    updated_by;
    created_at;
    updated_at;
};
exports.AreaDefaultsEntity = AreaDefaultsEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], AreaDefaultsEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], AreaDefaultsEntity.prototype, "area_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], AreaDefaultsEntity.prototype, "temp_min", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], AreaDefaultsEntity.prototype, "temp_max", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], AreaDefaultsEntity.prototype, "humidity_min", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], AreaDefaultsEntity.prototype, "humidity_max", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], AreaDefaultsEntity.prototype, "temp_duration_min", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], AreaDefaultsEntity.prototype, "humidity_duration_min", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 30 }),
    __metadata("design:type", Number)
], AreaDefaultsEntity.prototype, "gap_tolerance_minutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], AreaDefaultsEntity.prototype, "tolerance_normal_budget", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], AreaDefaultsEntity.prototype, "updated_by", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AreaDefaultsEntity.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AreaDefaultsEntity.prototype, "updated_at", void 0);
exports.AreaDefaultsEntity = AreaDefaultsEntity = __decorate([
    (0, typeorm_1.Entity)('area_defaults')
], AreaDefaultsEntity);
//# sourceMappingURL=area-defaults.entity.js.map
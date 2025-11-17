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
exports.Area = void 0;
const typeorm_1 = require("typeorm");
const sensor_data_entity_1 = require("./sensor-data.entity");
let Area = class Area {
    id;
    code;
    name;
    location;
    createdAt;
    updatedAt;
    sensorData;
};
exports.Area = Area;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], Area.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, unique: true }),
    __metadata("design:type", String)
], Area.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 128 }),
    __metadata("design:type", String)
], Area.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Area.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], Area.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'datetime' }),
    __metadata("design:type", Date)
], Area.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => sensor_data_entity_1.SensorData, (sensor) => sensor.area),
    __metadata("design:type", Array)
], Area.prototype, "sensorData", void 0);
exports.Area = Area = __decorate([
    (0, typeorm_1.Entity)({ name: 'areas' })
], Area);
//# sourceMappingURL=area.entity.js.map
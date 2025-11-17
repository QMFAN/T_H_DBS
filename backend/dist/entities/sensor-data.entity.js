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
exports.SensorData = void 0;
const typeorm_1 = require("typeorm");
const area_entity_1 = require("./area.entity");
let SensorData = class SensorData {
    id;
    areaId;
    area;
    timestamp;
    temperature;
    humidity;
    fileSource;
    createdAt;
    updatedAt;
};
exports.SensorData = SensorData;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], SensorData.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'area_id', type: 'bigint', unsigned: true }),
    __metadata("design:type", Number)
], SensorData.prototype, "areaId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => area_entity_1.Area, (area) => area.sensorData, {
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'area_id' }),
    __metadata("design:type", area_entity_1.Area)
], SensorData.prototype, "area", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], SensorData.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], SensorData.prototype, "temperature", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], SensorData.prototype, "humidity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_source', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], SensorData.prototype, "fileSource", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], SensorData.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'datetime' }),
    __metadata("design:type", Date)
], SensorData.prototype, "updatedAt", void 0);
exports.SensorData = SensorData = __decorate([
    (0, typeorm_1.Entity)({ name: 'sensor_data' }),
    (0, typeorm_1.Index)('idx_sensor_data_timestamp', ['timestamp']),
    (0, typeorm_1.Index)('uk_sensor_data_area_timestamp', ['areaId', 'timestamp'], {
        unique: true,
    })
], SensorData);
//# sourceMappingURL=sensor-data.entity.js.map
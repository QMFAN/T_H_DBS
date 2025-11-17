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
exports.ImportTask = void 0;
const typeorm_1 = require("typeorm");
let ImportTask = class ImportTask {
    id;
    taskId;
    batchId;
    fileName;
    storedPath;
    fileUrl;
    status;
    records;
    skipped;
    imported;
    duplicates;
    conflicts;
    anomaliesTotal;
    anomaliesProcessed;
    skipCount;
    overwriteCount;
    autoResolved;
    manualResolved;
    message;
    progressLastAt;
    createdAt;
    updatedAt;
};
exports.ImportTask = ImportTask;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], ImportTask.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'task_id', type: 'varchar', length: 36, unique: true }),
    __metadata("design:type", String)
], ImportTask.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'batch_id', type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], ImportTask.prototype, "batchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_name', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], ImportTask.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stored_path', type: 'varchar', length: 512, nullable: true }),
    __metadata("design:type", Object)
], ImportTask.prototype, "storedPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_url', type: 'varchar', length: 512, nullable: true }),
    __metadata("design:type", Object)
], ImportTask.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], ImportTask.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'records', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ImportTask.prototype, "records", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'skipped', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ImportTask.prototype, "skipped", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'imported', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ImportTask.prototype, "imported", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'duplicates', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ImportTask.prototype, "duplicates", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'conflicts', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ImportTask.prototype, "conflicts", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'anomalies_total', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ImportTask.prototype, "anomaliesTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'anomalies_processed', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ImportTask.prototype, "anomaliesProcessed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'skip_count', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ImportTask.prototype, "skipCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'overwrite_count', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ImportTask.prototype, "overwriteCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auto_resolved', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ImportTask.prototype, "autoResolved", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'manual_resolved', type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ImportTask.prototype, "manualResolved", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ImportTask.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'progress_last_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], ImportTask.prototype, "progressLastAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'datetime' }),
    __metadata("design:type", Date)
], ImportTask.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'datetime' }),
    __metadata("design:type", Date)
], ImportTask.prototype, "updatedAt", void 0);
exports.ImportTask = ImportTask = __decorate([
    (0, typeorm_1.Entity)({ name: 'import_tasks' })
], ImportTask);
//# sourceMappingURL=import-task.entity.js.map
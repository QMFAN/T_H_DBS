"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const area_defaults_entity_1 = require("../entities/area-defaults.entity");
const index_1 = require("./index");
const schema_init_service_1 = require("./schema-init.service");
const area_entity_1 = require("../entities/area.entity");
let SettingsModule = class SettingsModule {
};
exports.SettingsModule = SettingsModule;
exports.SettingsModule = SettingsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([area_defaults_entity_1.AreaDefaultsEntity, area_entity_1.Area])],
        providers: [index_1.SettingsService, schema_init_service_1.SchemaInitService],
        controllers: [index_1.SettingsController],
    })
], SettingsModule);
//# sourceMappingURL=settings.module.js.map
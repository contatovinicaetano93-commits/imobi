import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { ThrottlerStorage } from "@nestjs/throttler";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsuariosModule } from "./modules/usuarios/usuarios.module";
import { ObrasModule } from "./modules/obras/obras.module";
import { DocumentosModule } from "./modules/documentos/documentos.module";
import { TranchesModule } from "./modules/tranches/tranches.module";
import { EtapasModule } from "./modules/etapas/etapas.module";
import { ManagerModule } from "./modules/manager/manager.module";
import { AdminModule } from "./modules/admin/admin.module";
import { EmailModule } from "./modules/email/email.module";
import { StorageModule } from "./modules/storage/storage.module";
import { SetupModule } from "./modules/setup/setup.module";
import { HealthController } from "./common/health.controller";
import { ProductionMiddleware } from "./common/middleware/production.middleware";
import { CustomThrottlerGuard } from "./common/guards/throttler.guard";
import { PrometheusService } from "./common/observability/prometheus.service";
import { MetricsController } from "./common/metrics.controller";
import { HttpLoggingInterceptor } from "./common/interceptors/http-logging.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 },
      { ttl: 60000, limit: 10, name: "auth" },
      { ttl: 60000, limit: 5, name: "upload" },
      { ttl: 60000, limit: 20, name: "manager" },
    ]),
    // Cache em memória — sem Redis. Suficiente pro volume de 4 papéis.
    CacheModule.register({ isGlobal: true, ttl: 300_000 }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    ObrasModule,
    DocumentosModule,
    TranchesModule,
    EtapasModule,
    ManagerModule,
    AdminModule,
    EmailModule,
    StorageModule,
    SetupModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    PrometheusService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useFactory: (
        options: any,
        storageService: ThrottlerStorage,
        reflector: Reflector,
      ) => new CustomThrottlerGuard(options, storageService, reflector),
      inject: ["THROTTLER:MODULE_OPTIONS", ThrottlerStorage, Reflector],
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      consumer.apply(ProductionMiddleware).forRoutes('*');
    }
  }
}

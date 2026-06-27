import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { EmailModule } from "../email/email.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PropostasModule } from "../propostas/propostas.module";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env["JWT_SECRET"],
      signOptions: { expiresIn: "15m" },
    }),
    EmailModule,
    PrismaModule,
    PropostasModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

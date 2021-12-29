import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { AuthModuleOptions, PassportModule } from "@nestjs/passport";
import { Test, TestingModule } from "@nestjs/testing";
import { config } from "rxjs";
import { DbService } from "src/db/db.service";
import { SharedModule } from "src/shared/shared.module";
import { UserModule } from "src/user/user.module";
import { UserService } from "src/user/user.service";
import { AuthResolver } from "./auth.resolver";
import { AuthService } from "./auth.service";
import { jwtConstants } from "./constants";
import { JwtStrategy } from "./jwt.strategy";
import { LocalStrategy } from "./local.strategy";

@Module({
  imports: [
    SharedModule,
  ],
  providers: [
    UserService,
    DbService,
    AuthService,
    AuthResolver,
  ],
  exports: [AuthService],
})
export class AuthModule {}

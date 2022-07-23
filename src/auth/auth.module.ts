import { Module } from '@nestjs/common'

import { AdminModule } from '../admin/admin.module'
import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { UserService } from '../user/user.service'
import { AuthResolver } from './auth.resolver'
import { AuthService } from './auth.service'

@Module({
  imports: [
    SharedModule,
    DbModule,
    AdminModule
  ],
  providers: [
    UserService,
    AuthService,
    AuthResolver
  ],
  exports: [AuthService]
})
export class AuthModule {}

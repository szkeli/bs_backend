import { Module } from '@nestjs/common'

import { SharedModule } from 'src/shared/shared.module'
import { UserService } from 'src/user/user.service'

import { AdminModule } from '../admin/admin.module'
import { DbModule } from '../db/db.module'
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

import { Module } from '@nestjs/common'

import { DbService } from 'src/db/db.service'
import { SharedModule } from 'src/shared/shared.module'
import { UserService } from 'src/user/user.service'

import { AdminService } from '../admin/admin.service'
import { AuthResolver } from './auth.resolver'
import { AuthService } from './auth.service'

@Module({
  imports: [
    SharedModule
  ],
  providers: [
    UserService,
    DbService,
    AuthService,
    AuthResolver,
    AdminService
  ],
  exports: [AuthService]
})
export class AuthModule {}

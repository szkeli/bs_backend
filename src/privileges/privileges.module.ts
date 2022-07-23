import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { AdminResolver } from './admin.resolver'
import { PrivilegesResolver } from './privileges.resolver'
import { PrivilegesService } from './privileges.service'
import { UserResolver } from './user.resolver'

@Module({
  imports: [SharedModule, DbModule],
  providers: [
    PrivilegesResolver,
    PrivilegesService,
    UserResolver,
    AdminResolver
  ]
})
export class PrivilegesModule {}

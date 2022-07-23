import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { PrivilegesResolver } from './privileges.resolver'
import { PrivilegesService } from './privileges.service'

@Module({
  imports: [SharedModule, DbModule],
  providers: [
    PrivilegesResolver,
    PrivilegesService
  ]
})
export class PrivilegesModule {}

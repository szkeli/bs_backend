import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { PrivilegesResolver } from './privileges.resolver'
import { PrivilegesService } from './privileges.service'

@Module({
  providers: [
    PrivilegesResolver,
    PrivilegesService,
    DbService
  ]
})
export class PrivilegesModule {}

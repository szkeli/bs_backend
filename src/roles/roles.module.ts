import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { RolesResolver } from './roles.resolver'
import { RolesService } from './roles.service'

@Module({
  providers: [RolesService, RolesResolver, DbService]
})
export class RolesModule {}

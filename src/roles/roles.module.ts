import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { RolesResolver } from './roles.resolver'
import { RolesService } from './roles.service'
import { UserResolver } from './user.resolver'

@Module({
  imports: [SharedModule, DbModule],
  providers: [RolesService, RolesResolver, UserResolver]
})
export class RolesModule {}

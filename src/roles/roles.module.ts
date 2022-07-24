import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { RolesResolver } from './roles.resolver'
import { RolesService } from './roles.service'
import { UserResolver } from './user.resolver'
import { UserAuthenInfoResolver } from './user-authen-info.resolver'

@Module({
  imports: [SharedModule, DbModule],
  providers: [RolesService, RolesResolver, UserResolver, UserAuthenInfoResolver]
})
export class RolesModule {}

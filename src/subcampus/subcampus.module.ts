import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { SubcampusResolver } from './subcampus.resolver'
import { SubcampusService } from './subcampus.service'
import { UserResolver } from './user.resolver'

@Module({
  imports: [SharedModule, DbModule],
  providers: [SubcampusResolver, SubcampusService, UserResolver]
})
export class SubcampusModule {}

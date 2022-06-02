import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { SubcampusResolver } from './subcampus.resolver'
import { SubcampusService } from './subcampus.service'

@Module({
  providers: [SubcampusResolver, SubcampusService, DbService]
})
export class SubcampusModule {}

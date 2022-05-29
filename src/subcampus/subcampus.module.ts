import { Module } from '@nestjs/common'

import { SubcampusResolver } from './subcampus.resolver'
import { SubcampusService } from './subcampus.service'

@Module({
  providers: [SubcampusResolver, SubcampusService]
})
export class SubcampusModule {}

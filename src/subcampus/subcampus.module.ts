import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { SubcampusResolver } from './subcampus.resolver'
import { SubcampusService } from './subcampus.service'

@Module({
  imports: [SharedModule],
  providers: [SubcampusResolver, SubcampusService]
})
export class SubcampusModule {}

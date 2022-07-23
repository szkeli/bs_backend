import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { UniversitiesResolver } from './universities.resolver'
import { UniversitiesService } from './universities.service'
import { UserResolver } from './user.resolver'

@Module({
  imports: [SharedModule, DbModule],
  providers: [UniversitiesResolver, UniversitiesService, UserResolver]
})
export class UniversitiesModule {}

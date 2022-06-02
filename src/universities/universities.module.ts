import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { UniversitiesResolver } from './universities.resolver'
import { UniversitiesService } from './universities.service'

@Module({
  providers: [UniversitiesResolver, UniversitiesService, DbService]
})
export class UniversitiesModule {}

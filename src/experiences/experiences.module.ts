import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { ExperiencesResolver } from './experiences.resolver'
import { ExperiencesService } from './experiences.service'

@Module({
  providers: [ExperiencesService, ExperiencesResolver, DbService]
})
export class ExperiencesModule {}

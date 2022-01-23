import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { CurriculumsResolver } from './curriculums.resolver'
import { CurriculumsService } from './curriculums.service'

@Module({
  providers: [
    CurriculumsResolver,
    CurriculumsService,
    DbService
  ]
})
export class CurriculumsModule {}

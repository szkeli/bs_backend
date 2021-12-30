import { Module } from '@nestjs/common'

import { DbService } from 'src/db/db.service'

import { SubjectResolver } from './subject.resolver'
import { SubjectService } from './subject.service'

@Module({
  providers: [
    SubjectService,
    SubjectResolver,
    DbService
  ]
})
export class SubjectModule {}

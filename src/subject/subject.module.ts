import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { SubjectResolver } from './subject.resolver'
import { SubjectService } from './subject.service'

@Module({
  imports: [SharedModule],
  providers: [
    SubjectService,
    SubjectResolver
  ]
})
export class SubjectModule {}

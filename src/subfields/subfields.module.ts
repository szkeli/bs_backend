import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { SubfieldsResolver } from './subfields.resolver'
import { SubfieldsService } from './subfields.service'
import { SubjectResolver } from './subject.resolver'

@Module({
  imports: [SharedModule, DbModule],
  providers: [SubfieldsResolver, SubfieldsService, SubjectResolver]
})
export class SubfieldsModule {}

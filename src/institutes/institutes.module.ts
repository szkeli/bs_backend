import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { InstitutesResolver } from './institutes.resolver'
import { InstitutesService } from './institutes.service'
import { UniversityResolver } from './university.resolver'
import { UserResolver } from './user.resolver'

@Module({
  providers: [InstitutesResolver, InstitutesService, UserResolver, UniversityResolver],
  imports: [SharedModule, DbModule]
})
export class InstitutesModule {}

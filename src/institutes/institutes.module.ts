import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { UniversityResolver } from '../posts/university.resolver'
import { SharedModule } from '../shared/shared.module'
import { InstitutesResolver } from './institutes.resolver'
import { InstitutesService } from './institutes.service'
import { UserResolver } from './user.resolver'

@Module({
  providers: [InstitutesResolver, InstitutesService, UserResolver, UniversityResolver],
  imports: [SharedModule, DbModule]
})
export class InstitutesModule {}

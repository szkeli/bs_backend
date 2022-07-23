import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { UserModule } from '../user/user.module'
import { ExperiencesResolver } from './experiences.resolver'
import { ExperiencesService } from './experiences.service'
import { UserResolver } from './user.resolver'

@Module({
  providers: [ExperiencesService, ExperiencesResolver, UserResolver],
  imports: [SharedModule, UserModule, DbModule]
})
export class ExperiencesModule {}

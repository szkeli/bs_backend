import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { PostResolver } from './post.resolver'
import { UniversitiesResolver } from './universities.resolver'
import { UniversitiesService } from './universities.service'
import { UserResolver } from './user.resolver'

@Module({
  imports: [SharedModule, DbModule],
  providers: [
    UniversitiesResolver,
    UniversitiesService,
    UserResolver,
    PostResolver
  ]
})
export class UniversitiesModule {}

import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { UserModule } from '../user/user.module'
import { SubjectResolver } from './subject.resolver'
import { SubjectService } from './subject.service'
import { UserResolver } from './user.resolver'

@Module({
  imports: [SharedModule, UserModule, DbModule],
  providers: [
    SubjectService,
    SubjectResolver,
    UserResolver
  ],
  exports: [SubjectService]
})
export class SubjectModule {}

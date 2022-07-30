import { forwardRef, Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { UniversitiesModule } from '../universities/universities.module'
import { UserModule } from '../user/user.module'
import { PostResolver } from './post.resolver'
import { SubFieldResolver } from './subfield.resolver'
import { SubjectResolver } from './subject.resolver'
import { SubjectService } from './subject.service'
import { UserResolver } from './user.resolver'

@Module({
  imports: [
    forwardRef(() => SharedModule),
    UserModule,
    DbModule,
    UniversitiesModule
  ],
  providers: [
    SubjectService,
    SubjectResolver,
    UserResolver,
    PostResolver,
    SubFieldResolver
  ],
  exports: [SubjectService]
})
export class SubjectModule {}

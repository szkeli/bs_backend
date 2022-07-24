import { forwardRef, Module } from '@nestjs/common'

import { CensorsModule } from '../censors/censors.module'
import { CommentModule } from '../comment/comment.module'
import { DeletesModule } from '../deletes/deletes.module'
import { NlpModule } from '../nlp/nlp.module'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { ReportsModule } from '../reports/reports.module'
import { SharedModule } from '../shared/shared.module'
import { SubjectModule } from '../subject/subject.module'
import { UserModule } from '../user/user.module'
import { OrderResolver } from './order.resolver'
import { PostsResolver } from './posts.resolver'
import { PostsService } from './posts.service'
import { SubjectResolver } from './subject.resolver'
import { UniversityResolver } from './university.resolver'
import { UserResolver } from './user.resolver'

@Module({
  imports: [
    PubsubsModule,
    forwardRef(() => SharedModule),
    UserModule,
    SubjectModule,
    ReportsModule,
    CommentModule,
    DeletesModule,
    CensorsModule,
    NlpModule
  ],
  providers: [
    PostsResolver,
    PostsService,
    UserResolver,
    OrderResolver,
    UniversityResolver,
    SubjectResolver
  ],
  exports: [PostsService]
})
export class PostsModule {}

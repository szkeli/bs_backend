import { Module } from '@nestjs/common'

import { SubjectService } from 'src/subject/subject.service'
import { UserService } from 'src/user/user.service'

import { CaslModule } from '../casl/casl.module'
import { CensorsService } from '../censors/censors.service'
import { CommentService } from '../comment/comment.service'
import { DeletesService } from '../deletes/deletes.service'
import { NlpService } from '../nlp/nlp.service'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { ReportsService } from '../reports/reports.service'
import { SharedModule } from '../shared/shared.module'
import { PostsResolver } from './posts.resolver'
import { PostsService } from './posts.service'

@Module({
  imports: [
    PubsubsModule,
    SharedModule
  ],
  providers: [
    PostsResolver,
    PostsService,
    UserService,
    SubjectService,
    ReportsService,
    CaslModule,
    CommentService,
    CensorsService,
    DeletesService,
    NlpService
  ]
})
export class PostsModule {}

import { Module } from '@nestjs/common'

import { DbService } from 'src/db/db.service'
import { SubjectService } from 'src/subject/subject.service'
import { UserService } from 'src/user/user.service'

import { CaslModule } from '../casl/casl.module'
import { CensorsService } from '../censors/censors.service'
import { CommentService } from '../comment/comment.service'
import { DeletesService } from '../deletes/deletes.service'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { ReportsService } from '../reports/reports.service'
import { PostsResolver } from './posts.resolver'
import { PostsService } from './posts.service'

@Module({
  imports: [
    PubsubsModule
  ],
  providers: [
    PostsResolver,
    DbService,
    PostsService,
    UserService,
    SubjectService,
    ReportsService,
    CaslModule,
    CommentService,
    CensorsService,
    DeletesService
  ]
})
export class PostsModule {}

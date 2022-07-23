import { forwardRef, Module } from '@nestjs/common'

import { CommentModule } from '../comment/comment.module'
import { LessonsModule } from '../lessons/lessons.module'
import { NlpModule } from '../nlp/nlp.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { SharedModule } from '../shared/shared.module'
import { VotesModule } from '../votes/votes.module'
import { UserResolver } from './user.resolver'
import { UserService } from './user.service'

@Module({
  imports: [
    forwardRef(() => SharedModule),
    VotesModule,
    PubsubsModule,
    NlpModule,
    CommentModule,
    NotificationsModule,
    LessonsModule
  ],
  exports: [
    UserService
  ],
  providers: [
    UserResolver,
    UserService
  ]
})
export class UserModule {}

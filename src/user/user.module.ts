import { forwardRef, Module } from '@nestjs/common'

import { CommentModule } from '../comment/comment.module'
import { LessonsModule } from '../lessons/lessons.module'
import { NlpModule } from '../nlp/nlp.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { SharedModule } from '../shared/shared.module'
import { VotesModule } from '../votes/votes.module'
import { AnonymousResolver } from './anonymous.resolver'
import { ConversationResolver } from './conversation.resolver'
import { CredentialResolver } from './credential.resolver'
import { ExperienceResolver } from './experience.resolver'
import { FoldResolver } from './fole.resolver'
import { MessageResovler } from './message.resolver'
import { NotificationResolver } from './notification.resolver'
import { PinResolver } from './pin.resolver'
import { PostResolver } from './post.resolver'
import { RoleResolver } from './role.resolver'
import { SubFieldResolver } from './subfield.resolver'
import { UserResolver } from './user.resolver'
import { UserService } from './user.service'
import { VoteResolver } from './vote.resolver'

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
    UserService,
    PostResolver,
    MessageResovler,
    NotificationResolver,
    VoteResolver,
    ExperienceResolver,
    SubFieldResolver,
    PinResolver,
    FoldResolver,
    CredentialResolver,
    ConversationResolver,
    RoleResolver,
    AnonymousResolver
  ]
})
export class UserModule {}

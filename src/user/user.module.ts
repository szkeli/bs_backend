import { Module } from '@nestjs/common'

import { AuthService } from 'src/auth/auth.service'
import { JwtStrategy } from 'src/auth/jwt.strategy'
import { DbService } from 'src/db/db.service'
import { SharedModule } from 'src/shared/shared.module'

import { AdminService } from '../admin/admin.service'
import { CensorsService } from '../censors/censors.service'
import { CommentService } from '../comment/comment.service'
import { ConversationsService } from '../conversations/conversations.service'
import { DeadlinesService } from '../deadlines/deadlines.service'
import { NotificationsService } from '../notifications/notifications.service'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { ReportsService } from '../reports/reports.service'
import { VotesModule } from '../votes/votes.module'
import { UserResolver } from './user.resolver'
import { UserService } from './user.service'

@Module({
  imports: [
    SharedModule,
    VotesModule,
    PubsubsModule
  ],
  providers: [
    UserResolver,
    UserService,
    AuthService,
    DbService,
    JwtStrategy,
    ConversationsService,
    ReportsService,
    AdminService,
    DeadlinesService,
    CommentService,
    CensorsService,
    NotificationsService
  ]
})
export class UserModule {}

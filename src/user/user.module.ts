import { Module } from '@nestjs/common'

import { AuthService } from 'src/auth/auth.service'
import { JwtStrategy } from 'src/auth/jwt.strategy'
import { SharedModule } from 'src/shared/shared.module'

import { AdminService } from '../admin/admin.service'
import { CensorsService } from '../censors/censors.service'
import { CommentService } from '../comment/comment.service'
import { ConversationsService } from '../conversations/conversations.service'
import { CosService } from '../cos/cos.service'
import { DeadlinesService } from '../deadlines/deadlines.service'
import { LessonsService } from '../lessons/lessons.service'
import { NotificationsService } from '../notifications/notifications.service'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { ReportsService } from '../reports/reports.service'
import { VotesModule } from '../votes/votes.module'
import { WxService } from '../wx/wx.service'
import { UserResolver } from './user.resolver'
import { UserService } from './user.service'

@Module({
  imports: [
    SharedModule,
    VotesModule,
    PubsubsModule,
    SharedModule
  ],
  providers: [
    UserResolver,
    UserService,
    AuthService,
    JwtStrategy,
    ConversationsService,
    ReportsService,
    AdminService,
    DeadlinesService,
    CommentService,
    CensorsService,
    NotificationsService,
    LessonsService,
    WxService,
    CosService
  ]
})
export class UserModule {}

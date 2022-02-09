import { Module } from '@nestjs/common'

import { AuthService } from 'src/auth/auth.service'
import { JwtStrategy } from 'src/auth/jwt.strategy'
import { DbService } from 'src/db/db.service'
import { SharedModule } from 'src/shared/shared.module'

import { AdminService } from '../admin/admin.service'
import { CensorsService } from '../censors/censors.service'
import { CommentService } from '../comment/comment.service'
import { ConversationsService } from '../conversations/conversations.service'
import { CurriculumsService } from '../curriculums/curriculums.service'
import { DeadlinesService } from '../deadlines/deadlines.service'
import { ReportsService } from '../reports/reports.service'
import { VotesService } from '../votes/votes.service'
import { UserResolver } from './user.resolver'
import { UserService } from './user.service'

@Module({
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
    CurriculumsService,
    VotesService,
    CommentService,
    CensorsService
  ],
  imports: [
    SharedModule
  ]
})
export class UserModule {}

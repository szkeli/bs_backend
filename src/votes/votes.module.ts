import { forwardRef, Module } from '@nestjs/common'

import { CommentModule } from '../comment/comment.module'
import { DbModule } from '../db/db.module'
import { DeletesModule } from '../deletes/deletes.module'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { ReportsModule } from '../reports/reports.module'
import { SharedModule } from '../shared/shared.module'
import { CommentResolver } from './comment.resolver'
import { VotesResolver } from './votes.resolver'
import { VotesService } from './votes.service'

@Module({
  imports: [
    PubsubsModule,
    forwardRef(() => SharedModule),
    DbModule,
    CommentModule,
    ReportsModule,
    DeletesModule
  ],
  providers: [
    VotesService,
    VotesResolver,
    CommentResolver
  ],
  exports: [
    VotesService
  ]
})
export class VotesModule {}

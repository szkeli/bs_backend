import { Module } from '@nestjs/common'

import { CensorsService } from '../censors/censors.service'
import { DeletesService } from '../deletes/deletes.service'
import { NlpService } from '../nlp/nlp.service'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { ReportsService } from '../reports/reports.service'
import { SharedModule } from '../shared/shared.module'
import { CommentResolver } from './comment.resolver'
import { CommentService } from './comment.service'

@Module({
  imports: [
    PubsubsModule,
    SharedModule
  ],
  providers: [
    CommentResolver,
    CommentService,
    ReportsService,
    DeletesService,
    CensorsService,
    NlpService
  ]
})
export class CommentModule {}

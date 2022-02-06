import { Module } from '@nestjs/common'

import { DbService } from 'src/db/db.service'

import { DeletesService } from '../deletes/deletes.service'
import { ReportsService } from '../reports/reports.service'
import { CommentResolver } from './comment.resolver'
import { CommentService } from './comment.service'

@Module({
  providers: [
    CommentResolver,
    CommentService,
    DbService,
    ReportsService,
    DeletesService
  ]
})
export class CommentModule {}

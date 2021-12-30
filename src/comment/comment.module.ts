import { Module } from '@nestjs/common'

import { DbService } from 'src/db/db.service'

import { CommentResolver } from './comment.resolver'
import { CommentService } from './comment.service'

@Module({
  providers: [CommentResolver, CommentService, DbService]
})
export class CommentModule {}

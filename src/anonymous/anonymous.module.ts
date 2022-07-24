import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { AnonymousResolver } from './anonymous.resolver'
import { AnonymousService } from './anonymous.service'
import { CommentResolver } from './comment.resolver'
import { PostResolver } from './post.resolver'

@Module({
  providers: [
    AnonymousResolver,
    AnonymousService,
    CommentResolver,
    PostResolver
  ],
  imports: [SharedModule, DbModule]
})
export class AnonymousModule {}

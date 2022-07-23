import { forwardRef, Module } from '@nestjs/common'

import { CensorsModule } from '../censors/censors.module'
import { DbModule } from '../db/db.module'
import { DeletesModule } from '../deletes/deletes.module'
import { NlpModule } from '../nlp/nlp.module'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { ReportsModule } from '../reports/reports.module'
import { SharedModule } from '../shared/shared.module'
import { CommentResolver } from './comment.resolver'
import { CommentService } from './comment.service'
import { PostResolver } from './post.resolver'
import { UserResolver } from './user.resolver'

@Module({
  imports: [
    PubsubsModule,
    forwardRef(() => SharedModule),
    DbModule,
    ReportsModule,
    DeletesModule,
    CensorsModule,
    NlpModule
  ],
  providers: [
    CommentResolver,
    CommentService,
    PostResolver,
    UserResolver
  ],
  exports: [CommentService]
})
export class CommentModule {}

import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { PostsModule } from '../posts/posts.module'
import { SharedModule } from '../shared/shared.module'
import { NodeResolver } from './node.resolver'
import { NodeService } from './node.service'

@Module({
  providers: [NodeResolver, NodeService],
  imports: [SharedModule, PostsModule, DbModule]
})
export class NodeModule {}

import { Module } from '@nestjs/common'

import { CensorsService } from '../censors/censors.service'
import { DbService } from '../db/db.service'
import { NlpService } from '../nlp/nlp.service'
import { PostsService } from '../posts/posts.service'
import { NodeResolver } from './node.resolver'
import { NodeService } from './node.service'

@Module({
  providers: [NodeResolver, NodeService, PostsService, DbService, CensorsService, NlpService]
})
export class NodeModule {}

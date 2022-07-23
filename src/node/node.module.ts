import { Module } from '@nestjs/common'

import { CensorsService } from '../censors/censors.service'
import { NlpService } from '../nlp/nlp.service'
import { PostsService } from '../posts/posts.service'
import { SharedModule } from '../shared/shared.module'
import { NodeResolver } from './node.resolver'
import { NodeService } from './node.service'

@Module({
  providers: [NodeResolver, NodeService, PostsService, CensorsService, NlpService],
  imports: [SharedModule]
})
export class NodeModule {}

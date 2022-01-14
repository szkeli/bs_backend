import { Module } from '@nestjs/common'

import { NodeResolver } from './node.resolver'
import { NodeService } from './node.service'

@Module({
  providers: [NodeResolver, NodeService]
})
export class NodeModule {}

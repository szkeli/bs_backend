import { Args, Query, Resolver } from '@nestjs/graphql'

import { Node, NodeId, NodesConnection } from './models/node.model'
import { NodeService } from './node.service'

@Resolver((_of: Node) => Node)
export class NodeResolver {
  constructor (private readonly nodeService: NodeService) {}

  @Query(returns => Node)
  async node (@Args('id') id: NodeId) {
    throw new Error('undefined')
  }

  @Query(returns => NodesConnection)
  async nodes (@Args('ids', { type: () => [String] }) ids: [NodeId]) {
    throw new Error('undefined')
  }
}

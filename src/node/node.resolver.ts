import { Resolver } from '@nestjs/graphql'

import { NodeService } from './node.service'

@Resolver()
export class NodeResolver {
  constructor (private readonly nodeService: NodeService) {}
}

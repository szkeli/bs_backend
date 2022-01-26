import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { PagingConfigArgs, User } from '../user/models/user.model'
import { BlocksService } from './blocks.service'
import { Block, BlocksConnection } from './models/blocks.model'

@Resolver(of => Block)
export class BlocksResolver {
  constructor (private readonly blocksService: BlocksService) {}
  @Query(of => BlocksConnection, { description: '所有的拉黑' })
  @Roles(Role.Admin)
  async blocks (@Args() { first, offset }: PagingConfigArgs) {
    return await this.blocksService.blocks(first, offset)
  }

  @ResolveField(of => User)
  async to (@Parent() block: Block) {
    return await this.blocksService.to(block.id)
  }

  @ResolveField(of => Admin)
  async creator (@Parent() block: Block) {
    return await this.blocksService.creator(block.id)
  }
}

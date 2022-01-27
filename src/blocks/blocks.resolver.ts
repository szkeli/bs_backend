import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { PagingConfigArgs, User } from '../user/models/user.model'
import { BlocksService } from './blocks.service'
import { AddBlockOnUserArgs, Block, BlocksConnection } from './models/blocks.model'

@Resolver(of => Block)
export class BlocksResolver {
  constructor (private readonly blocksService: BlocksService) {}
  @Query(of => BlocksConnection, { description: '所有的拉黑' })
  @Roles(Role.Admin)
  async blocks (@Args() { first, offset }: PagingConfigArgs) {
    return await this.blocksService.blocks(first, offset)
  }

  @Mutation(of => Boolean)
  @Roles(Role.Admin)
  async removeBlockOnUser (@Args('from') from: string) {
    return await this.blocksService.removeBlockOnUser(from)
  }

  @Mutation(of => Block)
  @Roles(Role.Admin)
  async addBlockOnUser (@CurrentUser() admin: Admin, @Args() { id, description }: AddBlockOnUserArgs) {
    return await this.blocksService.addBlockOnUser(admin.id, id, description)
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
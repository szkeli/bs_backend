import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { PagingConfigArgs, User } from '../user/models/user.model'
import { BlocksService } from './blocks.service'
import { AddBlockOnUserArgs, Block, BlocksConnection } from './models/blocks.model'

@Resolver(of => Block)
export class BlocksResolver {
  constructor (private readonly blocksService: BlocksService) {}

  @Query(of => BlocksConnection, { description: '所有的拉黑' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async blocks (@Args() { first, offset }: PagingConfigArgs) {
    return await this.blocksService.blocks(first, offset)
  }

  @Mutation(of => Boolean, { description: '解除拉黑一个用户' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async removeBlockOnUser (@Args('from') from: string) {
    return await this.blocksService.removeBlockOnUser(from)
  }

  @Mutation(of => Block, { description: '拉黑一个用户' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async addBlockOnUser (@CurrentUser() admin: Admin, @Args() { id, description }: AddBlockOnUserArgs) {
    return await this.blocksService.addBlockOnUser(admin.id, id, description)
  }

  @ResolveField(of => User, { description: '被拉黑的对象' })
  async to (@Parent() block: Block) {
    return await this.blocksService.to(block.id)
  }

  @ResolveField(of => Admin, { description: '拉黑的创建者' })
  async creator (@Parent() block: Block) {
    return await this.blocksService.creator(block.id)
  }
}

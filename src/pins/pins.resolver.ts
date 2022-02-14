import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { PagingConfigArgs } from '../user/models/user.model'
import { Pin, PinsConnection } from './models/pins.model'
import { PinsService } from './pins.service'

@Resolver((_of: Pin) => Pin)
export class PinsResolver {
  constructor (private readonly pinsService: PinsService) {}

  @Mutation(of => Pin, { description: '置顶一个帖子' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async addPinOnPost (@CurrentUser() admin: Admin, @Args('postId') postId: string) {
    return await this.pinsService.addPinOnPost(admin.id, postId)
  }

  @Mutation(of => Boolean, { description: '对一个帖子取消置顶' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async removePinOnPost (@CurrentUser() admin: Admin, @Args('from') from: string) {
    return await this.pinsService.removePinOnPost(admin.id, from)
  }

  @Query(of => Pin, { description: '获取一个置顶信息' })
  async pin (@Args('id') pinId: string) {
    return await this.pinsService.pin(pinId)
  }

  @Query(of => PinsConnection, { description: '获取全部置顶信息' })
  async pins (@Args() { first, offset }: PagingConfigArgs) {
    return await this.pinsService.pins(first, offset)
  }

  @ResolveField(of => Admin, { description: '置顶的创建者' })
  async creator (@Parent() pin: Pin) {
    return await this.pinsService.creator(pin.id)
  }

  @ResolveField(of => PostAndCommentUnion, { description: '被置顶的对象' })
  async to (@Parent() pin: Pin) {
    return await this.pinsService.to(pin.id)
  }
}

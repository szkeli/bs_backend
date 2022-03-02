import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentUser, MaybeAuth, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { CreatePinPolicyHandler, DeletePinPolicyHandler, MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { Pin, PinsConnection } from './models/pins.model'
import { PinsService } from './pins.service'

@Resolver((_of: Pin) => Pin)
export class PinsResolver {
  constructor (private readonly pinsService: PinsService) {}

  @Mutation(of => Pin, { description: '置顶一个帖子' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new CreatePinPolicyHandler())
  async addPinOnPost (@CurrentUser() admin: Admin, @Args('postId') postId: string) {
    return await this.pinsService.addPinOnPost(admin.id, postId)
  }

  @Mutation(of => Boolean, { description: '对一个帖子取消置顶' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new DeletePinPolicyHandler())
  async removePinOnPost (@CurrentUser() admin: Admin, @Args('from') from: string) {
    return await this.pinsService.removePinOnPost(admin.id, from)
  }

  @Query(of => Pin, { description: '获取一个置顶信息' })
  @MaybeAuth()
  async pin (@Args('id') pinId: string) {
    return await this.pinsService.pin(pinId)
  }

  @Query(of => PinsConnection, { description: '获取全部置顶信息' })
  @MaybeAuth()
  async pins (@Args() paging: RelayPagingConfigArgs) {
    return await this.pinsService.pins(paging)
  }

  @ResolveField(of => Admin, { description: '置顶的创建者' })
  async creator (@Parent() pin: Pin) {
    return await this.pinsService.creator(pin.id)
  }

  @ResolveField(of => PostAndCommentUnion, { description: '被置顶的对象，被置顶对象被删除时，返回null', nullable: true })
  async to (@Parent() pin: Pin) {
    return await this.pinsService.to(pin.id)
  }
}

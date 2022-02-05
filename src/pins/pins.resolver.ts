import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { PagingConfigArgs } from '../user/models/user.model'
import { Pin, PinsConnection } from './models/pins.model'
import { PinsService } from './pins.service'

@Resolver((_of: Pin) => Pin)
export class PinsResolver {
  constructor (private readonly pinsService: PinsService) {}

  @Mutation(of => Pin)
  @Roles(Role.Admin)
  async addPinOnPost (@CurrentUser() admin: Admin, @Args('postId') postId: string) {
    return await this.pinsService.addPinOnPost(admin.id, postId)
  }

  @Mutation(of => Boolean)
  @Roles(Role.Admin)
  async removePinOnPost (@CurrentUser() admin: Admin, @Args('from') from: string) {
    return await this.pinsService.removePinOnPost(admin.id, from)
  }

  //   @Mutation(of => Pin)
  //   @Roles(Role.Admin)
  //   async addPinOnComment (@CurrentUser() admin: Admin, @Args('commentId') commentId: string) {
  //     return await this.pinsService.addPinOnComment(admin.id, commentId)
  //   }

  @Query(of => Pin)
  @Roles(Role.Admin)
  async pin (@Args('id') pinId: string) {
    return await this.pinsService.pin(pinId)
  }

  @Query(of => PinsConnection)
  @Roles(Role.Admin)
  async pins (@Args() { first, offset }: PagingConfigArgs) {
    return await this.pinsService.pins(first, offset)
  }

  @ResolveField(of => Admin)
  async creator (@Parent() pin: Pin) {
    return await this.pinsService.creator(pin.id)
  }

  @ResolveField(of => PostAndCommentUnion)
  async to (@Parent() pin: Pin) {
    return await this.pinsService.to(pin.id)
  }
}

import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { PagingConfigArgs, User } from '../user/models/user.model'
import { DeletesService } from './deletes.service'
import { Delete, DeletesConnection, PostAndCommentUnion } from './models/deletes.model'

@Resolver(of => Delete)
export class DeletesResolver {
  constructor (private readonly deletesService: DeletesService) {}

  @Mutation(() => Delete)
  @Roles(Role.Admin)
  async deletePost (@CurrentUser() user: User, @Args('postId') postId: string) {
    return await this.deletesService.deletePost(user.id, postId)
  }

  @Mutation(() => Delete)
  @Roles(Role.Admin)
  async deleteComment (@CurrentUser() user: User, @Args('commentId') commentId: string) {
    return await this.deletesService.deleteComment(user.id, commentId)
  }

  @Query(of => Delete)
  @Roles(Role.Admin)
  async delete (@Args('deleteId') deleteId: string) {
    return await this.deletesService.delete(deleteId)
  }

  @Query(of => DeletesConnection)
  @Roles(Role.Admin)
  async deletes (@Args() { first, offset }: PagingConfigArgs) {
    return await this.deletesService.deletes(first, offset)
  }

  @ResolveField(of => Admin)
  async creator (@Parent() d: Delete) {
    return await this.deletesService.creator(d.id)
  }

  @ResolveField(of => PostAndCommentUnion)
  async to (@Parent() d: Delete) {
    return await this.deletesService.to(d.id)
  }
}

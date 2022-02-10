import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { PagingConfigArgs } from '../user/models/user.model'
import { DeletesService } from './deletes.service'
import { Delete, DeletesConnection, PostAndCommentUnion } from './models/deletes.model'

@Resolver(of => Delete)
export class DeletesResolver {
  constructor (private readonly deletesService: DeletesService) {}

  @Mutation(() => Delete, { description: '管理员删除一个帖子' })
  @Roles(Role.Admin)
  async deletePost (@CurrentUser() admin: Admin, @Args('postId') postId: string) {
    return await this.deletesService.deletePost(admin.id, postId)
  }

  @Mutation(() => Delete, { description: '管理员删除一个评论' })
  @Roles(Role.Admin)
  async deleteComment (@CurrentUser() admin: Admin, @Args('commentId') commentId: string) {
    return await this.deletesService.deleteComment(admin.id, commentId)
  }

  @Query(of => Delete, { description: '以id获取删除' })
  @Roles(Role.Admin)
  async delete (@Args('deleteId') deleteId: string) {
    return await this.deletesService.delete(deleteId)
  }

  @Query(of => DeletesConnection, { description: '获取所有的删除' })
  @Roles(Role.Admin)
  async deletes (@Args() { first, offset }: PagingConfigArgs) {
    return await this.deletesService.deletes(first, offset)
  }

  @ResolveField(of => Admin, { description: '删除的创建者' })
  async creator (@Parent() d: Delete) {
    return await this.deletesService.creator(d.id)
  }

  @ResolveField(of => PostAndCommentUnion, { description: '被删除的对象' })
  async to (@Parent() d: Delete) {
    return await this.deletesService.to(d.id)
  }
}

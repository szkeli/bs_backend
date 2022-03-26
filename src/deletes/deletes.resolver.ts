import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { User } from '../user/models/user.model'
import { DeletesService } from './deletes.service'
import { Delete, DeletesConnection, PostAndCommentAndSubjectUnion } from './models/deletes.model'

@Resolver(of => Delete)
export class DeletesResolver {
  constructor (private readonly deletesService: DeletesService) {}

  @Mutation(() => Delete, { description: '管理员或用户删除一个帖子' })
  @Roles(Role.Admin, Role.User)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async deletePost (@CurrentUser() user: User, @Args('postId') postId: string) {
    return await this.deletesService.deletePost(user.id, postId)
  }

  @Mutation(() => Delete, { description: '管理员或用户删除一个评论' })
  @Roles(Role.Admin, Role.User)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async deleteComment (@CurrentUser() user: User, @Args('commentId') commentId: string) {
    return await this.deletesService.deleteComment(user.id, commentId)
  }

  @Query(of => Delete, { description: '以id获取删除' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async delete (@Args('deleteId') deleteId: string) {
    return await this.deletesService.delete(deleteId)
  }

  @Query(of => DeletesConnection, { description: '获取所有的删除' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async deletes (@Args() args: RelayPagingConfigArgs) {
    return await this.deletesService.deletes(args)
  }

  @ResolveField(of => Admin, { description: '删除的创建者' })
  async creator (@Parent() d: Delete) {
    return await this.deletesService.creator(d.id)
  }

  @ResolveField(of => PostAndCommentAndSubjectUnion, { description: '被删除的对象' })
  async to (@Parent() d: Delete) {
    return await this.deletesService.to(d.id)
  }
}

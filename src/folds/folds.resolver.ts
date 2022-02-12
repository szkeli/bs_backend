import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { Comment } from '../comment/models/comment.model'
import { PagingConfigArgs } from '../user/models/user.model'
import { FoldsService } from './folds.service'
import { Fold, FoldsConnection } from './models/folds.model'

@Resolver(of => Fold)
export class FoldsResolver {
  constructor (private readonly foldsService: FoldsService) {}

  @Mutation(of => Fold, { description: '折叠一条评论' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async addFoldOnComment (@CurrentUser() admin: Admin, @Args('commentId') commentId: string) {
    return await this.foldsService.addFoldOnComment(admin.id, commentId)
  }

  @Query(of => FoldsConnection, { description: '获取所有的折叠' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async folds (@Args() { first, offset }: PagingConfigArgs) {
    return await this.foldsService.folds(first, offset)
  }

  @ResolveField(of => Admin, { description: '折叠的创建者' })
  async creator (@Parent() fold: Fold) {
    return await this.foldsService.creator(fold.id)
  }

  @ResolveField(of => Comment, { description: '被折叠的对象' })
  async to (@Parent() fold: Fold) {
    return await this.foldsService.to(fold.id)
  }
}

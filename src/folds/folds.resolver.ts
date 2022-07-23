import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { AddFoldOnCommentPolicyHandler, MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { FoldsService } from './folds.service'
import { Fold, FoldsConnection } from './models/folds.model'

@Resolver(of => Fold)
export class FoldsResolver {
  constructor (private readonly foldsService: FoldsService) {}

  @Mutation(of => Fold, { description: '折叠一条评论' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new AddFoldOnCommentPolicyHandler())
  async addFoldOnComment (@CurrentUser() admin: Admin, @Args('commentId') commentId: string) {
    return await this.foldsService.addFoldOnComment(admin.id, commentId)
  }

  @Query(of => FoldsConnection, { description: '获取所有的折叠' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async folds (@Args() args: RelayPagingConfigArgs) {
    return await this.foldsService.folds(args)
  }
}

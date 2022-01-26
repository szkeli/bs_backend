import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { Comment } from '../comment/models/comment.model'
import { PagingConfigArgs } from '../user/models/user.model'
import { FoldsService } from './folds.service'
import { Fold, FoldsConnection } from './models/folds.model'

@Resolver(of => Fold)
export class FoldsResolver {
  constructor (private readonly foldsService: FoldsService) {}
  @Mutation(of => Fold)
  @Roles(Role.Admin)
  async addFoldOnComment (@CurrentUser() admin: Admin, @Args('commentId') commentId: string) {
    return await this.foldsService.addFoldOnComment(admin.id, commentId)
  }

  @Query(of => FoldsConnection)
  @Roles(Role.Admin)
  async folds (@Args() { first, offset }: PagingConfigArgs) {
    return await this.foldsService.folds(first, offset)
  }

  @ResolveField(of => Admin)
  async creator (@Parent() fold: Fold) {
    return await this.foldsService.creator(fold.id)
  }

  @ResolveField(of => Comment)
  async to (@Parent() fold: Fold) {
    return await this.foldsService.to(fold.id)
  }
}

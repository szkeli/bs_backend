import { Args, Mutation, Resolver } from '@nestjs/graphql'

import { CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { User } from '../user/models/user.model'
import { DeletesService } from './deletes.service'
import { Delete } from './models/deletes.model'

@Resolver()
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
}

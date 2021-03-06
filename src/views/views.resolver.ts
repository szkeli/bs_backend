import { Args, Mutation, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { User } from '../user/models/user.model'
import { View } from './models/views.model'
import { ViewsService } from './views.service'

@Resolver()
export class ViewsResolver {
  constructor (private readonly viewsService: ViewsService) {}

  @Mutation(of => View, { description: '增加帖子的浏览量' })
  async addViewOnPost (@CurrentUser() user: User, @Args('postId') postId: string) {
    return await this.viewsService.addViewOnPost(user.id, postId)
  }

  @Mutation(of => View, { description: '增加评论的浏览量' })
  async addViewOnComment (@CurrentUser() user: User, @Args('commentId') commentId: string) {
    return await this.viewsService.addViewOnComment(user.id, commentId)
  }
}

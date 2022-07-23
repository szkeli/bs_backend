import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Nullable, Post } from '../posts/models/post.model'
import { User } from './models/user.model'
import { UserService } from './user.service'

@Resolver(of => Post)
export class PostResolver {
  constructor (private readonly userService: UserService) {}

  @ResolveField(of => User, { nullable: true, description: '帖子的创建者，当帖子是匿名帖子时，返回null' })
  async creator (@Parent() post: Post): Promise<Nullable<User>> {
    return await this.userService.findCreatorByPostId(post.id)
  }
}

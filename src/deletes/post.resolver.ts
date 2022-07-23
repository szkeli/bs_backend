import { Delete } from '@nestjs/common'
import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Post } from '../posts/models/post.model'
import { DeletesService } from './deletes.service'

@Resolver(of => Post)
export class PostResolver {
  constructor (private readonly deletesService: DeletesService) {}

  @ResolveField(of => Delete, { description: '帖子未被删除时，此项为空', nullable: true })
  async delete (@Parent() post: Post) {
    return await this.deletesService.findDeleteByPostId(post.id.toString())
  }
}

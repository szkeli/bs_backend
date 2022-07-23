import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Comment } from '../comment/models/comment.model'
import { DeletesService } from './deletes.service'
import { Delete } from './models/deletes.model'

@Resolver(of => Comment)
export class CommentResolver {
  constructor (private readonly deleteService: DeletesService) {}

  @ResolveField(of => Delete, { description: '评论未被删除时，此项为null', nullable: true })
  async delete (@Parent() comment: Comment) {
    return await this.deleteService.findDeleteByCommentId(comment.id)
  }
}

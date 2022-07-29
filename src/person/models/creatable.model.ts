import { Field, InterfaceType } from '@nestjs/graphql'

import { Comment } from '../../comment/models/comment.model'
import { Post } from '../../posts/models/post.model'
@InterfaceType({
  resolveType: (creatable: {'dgraph.type': Array<'Post' | 'Comment'>}) => {
    if (creatable['dgraph.type']?.includes('Post')) {
      return Post
    }
    if (creatable['dgraph.type']?.includes('Comment')) {
      return Comment
    }
  }
})
export abstract class Creatable {
  @Field(of => String)
    id: string
}

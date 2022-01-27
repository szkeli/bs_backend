import { createUnionType, Field, Int, ObjectType } from '@nestjs/graphql'

import { Comment } from '../../comment/models/comment.model'
import { Post } from '../../posts/models/post.model'

@ObjectType()
export class Delete {
  @Field()
    id: string

  @Field()
    createdAt: string
}

@ObjectType()
export class DeletesConnection {
  @Field(type => [Delete])
    nodes: Delete[]

  @Field(type => Int)
    totalCount: number
}

export const PostAndCommentUnion = createUnionType({
  name: 'PostAndCommentUnion',
  types: () => [Post, Comment]
})

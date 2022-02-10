import { createUnionType, Field, Int, ObjectType } from '@nestjs/graphql'

import { Comment } from '../../comment/models/comment.model'
import { Post } from '../../posts/models/post.model'
import { Subject } from '../../subject/model/subject.model'

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

export const PostAndCommentAndSubjectUnion = createUnionType({
  name: 'PostAndCommentAndSubjectUnion',
  types: () => [Post, Comment, Subject]
})

export const PostAndCommentUnion = createUnionType({
  name: 'PostAndCommentUnion',
  types: () => [Post, Comment]
})

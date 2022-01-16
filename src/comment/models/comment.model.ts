import { Field, Int, ObjectType } from '@nestjs/graphql'

import { Node } from '../../node/models/node.model'

export type CommentId = string

@ObjectType({
  implements: () => [Node]
})
export class Comment implements Node {
  constructor (comment: Comment) {
    Object.assign(this, comment)
  }

  @Field()
    id: CommentId

  @Field()
    content: string

  @Field()
    createdAt: string
}

@ObjectType()
export class CommentsConnection {
  // @Field(type => [CommentEdge])
  //   edges: [CommentEdge]

  // @Field(type => PageInfo)
  //   pageInfo: PageInfo

  @Field(type => [Comment])
    nodes: Comment[]

  @Field(type => Int)
    totalCount: number
}

@ObjectType()
export class CommentEdge {
  @Field(type => String)
    cursor: string

  @Field(type => Comment)
    node: Comment
}

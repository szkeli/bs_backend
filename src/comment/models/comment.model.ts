import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

import { ORDERBY } from 'src/user/models/user.model'

import { Node } from '../../node/models/node.model'

export type CommentId = string

@ObjectType({
  implements: () => [Node]
})
export class Comment implements Node {
  @Field()
    id: CommentId

  @Field()
    content: string

  @Field()
    createdAt: string
}

@InputType()
export class AddACommentOnCommentInput {
  @Field()
    to: CommentId

  @Field()
    content: string
}

@InputType()
export class AddACommentOnPostInput {
  @Field()
    to: CommentId

  @Field()
    content: string
}

@InputType()
export class PagingConfigInput {
  @Field(type => Int, { defaultValue: 0 })
    skip: number

  @Field(type => Int, { defaultValue: 10 })
    limit: number

  @Field(type => ORDERBY, { defaultValue: ORDERBY.DESC })
    orderBy: ORDERBY
}

@ObjectType()
export class CommentsConnection {
  // @Field(type => [CommentEdge])
  //   edges: [CommentEdge]

  // @Field(type => PageInfo)
  //   pageInfo: PageInfo

  @Field(type => [Comment])
    nodes: [Comment]

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

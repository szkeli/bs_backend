import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'

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

@ArgsType()
export class AddCommentArgs {
  @Field({ description: '评论的内容' })
    content: string

  @Field({ description: '被评论的对象的id' })
    to: string

  @Field(type => Boolean, { description: '是否匿名发布这条评论', nullable: true, defaultValue: false })
    isAnonymous: boolean
}

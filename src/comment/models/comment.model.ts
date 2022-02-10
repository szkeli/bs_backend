import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'

export type CommentId = string

@ObjectType()
export class Comment {
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
  @Field(type => [Comment])
    nodes: Comment[]

  @Field(type => Int)
    totalCount: number
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

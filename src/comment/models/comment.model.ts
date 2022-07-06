import { ArgsType, createUnionType, Field, Int, ObjectType } from '@nestjs/graphql'

import { Anonymous } from '../../anonymous/models/anonymous.model'
import { Connection } from '../../connections/models/connections.model'
import { Post } from '../../posts/models/post.model'
import { User } from '../../user/models/user.model'

export type CommentId = string

@ObjectType()
export class Comment {
  constructor (comment: Comment) {
    Object.assign(this, comment)
  }

  @Field()
    id: string

  @Field()
    content: string

  @Field()
    createdAt: string

  @Field(of => Number, { nullable: true })
    score: number | null
}

@ObjectType()
export class CommentWithTo extends Comment {
  @Field({ description: '被评论的对象的 id' })
    to: string
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

  @Field(of => [String], { nullable: true, description: '评论包含的图片' })
    images: string[]
}

export const CommentToUnion = createUnionType({
  name: 'CommentToUnion',
  types: () => [Post, Comment, User, Anonymous],
  resolveType (v: {'dgraph.type': string[]}) {
    if (v['dgraph.type']?.includes('Post')) {
      return Post
    }
    if (v['dgraph.type']?.includes('Comment')) {
      return Comment
    }
    if (v['dgraph.type']?.includes('User')) {
      return User
    }
    if (v['dgraph.type']?.includes('Anonymous')) {
      return Anonymous
    }
  }
})

@ObjectType()
export class CommentsConnectionWithRelay extends Connection<Comment>(Comment) {}

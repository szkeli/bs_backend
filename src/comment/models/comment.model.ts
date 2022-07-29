import { ArgsType, createUnionType, Field, Int, ObjectType } from '@nestjs/graphql'

import { Anonymous } from '../../anonymous/models/anonymous.model'
import { Connection } from '../../connections/models/connections.model'
import { Creatable } from '../../person/models/creatable.model'
import { Post } from '../../posts/models/post.model'
import { User } from '../../user/models/user.model'
import { Votable } from '../../votes/model/votes.model'

@ObjectType({
  implements: () => [Votable, Creatable]
})
export class Comment implements Votable, Creatable {
  constructor (comment: Comment) {
    Object.assign(this, comment)
  }

  @Field(of => String)
    id: string

  @Field(of => String)
    content: string

  @Field(of => String)
    createdAt: string

  @Field(of => Number, { nullable: true })
    score: number | null
}

@ObjectType()
export class CommentWithTo extends Comment {
  @Field(of => String, { description: '被评论的对象的 id' })
    to: string
}

@ObjectType()
export class CommentsConnection {
  @Field(of => [Comment])
    nodes: Comment[]

  @Field(of => Int)
    totalCount: number
}

@ArgsType()
export class AddCommentArgs {
  @Field(of => String, { description: '评论的内容' })
    content: string

  @Field(of => String, { description: '被评论的对象的id' })
    to: string

  @Field(of => Boolean, { description: '是否匿名发布这条评论', nullable: true, defaultValue: false })
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

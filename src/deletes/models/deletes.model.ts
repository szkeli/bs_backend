import { createUnionType, Field, ObjectType } from '@nestjs/graphql'

import { UserAuthenInfo } from '../../auth/model/auth.model'
import { Comment } from '../../comment/models/comment.model'
import { Connection } from '../../connections/models/connections.model'
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
export class DeletesConnection extends Connection<Delete>(Delete) {}

export const DeletedUnion = createUnionType({
  name: 'DeletedUnion',
  types: () => [Post, Comment, Subject, UserAuthenInfo],
  resolveType (v: {'dgraph.type': string[]}) {
    if (v['dgraph.type']?.includes('Post')) {
      return Post
    }
    if (v['dgraph.type']?.includes('Comment')) {
      return Comment
    }
    if (v['dgraph.type']?.includes('Subject')) {
      return Subject
    }
    if (v['dgraph.type']?.includes('UserAuthenInfo')) {
      return UserAuthenInfo
    }
  }
})

export const PostAndCommentUnion = createUnionType({
  name: 'PostAndCommentUnion',
  types: () => [Post, Comment],
  resolveType (v: {'dgraph.type': string[]}) {
    if (v['dgraph.type']?.includes('Post')) {
      return Post
    }
    if (v['dgraph.type']?.includes('Comment')) {
      return Comment
    }
  }
})

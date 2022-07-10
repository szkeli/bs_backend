import { ArgsType, createUnionType, Field, ObjectType } from '@nestjs/graphql'

import { Comment } from '../../comment/models/comment.model'
import { Connection } from '../../connections/models/connections.model'
import { Post } from '../../posts/models/post.model'

@ObjectType()
export class Favorite {
  @Field(of => String)
    id: string

  @Field(of => String)
    createdAt: string
}

@ObjectType()
export class FavoritesConnection extends Connection<Favorite>(Favorite) {}

@ArgsType()
export class CreateFavoriteArgs {
  @Field(of => String, { nullable: true, description: '将一个 Post 添加到收藏' })
    postId: string | null

  @Field(of => String, { nullable: true, description: '将一个 Comment 添加到收藏' })
    commentId: string | null
}

@ArgsType()
export class RemoveFavoriteArgs {
  @Field(of => String)
    favoriteId: string
}

export const FavoriteToUnion = createUnionType({
  name: 'FavoriteToUnion',
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

import { Field, Int, InterfaceType, ObjectType, PartialType } from '@nestjs/graphql'

import { Comment } from '../../comment/models/comment.model'
import { Connection } from '../../connections/models/connections.model'
import { Post } from '../../posts/models/post.model'

@InterfaceType({
  resolveType (votable) {
    if (votable['dgraph.type']?.include('Comment')) {
      return Comment
    }
    if (votable['dgraph.type']?.include('Post')) {
      return Post
    }
  }
})
export abstract class Votable {
  @Field(of => String)
    id: string
}

// @InterfaceType()
// export abstract class VoteInterface {
//   @Field(of => String)
//     id: string
// }

@ObjectType()
export class Vote {
  @Field(of => String)
    id: string

  @Field(of => String)
    createdAt: string
}

@ObjectType()
export class VoteWithUnreadCount extends Vote {
  @Field(of => Int)
    unreadCount: number
}

@ObjectType()
export class VoteWithUnreadCountsConnection extends Connection<VoteWithUnreadCount>(VoteWithUnreadCount) {}

@ObjectType()
class _VotesConnection extends Connection<Vote>(Vote) {}

@ObjectType()
export class VotesConnectionWithRelay extends PartialType(_VotesConnection) {
  @Field(of => Boolean)
    viewerCanUpvote: boolean

  @Field(of => Boolean)
    viewerHasUpvoted: boolean
}

@ObjectType()
export class VotesConnection {
  @Field(type => Int)
    totalCount: number

  @Field(type => Boolean)
    viewerCanUpvote: boolean

  @Field(type => Boolean)
    viewerHasUpvoted: boolean

  @Field(type => [Vote])
    nodes: Vote[]
}

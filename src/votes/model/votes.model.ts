import { Field, Int, InterfaceType, ObjectType, PartialType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType()
export class Votable {
  @Field(type => Int, { description: '对象当前总赞数' })
    totalCount: number

  @Field(type => Boolean, { description: '浏览者是否能点赞' })
    viewerCanUpvote: boolean

  @Field(type => Boolean, { description: '浏览者是否已经点赞' })
    viewerHasUpvoted: boolean

  @Field({ description: '被点赞或取消点赞的对象的id' })
    to: string
}

@InterfaceType()
export abstract class VoteInterface {
  @Field(of => String)
    id: string
}

@ObjectType({
  implements: [VoteInterface]
})
export class Vote implements VoteInterface {
  @Field()
    id: string

  @Field()
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

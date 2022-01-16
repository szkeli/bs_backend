import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Votable {
  constructor (votable: Votable) {
    Object.assign(this, votable)
  }

  @Field(type => Int, { description: 'Number of upvotes that this node has received.' })
    upvoteCount: number

  @Field(type => Boolean, { description: 'Whether or not the current user can add or remove an upvote on this node.' })
    viewerCanUpvote: boolean

  @Field(type => Boolean, { description: 'Whether or not the current user has already upvoted this node.' })
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

@ObjectType()
export class Vote {
  @Field()
    id: string

  @Field()
    createdAt: string
}

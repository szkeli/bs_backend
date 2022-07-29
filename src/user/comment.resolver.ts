import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Comment } from '../comment/models/comment.model'
import { DbService } from '../db/db.service'
import { User } from './models/user.model'

@Resolver(of => Comment)
export class CommentResolver {
  constructor (private readonly dbService: DbService) {}

  // @ResolveField(of => User, {
  //   nullable: true,
  //   description: '评论的创建者，评论是匿名评论时，creator为null'
  // })
  // async creator (@Parent() comment: Comment) {
  //   const query = `
  //   query v($commentId: string) {
  //     var(func: uid($commentId)) @filter(type(Comment) and not has(anonymous)) {
  //       c as creator @filter(type(User))
  //     }
  //     creator(func: uid(c)) {
  //       id: uid
  //       expand(_all_)
  //     }
  //   }
  // `
  //   const res = await this.dbService.commitQuery<{
  //     creator: User[]
  //   }>({ query, vars: { $commentId: comment.id } })

  //   return res.creator[0]
  // }
}

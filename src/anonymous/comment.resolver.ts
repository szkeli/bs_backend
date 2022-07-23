import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Comment } from '../comment/models/comment.model'
import { DbService } from '../db/db.service'
import { sha1 } from '../tool'
import { Anonymous } from './models/anonymous.model'

@Resolver(of => Comment)
export class CommentResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => Anonymous, { description: '评论的匿名信息，非匿名评论，此项为null', nullable: true })
  async anonymous (@Parent() comment: Comment) {
    const query = `
    query v($commentId: string) {
      # 原帖子 id
      var(func: uid($commentId)) @recurse(depth: 100, loop: false) {
        p as ~comments
      }
      originPost(func: uid(p)) @filter(type(Post)) {
        id: uid
      }
      comment(func: uid($commentId)) @filter(type(Comment)) {
        creator @filter(type(User)) {
          id: uid
          subCampus
        }
        # 被评论的对象的id
        to @filter(type(Post) or type(Comment)) {
          id: uid
        }
        anonymous @filter(type(Anonymous)) {
          id: uid
          expand(_all_)
        }
      }
    }
  `
    const res = await this.dbService.commitQuery<{
      originPost: Array<{id: string}>
      comment: Array<{to: {id: string}, creator: {id: string, subCampus: string}, anonymous: Anonymous}>
    }>({ query, vars: { $commentId: comment.id } })

    const anonymous = res.comment[0]?.anonymous
    const creatorId = res.comment[0]?.creator?.id
    const originPostId = res.originPost[0]?.id
    const subCampus = res.comment[0]?.creator?.subCampus

    if (anonymous) {
      anonymous.watermark = sha1(`${originPostId}${creatorId}`)
      anonymous.subCampus = subCampus
    }

    return anonymous
  }
}

import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Post } from '../posts/models/post.model'
import { SubCampus } from '../subcampus/models/subcampus.model'
import { sha1 } from '../tool'
import { User } from '../user/models/user.model'
import { Anonymous } from './models/anonymous.model'

@Resolver(of => Post)
export class PostResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => Anonymous, { description: '帖子的匿名信息，非匿名帖子此项为空', nullable: true })
  async anonymous (@Parent() post: Post) {
    const { id } = post
    const query = `
    query v($postId: string) {
      p as var(func: uid($postId)) @filter(type(Post)) {
        c as creator @filter(type(User))
        a as anonymous @filter(type(Anonymous))
      }
      post(func: uid(p)) {
        id: uid
      }
      creator(func: uid(c)) {
        id: uid
        s as ~users @filter(type(SubCampus)) {
          uid
          name
        }
      }
      anonymous(func: uid(a)) {
        id: uid
        expand(_all_)
      } 
      subCampuses(func: uid(s)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{
      creator: User[]
      anonymous: Anonymous[]
      post: Post[]
      subCampuses: SubCampus[]
    }>({ query, vars: { $postId: id } })

    const anonymous = res.anonymous[0]
    const postId = res.post?.[0]?.id
    const creatorId = res.creator?.[0]?.id
    const subCampus = res.subCampuses[0]

    if (anonymous) {
      anonymous.watermark = sha1(`${postId}${creatorId}`)
      anonymous.subCampus = subCampus
    }

    return anonymous
  }
}

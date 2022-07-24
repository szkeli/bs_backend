import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Post } from '../posts/models/post.model'
import { SubField } from './models/subfields.model'

@Resolver(of => Post)
export class PostResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => SubField, { nullable: true, description: '帖子所在的 SubField' })
  async subField (@Parent() post: Post) {
    const { id } = post
    const query = `
        query v($id: string) {
            var(func: uid($id)) @filter(type(Post)) {
                s as ~posts @filter(type(SubField))
            }
            subField(func: uid(s)) {
                id: uid
                expand(_all_)
            }
        }
    `
    const res = await this.dbService.commitQuery<{
      subField: SubField[]
    }>({
      query,
      vars: { $id: id }
    })

    return res.subField[0]
  }
}

import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Post } from '../posts/models/post.model'
import { University } from './models/universities.models'

@Resolver(of => Post)
export class PostResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => University, { description: '该帖子所在的大学', nullable: true })
  async university (@Parent() post: Post): Promise<University> {
    const { id } = post
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(Post)) {
          university as ~posts @filter(type(University))
        }
        university(func: uid(university)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{ university: University[] }>({
      query,
      vars: { $id: id }
    })

    return res.university[0]
  }
}

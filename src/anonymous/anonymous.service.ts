import { Injectable } from '@nestjs/common'

import { Comment } from '../comment/models/comment.model'
import { DbService } from '../db/db.service'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { Post } from '../posts/models/post.model'

@Injectable()
export class AnonymousService {
  constructor (private readonly dbService: DbService) {}

  async to (id: string) {
    const query = `
        query v($id: string) {
            anonymous(func: uid($id)) @filter(type(Anonymous)) {
                to @filter(type(Comment) or type(Post)) {
                    id: uid
                    expand(_all_)
                    dgraph.type
                }
            }
        }
      `
    const res = await this.dbService.commitQuery<{
      anonymous: Array<{
        to: typeof PostAndCommentUnion & { 'dgraph.type': string[] }
      }>
    }>({ query, vars: { $id: id } })
    const v = res.anonymous[0]?.to

    if (v?.['dgraph.type']?.includes('Post')) {
      return new Post(v as unknown as Post)
    }
    if (v?.['dgraph.type']?.includes('Comment')) {
      return new Comment(v as unknown as Comment)
    }
    return null
  }
}

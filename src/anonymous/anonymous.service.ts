import { Injectable } from '@nestjs/common'

import { Comment } from '../comment/models/comment.model'
import { DbService } from '../db/db.service'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { Post } from '../posts/models/post.model'
import { User } from '../user/models/user.model'

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
    const res = await this.dbService.commitQuery<{anonymous: Array<{to: (typeof PostAndCommentUnion) & {'dgraph.type': string[]}}>}>({ query, vars: { $id: id } })
    const v = res.anonymous[0]?.to

    if (v?.['dgraph.type']?.includes('Post')) {
      return new Post(v as unknown as Post)
    }
    if (v?.['dgraph.type']?.includes('Comment')) {
      return new Comment(v as unknown as Comment)
    }
    return null
  }

  async creator (anonymousId: string, viewerId: string) {
    const query = `
        query v($anonymousId: string, $viewerId: string) {
            anonymous(func: uid($anonymousId)) @filter(uid_in(creator, $viewerId)) {
                creator @filter(type(User)) {
                    id: uid
                    expand(_all_)
                }
            }
        }
    `
    const res = await this.dbService.commitQuery<{anonymous: Array<{creator: User}>}>({ query, vars: { $anonymousId: anonymousId, $viewerId: viewerId } })
    return res.anonymous[0]?.creator
  }
}

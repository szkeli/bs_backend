import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { DbService } from '../db/db.service'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { Pin } from '../pins/models/pins.model'
import { User } from './models/user.model'

@Resolver(of => Pin)
export class PinResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => Admin, { description: '置顶的创建者' })
  async creator (@Parent() pin: Pin) {
    const { id } = pin
    const query = `
      query v($pinId: string) {
          pin(func: uid($pinId)) @filter(type(Pin)) {
              creator @filter(type(Admin)) {
                  id: uid
                  expand(_all_)
              }
          }
      }
    `
    const res = await this.dbService.commitQuery<{ pin: Array<{creator: User}>}>({
      query,
      vars: {
        $pinId: id
      }
    })
    return res.pin[0]?.creator
  }

  @ResolveField(of => PostAndCommentUnion, { description: '被置顶的对象，被置顶对象被删除时，返回null', nullable: true })
  async to (@Parent() pin: Pin) {
    const { id } = pin
    const query = `
    query v($pinId: string) {
        pin(func: uid($pinId)) @filter(type(Pin)) {
            to @filter(type(Post) or type(Comment) and not has(delete)) {
                id: uid
                dgraph.type
                expand(_all_)
            }
        }
    }
  `
    const res = await this.dbService.commitQuery<{pin: Array<{to: typeof PostAndCommentUnion }>}>({
      query, vars: { $pinId: id }
    })

    return res.pin[0]?.to
  }
}

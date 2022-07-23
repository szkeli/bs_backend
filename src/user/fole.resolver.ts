import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { Comment } from '../comment/models/comment.model'
import { DbService } from '../db/db.service'
import { Fold } from '../folds/models/folds.model'

@Resolver(of => Fold)
export class FoldResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => Admin, { description: '折叠的创建者' })
  async creator (@Parent() fold: Fold) {
    const { id } = fold
    const query = `
        query v($foldId: string) {
            fold(func: uid($foldId)) @filter(type(Fold)) {
                creator @filter(type(Admin)) {
                    id: uid
                    expand(_all_)
                }
            }
        }
      `
    const res = await this.dbService.commitQuery<{fold: Array<{creator: Admin}>}>({ query, vars: { $foldId: id } })
    return res.fold[0]?.creator
  }

  @ResolveField(of => Comment, { description: '被折叠的对象' })
  async to (@Parent() fold: Fold) {
    const { id } = fold

    const query = `
    query v($foldId: string) {
        fold(func: uid($foldId)) @filter(type(Fold)) {
            to @filter(type(Comment)) {
                id: uid
                expand(_all_)
            }
        }
    }
    `
    const res = await this.dbService.commitQuery<{fold: Array<{to: Comment}>}>({ query, vars: { $foldId: id } })
    return res.fold[0]?.to
  }
}

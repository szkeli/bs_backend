import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { handleRelayForwardAfter, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { User } from '../user/models/user.model'
import { FilterLessonArgs, Lesson, LessonsConnection } from './models/lessons.model'

@Resolver(of => User)
export class UserResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => LessonsConnection, { description: '当前用户的所有课程' })
  async lessons (@Parent() user: User, @Args() args: RelayPagingConfigArgs, @Args() filter: FilterLessonArgs) {
    let { after, first, orderBy } = args
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.lessonsRelayForward(user.id, first, after, filter)
    }
    throw new NotImplementedException()
  }

  async lessonsRelayForward (id: string, first: number, after: string | null, { startYear, endYear, semester }: FilterLessonArgs) {
    const q1 = 'var(func: uid(lessons), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($id: string, $after: string) {
          var(func: uid($id)) @filter(type(User)) {
            lessons (orderdesc: createdAt) @filter(type(Lesson) and eq(startYear, ${startYear}) and eq(endYear, ${endYear}) and eq(semester, ${semester}) ) {
              lessons as uid
            }
          }
          ${after ? q1 : ''}
          totalCount(func: uid(lessons)) { count(uid) }
          objs(func: uid(${after ? 'q' : 'lessons'}), orderdesc: createdAt, first: ${first}) {
            id: uid
            expand(_all_)
          }
          # 开始游标
          startO(func: uid(lessons), first: -1) { createdAt }
          # 结束游标
          endO(func: uid(lessons), first: 1) { createdAt } 
        }
      `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Lesson>>({ query, vars: { $id: id, $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }
}

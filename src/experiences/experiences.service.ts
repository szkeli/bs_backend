import { Injectable } from '@nestjs/common'

import { UserAlreadyCheckInException, UserNotFoundException } from '../app.exception'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { handleRelayForwardAfter, now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { User } from '../user/models/user.model'
import { Experience, ExperienceTransactionType } from './models/experiences.model'

@Injectable()
export class ExperiencesService {
  constructor (private readonly dbService: DbService) {}
  async from (id: string) {
    const query = `
        query v($id: string) {
            var(func: uid($id)) @filter(type(ExperiencePointsTransaction)) {
                from as from @filter(type(User))
            }
            from(func: uid(from)) {
                id: uid
                expand(_all_)
            }
        }
    `
    const res = await this.dbService.commitQuery<{
      from: User[]
    }>({
      query,
      vars: { $id: id }
    })

    return res.from[0]
  }

  async to (id: string) {
    const query = `
        query v($id: string) {
            var(func: uid($id)) @filter(type(ExperiencePointTransaction)) {
                to as to @filter(type(User))
            }
            to(func: uid(to)) {
                id: uid
                expand(_all_)
            }
        }
    `
    const res = await this.dbService.commitQuery<{
      to: User[]
    }>({
      query,
      vars: { $id: id }
    })

    return res.to[0]
  }

  /**
     * 用户的每日签到函数
     * 1. 创建响应的经验交易记录
     * 2. 将经验添加到 User.experiencePoints
     * @param id User's is
     */
  async dailyCheckIn (id: string) {
    // 今日零点时间戳
    const zeroTime = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
    const dailCheckInPoints = 10

    const query = `
        query v($id: string, $zeroTime: string, $currentTime: string, $type: string) {
            # 当前用户存在
            u(func: uid($id)) @filter(type(User) and not has(delete)) {
                u as uid
            }
            v(func: uid(u)) {
                exCount as count(experiencePoints)
                exValue as experiencePoints
                newExperiencePoints as math(cond(exCount == 1, exValue + ${dailCheckInPoints}, ${dailCheckInPoints}))
            }
            # TODO: 当前用户今日没有签到
            # 当前用户的所有签到
            var(func: type(ExperiencePointTransaction)) @filter(eq(transactionType, $type)) {
                to @filter(uid(u)) {
                    h as ~to
                }
            }
            # 当前用户的上十次签到
            m as var(func: uid(h), orderdesc: createdAt, first: 10) 
            l(func: between(createdAt, $zeroTime, $currentTime)) @filter(uid(m)) {
                l as uid
            }
        }
    `
    const condition = '@if( eq(len(u), 1) and eq(len(l), 0) )'
    const mutation = {
      uid: '_:experience_points_transaction',
      'dgraph.type': 'ExperiencePointTransaction',
      points: dailCheckInPoints,
      createdAt: now(),
      transactionType: ExperienceTransactionType.DAILY_CHECK_IN,
      to: {
        uid: 'uid(u)',
        experiencePoints: 'val(newExperiencePoints)'
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      l: Array<{uid: string}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: {
        $id: id,
        $currentTime: now(),
        $zeroTime: zeroTime,
        $type: ExperienceTransactionType.DAILY_CHECK_IN
      }
    })

    if (res.json.l.length !== 0) {
      throw new UserAlreadyCheckInException(id)
    }
    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }

    return {
      id: res.uids.get('experience_points_transaction'),
      points: dailCheckInPoints,
      createdAt: now(),
      transactionType: ExperienceTransactionType.DAILY_CHECK_IN
    }
  }

  async experiencePointsTransaction (id: string) {
    const query = `
        query v($id: string) {
            g(func: uid($id)) @filter(type(ExperiencePointTransaction)) {
                id: uid
                expand(_all_)
            }
        }
    `
    const res = await this.dbService.commitQuery<{g: Experience[]}>({
      query,
      vars: { $id: id }
    })
    return res.g[0]
  }

  async experiencePointsTransactions ({ first, orderBy, after }: RelayPagingConfigArgs) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.experiencePointsTransactionWithRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async experiencePointsTransactionWithRelayForward (first: number, after: string) {
    const q1 = 'var(func: uid(transactions), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($after: string) {
            transaction as var(func: type(ExperiencePointTransaction))
            totalCount(func: uid(transaction)) { count(uid) }
            ${after ? q1 : ''}
            objs(func: uid(${after ? 'q' : 'transaction'}), orderdesc: createdAt, first: ${first}) {
                id: uid
                expand(_all_)
            }
            startO(func: uid(transaction), first: -1) { createdAt }
            endO(func: uid(transaction), first: 1) { createdAt }
        }
    `
    const res = await this.dbService.commitQuery <RelayfyArrayParam<Experience>>({
      query,
      vars: { $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }
}

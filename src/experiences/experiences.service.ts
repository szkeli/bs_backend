import { ForbiddenException, Injectable } from '@nestjs/common'
import dgraph from 'dgraph-js'
import { verify } from 'jsonwebtoken'

import { SystemErrorException, UserAlreadyCheckInException, UserNotFoundException } from '../app.exception'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService, Txn } from '../db/db.service'
import { handleRelayForwardAfter, now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { User } from '../user/models/user.model'
import { Experience, ExperienceTransactionType, MintForSZTUArgs } from './models/experiences.model'

@Injectable()
export class ExperiencesService {
  constructor (private readonly dbService: DbService) {}

  /**
   * 添加指定数量的 points 到 experiencePoints
   * @param user User
   * @param points number
   */
  async addPointsTxn (txn: Txn, id: string, points: number) {
    let t = ''
    if (points >= 0) {
      t = `newExperiencePoints as math(cond(exist == 1, last + ${points}, ${points}))`
    } else {
      t = `newExperiencePoints as math(cond(exist == 1, last - ${points}, ${points}))`
    }
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(User)) {
          u as uid
          exist as count(experiencePoints)
          last as experiencePoints
          ${t}
        }
      }
    `
    const condition = '@if( eq(len(u), 1) )'
    const mutation = {
      uid: 'uid(u)',
      experiencePoints: 'val(newExperiencePoints)'
    }

    await this.dbService.handleTransaction(txn, {
      query,
      mutations: [{ set: mutation, cond: condition }],
      vars: { $id: id }
    })
  }

  async mintForSZTUTxn (txn: Txn, user: User, args: MintForSZTUArgs) {
    const { id } = user
    const { payload } = args
    // TODO: payload 里面添加当前用户的 userId 防止重放攻击
    const mintFromSZTUKey = process.env.MINT_FOR_SZTU_JWT_KEY
    if (!mintFromSZTUKey) {
      throw new ForbiddenException('process.env.MINT_FOR_SZTU_JWT_KEY 不能为空')
    }
    const _payload = verify(payload, mintFromSZTUKey) as unknown as {
      points: number
      uid: string
    }

    if (!_payload || !_payload.points || _payload.points < 0) {
      throw new ForbiddenException('points 不符合规则')
    }
    if (!_payload.uid || _payload.uid !== user.id) {
      throw new ForbiddenException('payload 的 uid 和领取用户的 uid 不匹配')
    }

    const query = `
      query v($id: string, $type: string) {
        u(func: uid($id)) @filter(type(User)) { 
          u as uid
          no as ~to @filter(type(ExperiencePointTransaction) and eq(transactionType, $type))
        }
        n(func: uid(no)) { n as uid }
      }
    `
    const condition = '@if( eq(len(u), 1) and eq(len(n), 0) )'
    const mutation = {
      uid: '_:exp',
      'dgraph.type': 'ExperiencePointTransaction',
      points: _payload.points,
      createdAt: now(),
      transactionType: ExperienceTransactionType.FROM_SZTU,
      to: {
        uid: 'uid(u)'
      }
    }

    const res = await this.dbService.handleTransaction<Map<string, string>, {
      u: Array<{uid: string}>
      n: Array<{uid: string}>
    }>(txn, {
      query,
      mutations: [{ set: mutation, cond: condition }],
      vars: { $id: id, $type: ExperienceTransactionType.FROM_SZTU }
    })

    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.n.length !== 0) {
      throw new ForbiddenException('当前用户已领取')
    }

    const _id = res.uids.get('exp')
    if (!_id) {
      throw new SystemErrorException()
    }

    return {
      id: _id,
      points: _payload.points,
      createdAt: now(),
      transactionType: ExperienceTransactionType.DAILY_CHECK_IN
    }
  }

  async mintForSZTU (user: User, args: MintForSZTUArgs) {
    const res = await this.dbService.withTxn(async txn => {
      const exp = await this.mintForSZTUTxn(txn, user, args)
      await this.addPointsTxn(txn, user.id, exp.points)

      return exp
    })

    return res
  }

  async addDailyCheckInExperiencePointsTxn (id: string, txn: dgraph.Txn): Promise<Experience> {
    // 今日零点时间戳
    const zeroTime = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
    const dailCheckInPoints = 10

    const query = `
      query v($id: string, $zeroTime: string, $currentTime: string, $type: string) {
        # 当前用户存在
        u(func: uid($id)) @filter(type(User) and not has(delete)) {
            u as uid
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
        # User 当天的签到
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
        uid: 'uid(u)'
      }
    }

    const res = await this.dbService.handleTransaction<Map<string, string>, {
      u: Array<{uid: string}>
      l: Array<{uid: string}>
    }>(txn, {
      query,
      mutations: [{ set: mutation, cond: condition }],
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

    const _id = res.uids.get('experience_points_transaction')
    if (!_id) {
      throw new SystemErrorException()
    }
    return {
      id: _id,
      points: dailCheckInPoints,
      createdAt: now(),
      transactionType: ExperienceTransactionType.DAILY_CHECK_IN
    }
  }

  async addDailyCheckInSumTxn (id: string, txn: dgraph.Txn) {
    const query = `
      query v($id: string, $type: string) {
        var(func: uid($id)) @filter(type(User)) {
          u as uid
          dCount as count(dailyCheckInSum)
          exd as dailyCheckInSum
          newD as math(cond(dCount == 1, exd + 1, 1))
        }
        var(func: type(ExperiencePointTransaction)) @filter(eq(transactionType, $type)) {
            to @filter(uid(u)) {
                h as ~to
            }
        }
        # 当前 User 的上次签到
        lastTransaction(func: uid(h), orderdesc: createdAt, first: 1) {
          l as uid
          # 距今的秒数
          createdAt as createdAt
          s as math(since(createdAt))
          i: val(s)
        }
        # 上次签到的时间距离现在的时间小于24小时
        var(func: uid(l)) @filter(lt(val(s), 86400)) {
          k as uid
        }
      }
    `
    // 连续签到
    const condition = '@if( eq(len(k), 1) )'
    const mutation = {
      uid: 'uid(u)',
      dailyCheckInSum: 'val(newD)'
    }
    // 连续签到断了...
    const cond2 = '@if( eq(len(k), 0) )'
    const mutation2 = {
      uid: 'uid(u)',
      dailyCheckInSum: 1
    }

    await this.dbService.handleTransaction(txn, {
      query,
      mutations: [
        { set: mutation, cond: condition },
        { set: mutation2, cond: cond2 }
      ],
      vars: {
        $id: id,
        $type: ExperienceTransactionType.DAILY_CHECK_IN
      }
    })
  }

  /**
     * 用户的每日签到函数
     * 1. 创建响应的经验交易记录
     * 2. 将经验添加到 User.experiencePoints
     * 3. 记录连续签到天数
     * @param id User's is
     */
  async dailyCheckIn (id: string) {
    const res = await this.dbService.withTxn(async txn => {
      await this.addDailyCheckInSumTxn(id, txn)
      const e = await this.addDailyCheckInExperiencePointsTxn(id, txn)
      await this.addPointsTxn(txn, id, e.points)
      return e
    })

    return res
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

  async experiencePointsTransactionWithRelayForward (first: number, after: string | null) {
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

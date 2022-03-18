import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { LoginResult } from 'src/user/models/user.model'

import { AdminService } from '../admin/admin.service'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { atob, relayfyArrayForward } from '../tool'
import { UserService } from '../user/user.service'
import { Payload, UserAuthenInfo } from './model/auth.model'

@Injectable()
export class AuthService {
  constructor (
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly adminService: AdminService,
    private readonly dbService: DbService
  ) {}

  async userAuthenInfos ({ orderBy, first, after, last, before }: RelayPagingConfigArgs) {
    after = atob(after)
    before = atob(before)
    if (orderBy === ORDER_BY.CREATED_AT_DESC && first) {
      return await this.userAuthenInfosRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async userAuthenInfosRelayForward (first: number, after: string) {
    const q1 = 'var(func: uid(infos), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid } '
    const query = `
      query v($after: string) {
        infos as var(func: type(UserAuthenInfo), orderdesc: createdAt)

        ${after ? q1 : ''}
        totalCount(func: uid(infos)) {
          count(uid)
        }
        infos(func: uid(${after ? 'q1' : 'infos'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startInfo(func: uid(infos), first: -1) {
          createdAt
        }
        # 结束游标
        endInfo(func: uid(infos), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startInfo: Array<{createdAt: string}>
      endInfo: Array<{createdAt: string}>
      infos: UserAuthenInfo[]
    }>({ query, vars: { $after: after } })

    console.error(res)
    return relayfyArrayForward({
      totalCount: res.totalCount,
      startO: res.startInfo,
      endO: res.endInfo,
      objs: res.infos,
      first,
      after
    })
  }

  async login (userId: string, sign: string): Promise<LoginResult> {
    const user = await this.userService.checkUserPasswordAndGetUser(userId, sign)
    const payload: Payload = { id: user.id, roles: user.roles }
    return {
      token: this.jwtService.sign(payload),
      ...user
    }
  }

  async loginByCode (code: string) {
    const user = await this.userService.checkUserByCode(code)
    const payload: Payload = { id: user.id, roles: user.roles }
    return {
      token: this.jwtService.sign(payload),
      ...user
    }
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common'

import { Admin } from '../admin/models/admin.model'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { btoa, now, relayfyArrayForward } from '../tool'
import { User } from '../user/models/user.model'
import { Block, BlocksConnection } from './models/blocks.model'

@Injectable()
export class BlocksService {
  constructor (private readonly dbService: DbService) {}

  async addBlockOnUser (adminId: string, id: string, description: string): Promise<Block> {
    const query = `
      query v($adminId: string, $id: string, $description: string) {
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        x(func: uid($id)) @filter(type(User)) { 
          x as uid
        }
        b(func: uid($id)) @filter(type(User)) {
          block @filter(type(Block)) {
            block as uid
          }
        }
      }
    `
    const condition = '@if( eq(len(v), 1) and eq(len(x), 1) and eq(len(block), 0) )'
    const mutation = {
      uid: '_:block',
      'dgraph.type': 'Block',
      description,
      createdAt: now(),
      creator: {
        uid: adminId,
        blocks: {
          uid: '_:block'
        }
      },
      to: {
        uid: id,
        block: {
          uid: '_:block'
        }
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      x: Array<{uid: string}>
      b: Array<{block: string}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $adminId: adminId,
        $id: id,
        $description: description
      }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${adminId} 不存在`)
    }
    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`用户 ${id} 不存在`)
    }
    if (res.json.b.length !== 0) {
      throw new ForbiddenException(`用户 ${id} 已被拉黑`)
    }
    return {
      description,
      createdAt: now(),
      id: res.uids.get('block')
    }
  }

  async removeBlockOnUser (from: string) {
    const condition = '@if( eq(len(v), 1) and eq(len(creator), 1) and eq(len(to),1) )'
    const query = `
      query v($uid: string) {
        user(func: uid($uid)) @filter(type(User)) {
          block @filter(type(Block)) {
            # 拉黑存在
            v as uid
            # 创建拉黑的管理员存在
            creator @filter(type(Admin)) {
              creator as uid
            }
            # 被拉黑的对象存在
            to @filter(type(User)) {
              to as uid
            }
          }
        }
      }
    `
    const mutation = {
      uid: 'uid(v)',
      'dgraph.type': 'Block',
      creator: {
        uid: 'uid(creator)',
        blocks: {
          uid: 'uid(v)'
        }
      },
      to: {
        uid: 'uid(to)',
        block: {
          uid: 'uid(v)'
        }
      }
    }

    const res = await this.dbService.commitConditionalDeletions<Map<string, string>, {
      user: Array<{}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: { $uid: from }
    })

    if (res.json.user.length === 0) {
      throw new ForbiddenException(`用户 ${from} 未被拉黑`)
    }
    return res.json.user.length === 1
  }

  async findBlocksByAdminId (id: string, first: number, offset: number) {
    const query = `
      query v($adminId: string) {
        totalCount(func: uid($adminId)) @filter(type(Admin)) { count: count(blocks) }
        admin(func: uid($adminId)) @filter(type(Admin)) {
          blocks (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Block)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      admin: Array<{blocks: Block[]}>
      totalCount: Array<{count: number}>
    }>({ query, vars: { $adminId: id } })
    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.admin[0]?.blocks ?? []
    }
  }

  async creator (id: string) {
    const query = `
        query v($blockId: string) {
            block(func: uid($blockId)) @filter(type(Block)) {
                creator @filter(type(Admin)) {
                    id: uid
                    expand(_all_)
                }
            }
        }
      `
    const res = await this.dbService.commitQuery<{block: Array<{creator: Admin}>}>({ query, vars: { $blockId: id } })
    return res.block[0]?.creator
  }

  async to (id: string) {
    const query = `
        query v($blockId: string) {
            block(func: uid($blockId)) @filter(type(Block)) {
                to @filter(type(User)) {
                    id: uid
                    expand(_all_)
                }
            }
        }
      `
    const res = await this.dbService.commitQuery<{block: Array<{to: User}>}>({ query, vars: { $blockId: id } })
    return res.block[0]?.to
  }

  async blocks ({ first, after, orderBy }: RelayPagingConfigArgs): Promise<BlocksConnection> {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.blocksWithRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async blocksWithRelayForward (first: number, after: string): Promise<BlocksConnection> {
    const q1 = 'var(func: uid(blocks), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query {
          var(func: type(Block)) { blocks as uid }
          totalCount(func: uid(blocks)) { count(uid) }
          ${after ? q1 : ''}
          objs(func: uid(${after ? 'q' : 'blocks'}), orderdesc: createdAt, first: ${first}) {
            id: uid
            expand(_all_)
          }
          startO(func: uid(blocks), first: -1) {
            createdAt
          }
          endO(func: uid(blocks), first: 1) {
            createdAt
          }
      }
    `
    const res = await this.dbService.commitQuery<{
      objs: Block[]
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      totalCount: Array<{ count: number }>
    }>({ query })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }
}

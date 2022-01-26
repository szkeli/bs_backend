import { Injectable } from '@nestjs/common'

import { Admin } from '../admin/models/admin.model'
import { DbService } from '../db/db.service'
import { User } from '../user/models/user.model'
import { Block, BlocksConnection } from './models/blocks.model'

@Injectable()
export class BlocksService {
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
    console.error(res)
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

  constructor (private readonly dbService: DbService) {}
  async blocks (first: number, offset: number): Promise<BlocksConnection> {
    const query = `
        query v {
            totalCount(func: type(Block)) { count(uid) }
            blocks(func: type(Block), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
                id: uid
                expand(_all_)
            }
        }
      `
    const res = await this.dbService.commitQuery<{
      blocks: Block[]
      totalCount: Array<{ count: number }>
    }>({ query })
    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.blocks ?? []
    }
  }
}

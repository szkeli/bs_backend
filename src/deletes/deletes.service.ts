import { ForbiddenException, Injectable } from '@nestjs/common'

import { Admin } from '../admin/models/admin.model'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { btoa, now, relayfyArrayForward } from '../tool'
import { AdminAndUserUnion, User } from '../user/models/user.model'
import { Delete, DeletedUnion, DeletesConnection } from './models/deletes.model'

@Injectable()
export class DeletesService {
  constructor (private readonly dbService: DbService) {}

  async findDeleteByCommentId (id: string) {
    const query = `
      query v($commentId: string) {
        comment(func: uid($commentId)) @filter(type(Comment)) {
          delete @filter(type(Delete)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{comment: Array<{delete: Delete}>}>({ query, vars: { $commentId: id } })
    return res.comment[0]?.delete
  }

  async findDeleteByPostId (id: string) {
    const query = `
      query v($postId: string) {
        post(func: uid($postId)) @filter(type(Post)) {
          delete @filter(type(Delete)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{post: Array<{delete: Delete}>}>({ query, vars: { $postId: id } })
    return res.post[0]?.delete
  }

  async to (deleteId: string): Promise<typeof DeletedUnion> {
    const query = `
      query v($deleteId: string) {
        delete(func: uid($deleteId)) @filter(type(Delete)) {
          to @filter(type(Comment) or type(Post) or type(Subject) or type(UserAuthenInfo) or type(University)) {
            id: uid
            expand(_all_)
            dgraph.type
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{delete: Array<{to: typeof DeletedUnion }>}>({ query, vars: { $deleteId: deleteId } })

    return res.delete[0]?.to
  }

  async creator (deleteId: string) {
    const query = `
      query v($deleteId: string) {
        delete(func: uid($deleteId)) @filter(type(Delete)) {
          creator @filter(type(Admin) or type(User)) {
            id: uid
            expand(_all_)
            dgraph.type
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{delete: Array<{creator: (typeof AdminAndUserUnion) & {'dgraph.type': string[]}}>}>({ query, vars: { $deleteId: deleteId } })
    const v = res.delete[0]?.creator

    if (v['dgraph.type']?.includes('User')) {
      return new User(v as unknown as User)
    }
    if (v['dgraph.type']?.includes('Admin')) {
      return new Admin(v as unknown as Admin)
    }
  }

  async delete (deleteId: string) {
    const query = `
      query v($deleteId: string) {
        delete(func: uid($deleteId)) @filter(type(Delete)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{delete: Delete[]}>({ query, vars: { $deleteId: deleteId } })
    if (res.delete.length !== 1) {
      throw new ForbiddenException(`???????????? ${deleteId} ?????????`)
    }
    return res.delete
  }

  async deletes ({ first, after, orderBy }: RelayPagingConfigArgs): Promise<DeletesConnection> {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.deletesWithRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async deletesWithRelayForward (first: number, after: string): Promise<DeletesConnection> {
    const q1 = 'var(func: uid(deletes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($after: string) {
        var(func: type(Delete), orderdesc: createdAt) { deletes as uid }

        ${after ? q1 : ''}
        totalCount (func: uid(deletes)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'deletes'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(deletes), first: -1) {
          createdAt
        }
        endO(func: uid(deletes), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      objs: Delete[]
    }>({ query, vars: { $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async deleteComment (xid: string, commentId: string): Promise<Delete> {
    const _now = now()
    const query = `
        query v($xid: string, $commentId: string) {
          # xid????????????
          v(func: uid($xid)) @filter(type(Admin)) { v as uid }
          # xid?????????????????????
          y(func: uid($commentId)) @filter(type(Comment) and uid_in(creator, $xid)) { y as uid }
          # ????????????
          u(func: uid($commentId)) @filter(type(Comment)) { u as uid }
          # ??????????????????
          x(func: uid($commentId)) @filter(type(Comment)) {
            delete @filter(type(Delete)) {
              x as uid
            }
          }
        }
      `
    // xid ?????????????????????
    const condition1 = '@if( eq(len(y), 1) and eq(len(u), 1) and eq(len(x), 0) )'
    // xid ????????????
    const condition2 = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'

    const mutation = {
      uid: '_:delete',
      'dgraph.type': 'Delete',
      createdAt: _now,
      to: {
        uid: commentId,
        delete: {
          uid: '_:delete'
        }
      },
      creator: {
        uid: xid,
        deletes: {
          uid: '_:delete'
        }
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      y: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{}>
    }>({
      mutations: [
        { mutation, condition: condition1 },
        { mutation, condition: condition2 }
      ],
      query,
      vars: {
        $xid: xid,
        $commentId: commentId
      }
    })

    if (res.json.x.length !== 0) {
      throw new ForbiddenException(`?????? ${commentId} ????????????`)
    }
    if (res.json.v.length !== 1 && res.json.y.length !== 1) {
      throw new ForbiddenException(`?????? ${xid} ????????????????????????????????? ${commentId} ????????????`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`?????? ${commentId} ?????????`)
    }
    return {
      createdAt: _now,
      id: res.uids.get('delete')
    }
  }

  async deletePost (xid: string, postId: string): Promise<Delete> {
    const _now = now()

    const query = `
        query v($xid: string, $postId: string) {
          # ?????????xid????????????
          v(func: uid($xid)) @filter(type(Admin)) { v as uid }
          # ??????????????????
          u(func: uid($postId)) @filter(type(Post)) { u as uid }
          # xid ?????????????????????
          y(func: uid($postId)) @filter(type(Post) and uid_in(creator, $xid)) { y as uid }
          # ??????????????????????????????
          x(func: uid($postId)) @filter(type(Post)) {
            delete @filter(type(Delete) and not uid_in(creator, $xid)) {
              x as uid
            }
          }
        }
      `
    // xid????????????
    const condition1 = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
    const condition2 = '@if( eq(len(u), 1) and eq(len(y), 1) and eq(len(x), 0) )'
    const mutation = {
      uid: '_:delete',
      'dgraph.type': 'Delete',
      createdAt: _now,
      to: {
        uid: postId,
        delete: {
          uid: '_:delete'
        }
      },
      creator: {
        uid: xid,
        deletes: {
          uid: '_:delete'
        }
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      y: Array<{uid: string}>
      x: Array<{}>
    }>({
      mutations: [
        { mutation, condition: condition1 },
        { mutation, condition: condition2 }
      ],
      query,
      vars: {
        $xid: xid,
        $postId: postId
      }
    })

    if (res.json.x.length !== 0) {
      throw new ForbiddenException(`?????? ${postId} ?????????????????????`)
    }
    if (res.json.v.length !== 1 && res.json.y.length !== 1) {
      throw new ForbiddenException(`????????????????????? ${xid} ???????????? ${postId} ????????????`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`?????? ${postId} ?????????`)
    }
    return {
      createdAt: _now,
      id: res.uids.get('delete')
    }
  }
}

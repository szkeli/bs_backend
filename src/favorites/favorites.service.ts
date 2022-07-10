import { ForbiddenException, Injectable } from '@nestjs/common'

import { AlreadyInFavoritesException, FavoriteNotExistException, PostNotFoundException, SystemErrorException, UserNotFoundException, UserNotHasTheFavoriteException } from '../app.exception'
import { DbService } from '../db/db.service'
import { NotNull, now } from '../tool'
import { User } from '../user/models/user.model'
import { CreateFavoriteArgs, Favorite, FavoriteToUnion, RemoveFavoriteArgs } from './models/favorite.model'

@Injectable()
export class FavoritesService {
  constructor (private readonly dbService: DbService) {}

  async removeFavorite (user: User, args: RemoveFavoriteArgs) {
    const { favoriteId } = args
    const query = `
        query v($id: string, $favoriteId: string) {
            u(func: uid($id)) @filter(type(User)) { u as uid }
            f(func: uid($favoriteId)) @filter(type(Favorite)) { f as uid }
            var(func: uid(u)) {
                temp as ~creator @filter(uid(f))
            }
            in(func: uid(temp)) { in as uid }
        }
    `
    const condition = '@if( eq(len(u), 1) and eq(len(f), 1) and eq(len(in), 1) )'
    const mutation = {
      uid: 'uid(f)',
      'dgraph.type': 'Favorite'
    }
    const res = await this.dbService.commitMutation<Map<string, string>, {
      u: Array<{uid: string}>
      f: Array<{uid: string}>
      in: Array<{uid: string}>
    }>({
      query,
      mutations: [{ del: mutation, cond: condition }],
      vars: { $id: user.id, $favoriteId: favoriteId }
    })
    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(user.id)
    }
    if (res.json.in.length !== 1) {
      throw new UserNotHasTheFavoriteException(user.id, favoriteId)
    }
    if (res.json.f.length !== 1) {
      throw new FavoriteNotExistException(favoriteId)
    }
    return true
  }

  async creator (id: string) {
    const query = `
        query v($id: string) {
            var(func: uid($id)) @filter(type(Favorite)) {
                c as creator @filter(type(User))
            }
            c(func: uid(c)) {
                id: uid
                expand(_all_)
            }
        }
    `
    const res = await this.dbService.commitQuery<{c: Favorite[]}>({ query, vars: { $id: id } })

    return res.c[0]
  }

  async to (id: string): Promise<typeof FavoriteToUnion> {
    const query = `
        query v($id: string) {
            var(func: uid($id)) @filter(type(Favorite)) {
                t as to @filter(type(Post) or type(Comment))
            }
            t(func: uid(t)) {
                id: uid
                expand(_all_)
                dgraph.type
            }
        }
    `
    const res = await this.dbService.commitQuery<{t: Array<typeof FavoriteToUnion>}>({ query, vars: { $id: id } })

    return res.t[0]
  }

  async createFavorite (user: User, args: CreateFavoriteArgs): Promise<Favorite> {
    const { commentId, postId } = args
    if (NotNull(commentId, postId)) {
      throw new ForbiddenException('不能同时提供 commentId 和 postId')
    }

    const query = `
        query v($id: string, $toId: string) {
            u(func: uid($id)) @filter(type(User)) { u as uid }
            var(func: uid($toId)) @filter(type(Post) or type(Comment)) { temp as uid }
            t(func: uid(temp)) @filter(not has(delete)) { t as uid }
            # User 是否已经收藏该对象
            var(func: uid(u)) {
                itemp as ~creator @filter(type(Favorite) and uid_in(to, uid(temp)))
            }
            i(func: uid(itemp)) { i as uid }
        }
    `
    const condition = '@if( eq(len(u), 1) and eq(len(t), 1) and eq(len(i), 0) )'
    const mutation = {
      uid: '_:favorite',
      'dgraph.type': 'Favorite',
      createdAt: now(),
      creator: {
        uid: 'uid(u)'
      },
      to: {
        uid: 'uid(t)'
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      t: Array<{uid: string}>
      i: Array<{uid: string}>
    }>({
      query,
      mutations: [{ condition, mutation }],
      vars: { $id: user.id, $toId: commentId ?? postId }
    })

    if (res.json.i.length !== 0) {
      throw new AlreadyInFavoritesException(user.id, commentId ?? postId ?? '')
    }
    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(user.id)
    }
    // TODO: 实现响应的异常
    if (res.json.t.length !== 1) {
      throw new PostNotFoundException(commentId ?? postId ?? '')
    }

    const _id = res.uids.get('favorite')
    if (!_id) {
      throw new SystemErrorException()
    }
    return {
      id: _id,
      createdAt: now()
    }
  }
}

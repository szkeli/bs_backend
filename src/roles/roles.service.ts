import { Injectable } from '@nestjs/common'

import { AdminNotFoundException, UserNotFoundException } from '../app.exception'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { now } from '../tool'
import { AddRoleOnUserArgs } from './models/roles.model'

@Injectable()
export class RolesService {
  constructor (private readonly dbService: DbService) {}
  async roles (arg: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }

  async addRoleOnUser (actor: string, to: string, { title }: AddRoleOnUserArgs) {
    const query = `
        query v($actor: string, $to: string) {
            a(func: uid($actor)) @filter(type(Admin)) { a as uid }
            b(func: uid($to)) @filter(type(User)) { b as uid }
        }
      `
    const condition = '@if( eq(len(a), 1) and eq(len(b), 1) )'
    const mutation = {
      uid: to,
      roles: {
        uid: '_:role',
        'dgraph.type': 'Role',
        createdAt: now(),
        title,
        creator: {
          uid: actor
        },
        to: {
          uid: to
        }
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      a: Array<{uid: string}>
      b: Array<{uid: string}>
    }>({
      query,
      mutations: [
        { mutation, condition }
      ],
      vars: { $actor: actor, $to: to }
    })

    console.error(res)
    if (res.json.a.length !== 1) {
      throw new AdminNotFoundException(actor)
    }
    if (res.json.b.length !== 1) {
      throw new UserNotFoundException(to)
    }

    return {
      title,
      id: res.uids.get('role'),
      createdAt: now()
    }
  }

  async creator (id: string) {
    throw new Error('Method not implemented.')
  }

  async to (id: string) {
    throw new Error('Method not implemented.')
  }
}

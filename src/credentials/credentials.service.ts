import { ForbiddenException, Injectable } from '@nestjs/common'

import { Admin } from '../admin/models/admin.model'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { btoa, relayfyArrayForward } from '../tool'
import { CredentialToUnion, ICredential, ICredentialsConnection } from './models/credentials.model'

@Injectable()
export class CredentialsService {
  constructor (private readonly dbService: DbService) {}

  async creator (id: string) {
    const query = `
        query v($credentialId: string) {
            credential(func: uid($credentialId)) @filter(type(Credential)) {
                creator @filter(type(Admin)) {
                    id: uid
                    expand(_all_)
                }
            }
        }
      `
    const res = await this.dbService.commitQuery<{credential: Array<{creator: Admin}>}>({ query, vars: { $credentialId: id } })
    return res.credential[0]?.creator
  }

  async to (id: string): Promise<typeof CredentialToUnion> {
    const query = `
      query v($credentialId: string) {
          credential(func: uid($credentialId)) @filter(type(Credential)) {
              to @filter(type(Admin) or type(User)) {
                  id: uid
                  expand(_all_)
                  dgraph.type
              }
          }
      }
    `
    const res = await this.dbService.commitQuery<{credential: Array<{to: typeof CredentialToUnion}>}>({ query, vars: { $credentialId: id } })
    return res.credential[0]?.to
  }

  async credentials ({ first, after, orderBy }: RelayPagingConfigArgs): Promise<ICredentialsConnection> {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.credentialsWithRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async credentialsWithRelayForward (first: number, after: string): Promise<ICredentialsConnection> {
    const q1 = 'var(func: uid(credentials), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($after: string) {
        var(func: type(Credential), orderdesc: createdAt) { credentials as uid }

        ${after ? q1 : ''}
        totalCount (func: uid(credentials)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'credentials'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(credentials), first: -1) {
          createdAt
        }
        endO(func: uid(credentials), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      objs: ICredential[]
    }>({ query, vars: { $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async credential (credentialId: string) {
    const query = `
        query v($credentialId: string) {
            credential(func: uid($credentialId)) @filter(type(Credential)) {
                id: uid
                expand(_all_)
            }
        }
      `
    const res = await this.dbService.commitQuery<{credential: ICredential[]}>({ query, vars: { $credentialId: credentialId } })
    if (res.credential.length !== 1) {
      throw new ForbiddenException(`凭证 ${credentialId} 不存在`)
    }
    return res.credential[0]
  }
}

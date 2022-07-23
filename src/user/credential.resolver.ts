import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CredentialToUnion, ICredential } from '../credentials/models/credentials.model'
import { DbService } from '../db/db.service'

@Resolver(of => ICredential)
export class CredentialResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => Admin)
  async creator (@Parent() credential: ICredential) {
    const { id } = credential
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

  @ResolveField(of => CredentialToUnion, { nullable: true })
  async to (@Parent() credential: ICredential) {
    const { id } = credential
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
}

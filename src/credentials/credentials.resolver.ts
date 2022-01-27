import { Args, Query, Resolver } from '@nestjs/graphql'

import { Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { PagingConfigArgs } from '../user/models/user.model'
import { CredentialsService } from './credentials.service'
import { ICredential, ICredentialsConnection } from './models/credentials.model'

@Resolver(of => ICredential)
export class CredentialsResolver {
  constructor (private readonly credentialsService: CredentialsService) {}

  @Query(of => ICredential)
  @Roles(Role.Admin)
  async credential (@Args('credentialId') credentialId: string) {
    return this.credentialsService.credential(credentialId)
  }

  @Query(of => ICredentialsConnection)
  @Roles(Role.Admin)
  async credentials (@Args() { first, offset }: PagingConfigArgs) {
    return await this.credentialsService.credentials(first, offset)
  }
}

import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { PagingConfigArgs } from '../user/models/user.model'
import { CredentialsService } from './credentials.service'
import { ICredential, ICredentialsConnection } from './models/credentials.model'

@Resolver(of => ICredential)
export class CredentialsResolver {
  constructor (private readonly credentialsService: CredentialsService) {}

  @Query(of => ICredential, { description: '获取一个凭证' })
  @Roles(Role.Admin)
  async credential (@Args('credentialId') credentialId: string) {
    return await this.credentialsService.credential(credentialId)
  }

  @Query(of => ICredentialsConnection, { description: '获取所有凭证' })
  @Roles(Role.Admin)
  async credentials (@Args() { first, offset }: PagingConfigArgs) {
    return await this.credentialsService.credentials(first, offset)
  }

  @ResolveField(of => Admin)
  @Roles(Role.Admin)
  async creator (@Parent() credential: ICredential) {
    return await this.credentialsService.creator(credential.id)
  }

  @ResolveField(of => Admin)
  @Roles(Role.Admin)
  async to (@Parent() credential: ICredential) {
    return await this.credentialsService.to(credential.id)
  }
}

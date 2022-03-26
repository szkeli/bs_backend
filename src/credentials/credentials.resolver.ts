import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { CredentialsService } from './credentials.service'
import { ICredential, ICredentialsConnection } from './models/credentials.model'

@Resolver(of => ICredential)
export class CredentialsResolver {
  constructor (private readonly credentialsService: CredentialsService) {}

  @Query(of => ICredential, { description: '获取一个凭证' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async credential (@Args('credentialId') credentialId: string) {
    return await this.credentialsService.credential(credentialId)
  }

  @Query(of => ICredentialsConnection, { description: '获取所有凭证' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async credentials (@Args() args: RelayPagingConfigArgs) {
    return await this.credentialsService.credentials(args)
  }

  @ResolveField(of => Admin)
  async creator (@Parent() credential: ICredential) {
    return await this.credentialsService.creator(credential.id)
  }

  @ResolveField(of => Admin)
  async to (@Parent() credential: ICredential) {
    return await this.credentialsService.to(credential.id)
  }
}

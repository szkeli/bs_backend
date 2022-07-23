import { Args, Mutation, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CheckPolicies, CurrentAdmin, Role, Roles } from '../auth/decorator'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { CreateSubFieldArgs, SubField } from './models/subfields.model'
import { SubfieldsService } from './subfields.service'

@Resolver(of => SubField)
export class SubfieldsResolver {
  constructor (private readonly subfieldsService: SubfieldsService) {}

  @Mutation(of => SubField, { description: '在指定的 Subject 上添加一个 SubField' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async createSubField (@CurrentAdmin() admin: Admin, @Args() args: CreateSubFieldArgs) {
    return await this.subfieldsService.createSubField(admin, args)
  }
}

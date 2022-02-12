import { Args, Query, Resolver } from '@nestjs/graphql'

import { CheckPolicies, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { CensorsService } from './censors.service'
import { CensorResponse } from './models/censors.model'

@Resolver()
export class CensorsResolver {
  constructor (private readonly censorsService: CensorsService) {}

  @Query(of => CensorResponse, { description: '文本审查的测试接口，测试一段文本是否违规' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async censorText (@Args('content') content: string) {
    return await this.censorsService.textCensor(content)
  }
}

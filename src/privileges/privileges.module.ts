import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { PrivilegesResolver } from './privileges.resolver'
import { PrivilegesService } from './privileges.service'

@Module({
  imports: [SharedModule],
  providers: [
    PrivilegesResolver,
    PrivilegesService
  ]
})
export class PrivilegesModule {}

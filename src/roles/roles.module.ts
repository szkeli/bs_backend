import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { RolesResolver } from './roles.resolver'
import { RolesService } from './roles.service'

@Module({
  imports: [SharedModule],
  providers: [RolesService, RolesResolver]
})
export class RolesModule {}

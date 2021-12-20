import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { UserResolver } from './user.resolver'
import { UserService } from './user.service'

@Module({
  imports: [SharedModule],
  providers: [UserResolver, UserService]
})
export class UserModule {}

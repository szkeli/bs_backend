import { Module } from '@nestjs/common'

import { AuthService } from '../auth/auth.service'
import { JwtStrategy } from '../auth/jwt.strategy'
import { BlocksService } from '../blocks/blocks.service'
import { DbService } from '../db/db.service'
import { FoldsService } from '../folds/folds.service'
import { SharedModule } from '../shared/shared.module'
import { UserService } from '../user/user.service'
import { AdminResolver } from './admin.resolver'
import { AdminService } from './admin.service'

@Module({
  providers: [
    AdminResolver,
    AdminService,
    JwtStrategy,
    AuthService,
    UserService,
    DbService,
    FoldsService,
    BlocksService
  ],
  imports: [SharedModule]
})
export class AdminModule {}

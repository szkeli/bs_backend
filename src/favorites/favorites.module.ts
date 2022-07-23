import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { UserModule } from '../user/user.module'
import { FavoritesResolver } from './favorites.resolver'
import { FavoritesService } from './favorites.service'
import { UserResolver } from './user.resolver'

@Module({
  providers: [FavoritesResolver, FavoritesService, UserResolver],
  imports: [SharedModule, UserModule]
})
export class FavoritesModule {}

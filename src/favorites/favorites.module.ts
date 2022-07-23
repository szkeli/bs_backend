import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { FavoritesResolver } from './favorites.resolver'
import { FavoritesService } from './favorites.service'

@Module({
  providers: [FavoritesResolver, FavoritesService],
  imports: [SharedModule]
})
export class FavoritesModule {}

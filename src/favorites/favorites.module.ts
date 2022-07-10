import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { FavoritesResolver } from './favorites.resolver'
import { FavoritesService } from './favorites.service'

@Module({
  providers: [FavoritesResolver, FavoritesService, DbService]
})
export class FavoritesModule {}

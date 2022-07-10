import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { User } from '../user/models/user.model'
import { FavoritesService } from './favorites.service'
import { CreateFavoriteArgs, Favorite, FavoriteToUnion, RemoveFavoriteArgs } from './models/favorite.model'

@Resolver(of => Favorite)
export class FavoritesResolver {
  constructor (private readonly favoritesService: FavoritesService) {}

  @Mutation(of => Favorite)
  async createFavorite (@CurrentUser() user: User, @Args() args: CreateFavoriteArgs) {
    return await this.favoritesService.createFavorite(user, args)
  }

  @Mutation(of => Boolean)
  async removeFavorite (@CurrentUser() user: User, @Args() args: RemoveFavoriteArgs) {
    return await this.favoritesService.removeFavorite(user, args)
  }

  @ResolveField(of => User)
  async creator (@Parent() favorite: Favorite) {
    return await this.favoritesService.creator(favorite.id)
  }

  @ResolveField(of => FavoriteToUnion)
  async to (@Parent() favorite: Favorite) {
    return await this.favoritesService.to(favorite.id)
  }
}

import { Resolver } from '@nestjs/graphql'

import { Person } from '../user/models/user.model'
import { UserService } from '../user/user.service'
@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly userService: UserService) {}
}

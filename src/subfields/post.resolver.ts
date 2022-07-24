import { ResolveField, Resolver } from '@nestjs/graphql'

import { Post } from '../posts/models/post.model'
import { SubField } from './models/subfields.model'

@Resolver(of => Post)
export class PostResolver {
  @ResolveField(of => SubField, { description: '帖子所在的 SubField' })
  async subField () {}
}

import { Resolver } from '@nestjs/graphql'

import { PostsService } from '../posts/posts.service'
import { Node } from './models/node.model'

@Resolver(Node)
export class NodeResolver {
  constructor (private readonly postsService: PostsService) {}
}

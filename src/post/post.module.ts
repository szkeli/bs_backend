import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { PostResolver } from './post.resolver'
import { PostService } from './post.service'

@Module({
  imports: [SharedModule],
  providers: [PostResolver, PostService]
})
export class PostModule {}

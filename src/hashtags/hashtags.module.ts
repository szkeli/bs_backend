import { Module } from '@nestjs/common'

import { HashtagsResolver } from './hashtags.resolver'
import { HashtagsService } from './hashtags.service'

@Module({
  providers: [HashtagsResolver, HashtagsService]
})
export class HashtagsModule {}

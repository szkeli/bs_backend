import { Module } from '@nestjs/common'

import { MentionsResolver } from './mentions.resolver'
import { MentionsService } from './mentions.service'

@Module({
  providers: [MentionsService, MentionsResolver]
})
export class MentionsModule {}

import { Injectable } from '@nestjs/common'

import { RelayPagingConfigArgs } from '../posts/models/post.model'

@Injectable()
export class HashtagsService {
  async posts (id: string, args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }

  async hashtag (id: string) {
    throw new Error('Method not implemented.')
  }

  async hashtags (args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }
}

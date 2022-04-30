import { Injectable } from '@nestjs/common'

import { RelayPagingConfigArgs } from '../posts/models/post.model'

@Injectable()
export class MentionsService {
  async mention (id: string) {
    throw new Error('Method not implemented.')
  }

  async mentions (args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }

  async about (id: string) {
    throw new Error('Method not implemented.')
  }

  async creator (id: string) {
    throw new Error('Method not implemented.')
  }

  async to (id: string) {
    throw new Error('Method not implemented.')
  }
}

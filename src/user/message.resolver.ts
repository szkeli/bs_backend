import { ForbiddenException } from '@nestjs/common'
import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { DbService } from '../db/db.service'
import { Message, MessageCreatorUnion } from '../messages/models/messages.model'
import { User } from './models/user.model'

@Resolver(of => Message)
export class MessageResovler {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => MessageCreatorUnion, { description: '消息的创建者' })
  async creator (@Parent() message: Message) {
    const { id } = message
    const query = `
    query v($messageId: string) {
      message(func: uid($messageId)) @filter(type(Message)) {
        id: uid
        creator {
          id: uid
          expand(_all_)
          dgraph.type
        }
      }
    }
  `
    const res = await this.dbService.commitQuery<{message: Array<{creator: ((User | Admin) & {'dgraph.type': string[]})}>}>({
      query,
      vars: {
        $messageId: id
      }
    })
    if (res.message.length !== 1) {
      throw new ForbiddenException(`消息 ${id} 不存在`)
    }
    if (!res.message[0].creator) {
      throw new ForbiddenException(`消息 ${id} 没有创建者`)
    }
    const { creator } = res.message[0]
    if (creator['dgraph.type'].includes('User')) {
      return new User(creator as unknown as User)
    }
    if (creator['dgraph.type'].includes('Admin')) {
      return new Admin(creator as unknown as Admin)
    }
  }
}

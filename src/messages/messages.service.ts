import { Injectable } from '@nestjs/common'

@Injectable()
export class MessagesService {
  async message (id: string) {
    throw new Error('Method not implemented.')
  }

  async messages (first: number, offset: number) {
    throw new Error('Method not implemented.')
  }
}

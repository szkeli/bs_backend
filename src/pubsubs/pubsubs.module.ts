import { Module } from '@nestjs/common'
import { PubSub } from 'graphql-subscriptions'

import { PUB_SUB_KEY } from '../constants'

@Module({
  providers: [
    {
      provide: PUB_SUB_KEY,
      useValue: new PubSub()
    }
  ],
  exports: [
    PUB_SUB_KEY
  ]
})
export class PubsubsModule {}

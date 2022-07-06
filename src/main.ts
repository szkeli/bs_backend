import { ForbiddenException } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'

import { AppModule } from './app.module'

async function bootstrap () {
  process.setMaxListeners(500)
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  )
  const port = process.env.PORT
  if (!port) throw new ForbiddenException('SystemError: 必须提供 process.env.PORT')
  await app.listen(port, '0.0.0.0')
}

bootstrap().catch(e => { throw e })

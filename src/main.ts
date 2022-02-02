import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { readFileSync } from 'fs'

import { AppModule } from './app.module'

const httpsOptions = {
  key: readFileSync('./keys/api.szlikeyou.com.key'),
  cert: readFileSync('./keys/api.szlikeyou.com.crt')
}

async function bootstrap () {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      https: httpsOptions
    }))
  await app.listen(process.env.PORT, '0.0.0.0')
}

bootstrap().catch(e => { throw e })

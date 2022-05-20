import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { getLogger } from 'xmcommon'

import { AppModule } from './app.module'
import { NestLogger } from './log4js/nest.logger'

const log = getLogger(__filename)
log.info('app running...')
async function bootstrap () {
  process.setMaxListeners(500)
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger: new NestLogger()
    }
  )
  await app.listen(process.env.PORT, '0.0.0.0')
  log.info(`running on ${process.env.PORT}`)
}

bootstrap().catch(e => { throw e })

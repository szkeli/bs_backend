import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { PrismaService } from './shared/prisma.service'

async function bootstrap () {
  const app = await NestFactory.create(AppModule)

  const prismaService: PrismaService = app.get(PrismaService)
  void prismaService.enableShutdownHooks(app)

  await app.listen(3000)
}

void bootstrap()

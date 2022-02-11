import { Module } from '@nestjs/common';
import { AnonymousResolver } from './anonymous.resolver';
import { AnonymousService } from './anonymous.service';

@Module({
  providers: [AnonymousResolver, AnonymousService]
})
export class AnonymousModule {}

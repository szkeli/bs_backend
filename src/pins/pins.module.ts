import { Module } from '@nestjs/common';
import { PinsResolver } from './pins.resolver';
import { PinsService } from './pins.service';

@Module({
  providers: [PinsResolver, PinsService]
})
export class PinsModule {}

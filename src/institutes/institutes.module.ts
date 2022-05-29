import { Module } from '@nestjs/common';
import { InstitutesResolver } from './institutes.resolver';
import { InstitutesService } from './institutes.service';

@Module({
  providers: [InstitutesResolver, InstitutesService]
})
export class InstitutesModule {}

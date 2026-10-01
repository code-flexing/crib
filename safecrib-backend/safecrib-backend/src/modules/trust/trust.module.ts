import { Module } from '@nestjs/common';
import { QueueModule } from '../../infra/queue/queue.module.js';
import { TrustService } from './trust.service.js';
import { TrustController } from './trust.controller.js';

@Module({
  imports: [QueueModule],
  controllers: [TrustController],
  providers: [TrustService],
  exports: [TrustService],
})
export class TrustModule {}

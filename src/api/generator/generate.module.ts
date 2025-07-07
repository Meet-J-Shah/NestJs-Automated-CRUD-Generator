import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { GenerateService } from './generate.service';
import { GenerateController } from './generate.controller';
import { GenerateProcessor } from './generate.processor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    BullModule.forRoot({
      // Add this global configuration
      redis: {
        host: 'localhost',
        port: 6379,
      },
      defaultJobOptions: {
        removeOnComplete: true, // Remove job when completed successfully
        removeOnFail: true, // Remove job when failed
        attempts: 1, // Don't retry failed jobs
      },
    }),
    BullModule.registerQueue({
      name: 'generate-queue',
      settings: {
        stalledInterval: 0, // Disable stalled job detection
        maxStalledCount: 0, // Don't reprocess "stalled" jobs
      },
    }),
  ],
  controllers: [GenerateController],
  providers: [GenerateService, GenerateProcessor],
})
export class GenerateModule {}

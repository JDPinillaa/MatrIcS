import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecognizePlateUseCase } from './application/use-cases/lpr/recognize-plate.use-case';
import { PLATE_OCR_RECOGNIZER_PORT } from './domain/ports/plate-ocr-recognizer.port';
import { LprReaderFactory } from './infrastructure/adapters/lpr-reader.factory';
import { LprController } from './presentation/controllers/lpr.controller';

@Module({
  controllers: [LprController],
  providers: [
    {
      provide: PLATE_OCR_RECOGNIZER_PORT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        LprReaderFactory.createImageRecognizer(configService),
    },
    RecognizePlateUseCase,
  ],
  exports: [PLATE_OCR_RECOGNIZER_PORT],
})
export class LprModule {}

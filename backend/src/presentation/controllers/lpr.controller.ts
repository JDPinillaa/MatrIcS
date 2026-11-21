import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecognizePlateUseCase } from '../../application/use-cases/lpr/recognize-plate.use-case';
import type {
  OcrImageInput,
  OcrRecognitionResult,
} from '../../domain/ports/plate-ocr-recognizer.port';

@Controller('lpr')
export class LprController {
  constructor(private readonly recognizePlateUseCase: RecognizePlateUseCase) {}

  @Post('reconocer')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('imagen'))
  async reconocerPlaca(
    @UploadedFile() file: OcrImageInput | undefined,
  ): Promise<OcrRecognitionResult> {
    return this.recognizePlateUseCase.execute(file);
  }
}

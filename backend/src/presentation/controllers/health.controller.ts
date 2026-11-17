import { Controller, Get } from '@nestjs/common';
import {
  CheckHealthUseCase,
  type HealthStatusResponse,
} from '../../application/use-cases/health/check-health.use-case';

@Controller('health')
export class HealthController {
  constructor(private readonly checkHealthUseCase: CheckHealthUseCase) {}

  @Get()
  async checkHealth(): Promise<HealthStatusResponse> {
    return this.checkHealthUseCase.execute();
  }
}

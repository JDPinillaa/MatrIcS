import { Injectable } from '@nestjs/common';
import type { IClock } from '../../domain/ports/clock.port';

@Injectable()
export class SystemClockAdapter implements IClock {
  now(): Date {
    return new Date();
  }
}

import { Controller, Get, Logger, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BenchmarkingService } from './benchmarking.service';
import { SpendingComparisonDto } from './dto/spending-comparison.dto';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('benchmarking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('benchmarking')
export class BenchmarkingController {
  private readonly logger = new Logger(BenchmarkingController.name);

  constructor(private readonly benchmarkingService: BenchmarkingService) {}

  @Get('spending-comparison')
  @ApiOperation({
    summary: 'Compare your spending patterns with other users (anonymized)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns spending comparison with insights',
    type: SpendingComparisonDto,
  })
  async compareSpendingPatterns(
    @Request() req,
  ): Promise<SpendingComparisonDto> {
    this.logger.log(`User ${req.user.id} requesting spending comparison`);
    return this.benchmarkingService.compareSpendingPatterns(req.user.id);
  }
}

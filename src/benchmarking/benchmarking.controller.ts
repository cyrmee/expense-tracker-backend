import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { BenchmarkingService } from './benchmarking.service';
import { SpendingComparisonDto } from './dto/spending-comparison.dto';

@ApiTags('benchmarking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('benchmarking')
export class BenchmarkingController {
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
    return this.benchmarkingService.compareSpendingPatterns(req.user.id);
  }
}

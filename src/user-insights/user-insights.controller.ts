import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { UserInsightsService as UserInsightsService } from './user-insights.service';
import { SpendingComparisonDto } from './dto/spending-comparison.dto';

@ApiTags('user-insights')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('user-insights')
export class UserInsightsController {
  constructor(private readonly userInsightsService: UserInsightsService) {}

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
    return this.userInsightsService .compareSpendingPatterns(req.user.id);
  }
}

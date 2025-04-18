import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DataService } from './data.service';
import { ExportDataResponseDto, ImportDataDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('data')
@Controller('data')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export all user data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all user data (excluding sensitive information)',
    type: ExportDataResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async exportData(@Request() req) {
    return await this.dataService.exportData(req.user.id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import user data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Data has been successfully imported',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data format or content',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async importData(@Request() req, @Body() importDataDto: ImportDataDto) {
    await this.dataService.importData(req.user.id, importDataDto);
    return { message: 'Data imported successfully' };
  }
}

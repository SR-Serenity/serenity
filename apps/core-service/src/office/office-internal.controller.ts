import { Body, Controller, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LiveTranscriptSegmentDto } from './dto/office.dto';
import { OfficeService } from './office.service';

@ApiTags('office-internal')
@Controller('office/internal')
export class OfficeInternalController {
  constructor(private readonly officeService: OfficeService) {}

  @Post('rooms/:roomId/live-transcript')
  @ApiOperation({ summary: 'Append a live transcript segment from the AI worker' })
  appendLiveTranscript(
    @Param('roomId') roomId: string,
    @Headers('x-internal-api-token') token: string | undefined,
    @Body() body: LiveTranscriptSegmentDto,
  ) {
    const expectedToken = process.env.INTERNAL_API_TOKEN ?? process.env.AI_INTERNAL_API_TOKEN;
    if (expectedToken && token !== expectedToken) {
      throw new UnauthorizedException('Invalid internal API token');
    }
    return this.officeService.appendLiveTranscriptSegment(roomId, body);
  }
}

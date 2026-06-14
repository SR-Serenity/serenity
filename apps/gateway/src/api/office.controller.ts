import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProxyService } from './api-proxy.service';

type RequestWithAuth = { headers: { authorization?: string } };

@ApiTags('office')
@ApiBearerAuth()
@Controller('office')
export class OfficeController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Post('rooms/list')
  @ApiOperation({ summary: 'List office rooms' })
  listRooms(@Req() req: RequestWithAuth) {
    return this.apiProxy.forwardPostRequest('office/rooms/list', {}, req.headers.authorization);
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Create an office room' })
  createRoom(@Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardPostRequest('office/rooms', body, req.headers.authorization);
  }

  @Patch('rooms/:roomId')
  @ApiOperation({ summary: 'Update an office room' })
  updateRoom(@Param('roomId') roomId: string, @Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardPatchRequest(
      `office/rooms/${roomId}`,
      body,
      req.headers.authorization,
    );
  }

  @Delete('rooms/:roomId')
  @ApiOperation({ summary: 'Delete an office room' })
  deleteRoom(@Param('roomId') roomId: string, @Req() req: RequestWithAuth) {
    return this.apiProxy.forwardDeleteRequest(`office/rooms/${roomId}`, req.headers.authorization);
  }

  @Post('rooms/:roomId/join')
  @ApiOperation({ summary: 'Join an office room' })
  joinRoom(@Param('roomId') roomId: string, @Req() req: RequestWithAuth) {
    return this.apiProxy.forwardPostRequest(
      `office/rooms/${roomId}/join`,
      {},
      req.headers.authorization,
    );
  }

  @Post('rooms/:roomId/leave')
  @ApiOperation({ summary: 'Leave an office room' })
  leaveRoom(@Param('roomId') roomId: string, @Req() req: RequestWithAuth) {
    return this.apiProxy.forwardPostRequest(
      `office/rooms/${roomId}/leave`,
      {},
      req.headers.authorization,
    );
  }

  @Get('rooms/:roomId/note')
  @ApiOperation({ summary: 'Get active meeting note' })
  getMeetingNote(@Param('roomId') roomId: string, @Req() req: RequestWithAuth) {
    return this.apiProxy.forwardGetRequest(
      `office/rooms/${roomId}/note`,
      req.headers.authorization,
    );
  }

  @Patch('rooms/:roomId/note')
  @ApiOperation({ summary: 'Update meeting note' })
  updateMeetingNote(
    @Param('roomId') roomId: string,
    @Req() req: RequestWithAuth,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPatchRequest(
      `office/rooms/${roomId}/note`,
      body,
      req.headers.authorization,
    );
  }

  @Post('rooms/:roomId/note/summarize')
  @ApiOperation({ summary: 'Generate AI meeting notes from room transcript' })
  summarizeMeetingNote(
    @Param('roomId') roomId: string,
    @Req() req: RequestWithAuth,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPostRequest(
      `office/rooms/${roomId}/note/summarize`,
      body,
      req.headers.authorization,
    );
  }

  @Post('rooms/:roomId/note/transcribe')
  @ApiOperation({ summary: 'Transcribe a final meeting recording' })
  transcribeMeetingRecording(
    @Param('roomId') roomId: string,
    @Req() req: RequestWithAuth,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPostRequest(
      `office/rooms/${roomId}/note/transcribe`,
      body,
      req.headers.authorization,
    );
  }

  @Post('rooms/:roomId/live-transcription/start')
  @ApiOperation({ summary: 'Start all-speaker live transcription for a room' })
  startLiveTranscription(
    @Param('roomId') roomId: string,
    @Req() req: RequestWithAuth,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPostRequest(
      `office/rooms/${roomId}/live-transcription/start`,
      body,
      req.headers.authorization,
    );
  }

  @Post('rooms/:roomId/live-transcription/stop')
  @ApiOperation({ summary: 'Stop all-speaker live transcription for a room' })
  stopLiveTranscription(@Param('roomId') roomId: string, @Req() req: RequestWithAuth) {
    return this.apiProxy.forwardPostRequest(
      `office/rooms/${roomId}/live-transcription/stop`,
      {},
      req.headers.authorization,
    );
  }

  @Post('rooms/:roomId/token')
  @ApiOperation({ summary: 'Generate LiveKit token for a room' })
  generateToken(@Param('roomId') roomId: string, @Req() req: RequestWithAuth) {
    return this.apiProxy.forwardPostRequest(
      `office/rooms/${roomId}/token`,
      {},
      req.headers.authorization,
    );
  }
}

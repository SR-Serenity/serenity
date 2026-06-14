import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';
import { OfficeService } from './office.service';
import {
  CreateRoomDto,
  StartLiveTranscriptionDto,
  SummarizeMeetingNoteDto,
  TranscribeMeetingRecordingDto,
  UpdateMeetingNoteDto,
  UpdateRoomDto,
} from './dto/office.dto';

@ApiTags('office')
@ApiBearerAuth()
@Controller('office')
@UseGuards(JwtAuthGuard)
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  @Post('rooms/list')
  @ApiOperation({ summary: 'List office rooms for the current workspace' })
  listRooms(@CurrentUser() user: AuthUser) {
    return this.officeService.listRooms(user);
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Create an office room (admin/owner only)' })
  createRoom(@CurrentUser() user: AuthUser, @Body() body: CreateRoomDto) {
    return this.officeService.createRoom(user, body);
  }

  @Patch('rooms/:roomId')
  @ApiOperation({ summary: 'Update an office room' })
  updateRoom(
    @CurrentUser() user: AuthUser,
    @Param('roomId') roomId: string,
    @Body() body: UpdateRoomDto,
  ) {
    return this.officeService.updateRoom(user, roomId, body);
  }

  @Delete('rooms/:roomId')
  @ApiOperation({ summary: 'Delete an office room (admin/owner only)' })
  deleteRoom(@CurrentUser() user: AuthUser, @Param('roomId') roomId: string) {
    return this.officeService.deleteRoom(user, roomId);
  }

  @Post('rooms/:roomId/join')
  @ApiOperation({ summary: 'Join an office room' })
  joinRoom(@CurrentUser() user: AuthUser, @Param('roomId') roomId: string) {
    return this.officeService.joinRoom(user, roomId);
  }

  @Post('rooms/:roomId/leave')
  @ApiOperation({ summary: 'Leave an office room' })
  leaveRoom(@CurrentUser() user: AuthUser, @Param('roomId') roomId: string) {
    return this.officeService.leaveRoom(user, roomId);
  }

  @Get('rooms/:roomId/note')
  @ApiOperation({ summary: 'Get the active meeting note for a room' })
  getMeetingNote(@CurrentUser() user: AuthUser, @Param('roomId') roomId: string) {
    return this.officeService.getMeetingNote(user, roomId);
  }

  @Patch('rooms/:roomId/note')
  @ApiOperation({ summary: 'Update the active meeting note for a room' })
  updateMeetingNote(
    @CurrentUser() user: AuthUser,
    @Param('roomId') roomId: string,
    @Body() body: UpdateMeetingNoteDto,
  ) {
    return this.officeService.updateMeetingNote(user, roomId, body);
  }

  @Post('rooms/:roomId/note/summarize')
  @ApiOperation({ summary: 'Generate AI meeting notes from the active room transcript' })
  summarizeMeetingNote(
    @CurrentUser() user: AuthUser,
    @Param('roomId') roomId: string,
    @Body() body: SummarizeMeetingNoteDto,
  ) {
    return this.officeService.summarizeMeetingNote(user, roomId, body);
  }

  @Post('rooms/:roomId/note/transcribe')
  @ApiOperation({ summary: 'Transcribe a final meeting recording and update meeting notes' })
  transcribeMeetingRecording(
    @CurrentUser() user: AuthUser,
    @Param('roomId') roomId: string,
    @Body() body: TranscribeMeetingRecordingDto,
  ) {
    return this.officeService.transcribeMeetingRecording(user, roomId, body);
  }

  @Post('rooms/:roomId/live-transcription/start')
  @ApiOperation({ summary: 'Start all-speaker live transcription for a room' })
  startLiveTranscription(
    @CurrentUser() user: AuthUser,
    @Param('roomId') roomId: string,
    @Body() body: StartLiveTranscriptionDto,
  ) {
    return this.officeService.startLiveTranscription(user, roomId, body);
  }

  @Post('rooms/:roomId/live-transcription/stop')
  @ApiOperation({ summary: 'Stop all-speaker live transcription for a room' })
  stopLiveTranscription(@CurrentUser() user: AuthUser, @Param('roomId') roomId: string) {
    return this.officeService.stopLiveTranscription(user, roomId);
  }

  @Post('rooms/:roomId/token')
  @ApiOperation({ summary: 'Generate a LiveKit token for joining the room meeting' })
  generateLiveKitToken(@CurrentUser() user: AuthUser, @Param('roomId') roomId: string) {
    return this.officeService.generateLiveKitToken(user, roomId);
  }
}

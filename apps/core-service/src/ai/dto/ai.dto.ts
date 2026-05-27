import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateAiSessionDto {
  @ApiProperty()
  @IsString()
  title: string;
}

export class UpdateAiSessionDto {
  @ApiProperty()
  @IsString()
  title: string;
}

export class AiMessageSourceDto {
  @ApiProperty()
  type: string;
  @ApiPropertyOptional() fileId?: string | null;
  @ApiPropertyOptional() page?: number | null;
  @ApiPropertyOptional() title?: string | null;
  @ApiPropertyOptional() url?: string | null;
  @ApiPropertyOptional() snippet?: string | null;
}

export class AiProposedActionDto {
  @ApiProperty()
  type: string;
  @ApiProperty()
  payload: Record<string, unknown>;
  @ApiProperty()
  confidence: number;
  @ApiProperty()
  requiresConfirmation: boolean;
}

export class AppendAiMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsString()
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ type: [AiMessageSourceDto] })
  @IsOptional()
  @IsArray()
  sources?: AiMessageSourceDto[];

  @ApiPropertyOptional({ type: [AiProposedActionDto] })
  @IsOptional()
  @IsArray()
  proposedActions?: AiProposedActionDto[];
}

export class AppendAiMessagesDto {
  @ApiProperty({ type: [AppendAiMessageDto] })
  @IsArray()
  messages: AppendAiMessageDto[];
}

export class UpdateAiMessageDto {
  @ApiPropertyOptional({ type: [AiProposedActionDto] })
  @IsOptional()
  @IsArray()
  proposedActions?: AiProposedActionDto[];
}

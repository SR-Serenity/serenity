import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProxyService } from './api-proxy.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

enum ContactType {
  EMPLOYEE = 'EMPLOYEE',
  GUEST = 'GUEST',
  AI_AGENT = 'AI_AGENT',
}

enum ContactStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  ARCHIVED = 'ARCHIVED',
}

class CreateContactBodyDto {
  @ApiProperty({ enum: [ContactType.GUEST, ContactType.AI_AGENT], enumName: 'ContactType' })
  @IsEnum(ContactType)
    type!: ContactType.GUEST | ContactType.AI_AGENT;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
    displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
    email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
    phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
    company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
    title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
    notes?: string;
}

class UpdateContactBodyDto {
  @ApiPropertyOptional({ enum: ContactStatus, enumName: 'ContactStatus' })
  @IsOptional()
  @IsEnum(ContactStatus)
    status?: ContactStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
    displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
    email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
    phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
    company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
    title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    departmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
    notes?: string | null;
}

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get()
  @ApiOperation({ summary: 'List contact directory' })
  @ApiOkResponse({ description: 'Contacts retrieved' })
  listContacts(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardGetRequest('contacts', authorization);
  }

  @Post()
  @ApiOperation({ summary: 'Create guest or AI agent contact' })
  @ApiBody({ type: CreateContactBodyDto })
  @ApiCreatedResponse({ description: 'Contact created' })
  createContact(@Req() req: RequestWithAuth, @Body() body: CreateContactBodyDto) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPostRequest('contacts', body, authorization);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update guest or AI agent contact' })
  @ApiBody({ type: UpdateContactBodyDto })
  @ApiOkResponse({ description: 'Contact updated' })
  updateContact(
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
    @Body() body: UpdateContactBodyDto,
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPatchRequest(`contacts/${id}`, body, authorization);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive guest or AI agent contact' })
  @ApiNoContentResponse({ description: 'Contact archived' })
  archiveContact(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardDeleteRequest(`contacts/${id}`, authorization);
  }
}

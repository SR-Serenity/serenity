import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { ContactDto, CreateContactDto, ListContactsResponseDto, UpdateContactDto } from './dto/contact.dto';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List organization contact directory' })
  @ApiOkResponse({ type: ListContactsResponseDto })
  listContacts(@CurrentUser() user: AuthUser) {
    return this.contactsService.listContacts(user.orgId, user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create guest or AI agent contact' })
  @ApiBody({ type: CreateContactDto })
  @ApiCreatedResponse({ type: ContactDto })
  createContact(@CurrentUser() user: AuthUser, @Body() body: CreateContactDto) {
    return this.contactsService.createContact(user.orgId, user.userId, user.role, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update guest or AI agent contact' })
  @ApiBody({ type: UpdateContactDto })
  @ApiOkResponse({ type: ContactDto })
  updateContact(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateContactDto,
  ) {
    return this.contactsService.updateContact(user.orgId, id, user.userId, user.role, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive guest or AI agent contact' })
  @ApiNoContentResponse({ description: 'Contact archived' })
  archiveContact(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contactsService.archiveContact(user.orgId, id, user.userId, user.role);
  }
}

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
import {
  CreateWikiPageDto,
  DeleteWikiPageResponseDto,
  ListWikiPagesResponseDto,
  ListWikiSharesResponseDto,
  ShareWikiPageDto,
  UpdateShareDto,
  UpdateWikiPageDto,
  WikiFavoriteResponseDto,
  WikiPageDto,
  WikiPageShareDto,
} from './dto/wiki.dto';
import { WikiService } from './wiki.service';

@ApiTags('wiki')
@ApiBearerAuth()
@Controller('wiki/pages')
@UseGuards(JwtAuthGuard)
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  @Get()
  @ApiOperation({ summary: 'List accessible wiki pages' })
  @ApiOkResponse({ type: ListWikiPagesResponseDto })
  listPages(@CurrentUser() user: AuthUser) {
    return this.wikiService.listPages(user.orgId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wiki page' })
  @ApiOkResponse({ type: WikiPageDto })
  getPage(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.wikiService.getPage(user.orgId, user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create wiki page' })
  @ApiBody({ type: CreateWikiPageDto })
  @ApiCreatedResponse({ type: WikiPageDto })
  createPage(@CurrentUser() user: AuthUser, @Body() body: CreateWikiPageDto) {
    return this.wikiService.createPage(user.orgId, user.userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update wiki page' })
  @ApiBody({ type: UpdateWikiPageDto })
  @ApiOkResponse({ type: WikiPageDto })
  updatePage(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateWikiPageDto,
  ) {
    return this.wikiService.updatePage(user.orgId, user.userId, user.role, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete wiki page' })
  @ApiNoContentResponse({ type: DeleteWikiPageResponseDto })
  deletePage(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.wikiService.deletePage(user.orgId, user.userId, user.role, id);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Favorite wiki page' })
  @ApiOkResponse({ type: WikiFavoriteResponseDto })
  favoritePage(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.wikiService.favoritePage(user.orgId, user.userId, id);
  }

  @Delete(':id/favorite')
  @ApiOperation({ summary: 'Unfavorite wiki page' })
  @ApiOkResponse({ type: WikiFavoriteResponseDto })
  unfavoritePage(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.wikiService.unfavoritePage(user.orgId, user.userId, id);
  }

  // ── Shares ────────────────────────────────────────────────────────────────

  @Get(':id/shares')
  @ApiOperation({ summary: 'List shares for a wiki page' })
  @ApiOkResponse({ type: ListWikiSharesResponseDto })
  listShares(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.wikiService.listShares(user.orgId, user.userId, id);
  }

  @Post(':id/shares')
  @ApiOperation({ summary: 'Share wiki page with a user' })
  @ApiBody({ type: ShareWikiPageDto })
  @ApiCreatedResponse({ type: WikiPageShareDto })
  shareWithUser(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: ShareWikiPageDto,
  ) {
    return this.wikiService.shareWithUser(user.orgId, user.userId, id, body);
  }

  @Patch(':id/shares/:userId')
  @ApiOperation({ summary: 'Update share permission' })
  @ApiBody({ type: UpdateShareDto })
  @ApiOkResponse({ type: WikiPageShareDto })
  updateShare(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateShareDto,
  ) {
    return this.wikiService.updateShare(user.orgId, user.userId, id, targetUserId, body);
  }

  @Delete(':id/shares/:userId')
  @ApiOperation({ summary: 'Remove share' })
  @ApiOkResponse({ type: DeleteWikiPageResponseDto })
  removeShare(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.wikiService.removeShare(user.orgId, user.userId, id, targetUserId);
  }
}

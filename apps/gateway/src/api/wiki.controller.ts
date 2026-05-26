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
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProxyService } from './api-proxy.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

enum WikiPageVisibility {
  WORKSPACE = 'WORKSPACE',
  DEPARTMENT = 'DEPARTMENT',
  PRIVATE = 'PRIVATE',
}

enum WikiSharePermission {
  VIEW = 'VIEW',
  COMMENT = 'COMMENT',
  EDIT = 'EDIT',
}

class ShareWikiPageBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
    userId!: string;

  @ApiProperty({ enum: WikiSharePermission, enumName: 'WikiSharePermission' })
  @IsEnum(WikiSharePermission)
    permission!: WikiSharePermission;
}

class UpdateShareBodyDto {
  @ApiProperty({ enum: WikiSharePermission, enumName: 'WikiSharePermission' })
  @IsEnum(WikiSharePermission)
    permission!: WikiSharePermission;
}

class CreateWikiPageBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
    title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
    icon?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
    coverColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80000)
    contentMarkdown?: string | null;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' }, nullable: true })
  @IsOptional()
  @IsArray()
    contentJson?: unknown[] | null;

  @ApiProperty({ enum: WikiPageVisibility, enumName: 'WikiPageVisibility' })
  @IsEnum(WikiPageVisibility)
    visibility!: WikiPageVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    departmentId?: string | null;
}

class UpdateWikiPageBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
    title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
    icon?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
    coverColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80000)
    contentMarkdown?: string | null;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' }, nullable: true })
  @IsOptional()
  @IsArray()
    contentJson?: unknown[] | null;

  @ApiPropertyOptional({ enum: WikiPageVisibility, enumName: 'WikiPageVisibility' })
  @IsOptional()
  @IsEnum(WikiPageVisibility)
    visibility?: WikiPageVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    departmentId?: string | null;
}

@ApiTags('wiki')
@ApiBearerAuth()
@Controller('wiki/pages')
export class WikiController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get()
  @ApiOperation({ summary: 'List accessible wiki pages' })
  @ApiOkResponse({ description: 'Wiki pages retrieved' })
  listPages(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardGetRequest('wiki/pages', authorization);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wiki page' })
  @ApiOkResponse({ description: 'Wiki page retrieved' })
  getPage(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardGetRequest(`wiki/pages/${id}`, authorization);
  }

  @Post()
  @ApiOperation({ summary: 'Create wiki page' })
  @ApiBody({ type: CreateWikiPageBodyDto })
  @ApiCreatedResponse({ description: 'Wiki page created' })
  createPage(@Req() req: RequestWithAuth, @Body() body: CreateWikiPageBodyDto) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPostRequest('wiki/pages', body, authorization);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update wiki page' })
  @ApiBody({ type: UpdateWikiPageBodyDto })
  @ApiOkResponse({ description: 'Wiki page updated' })
  updatePage(
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
    @Body() body: UpdateWikiPageBodyDto,
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPatchRequest(`wiki/pages/${id}`, body, authorization);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete wiki page' })
  @ApiNoContentResponse({ description: 'Wiki page deleted' })
  deletePage(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardDeleteRequest(`wiki/pages/${id}`, authorization);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Favorite wiki page' })
  @ApiOkResponse({ description: 'Wiki page favorited' })
  favoritePage(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPostRequest(`wiki/pages/${id}/favorite`, {}, authorization);
  }

  @Delete(':id/favorite')
  @ApiOperation({ summary: 'Unfavorite wiki page' })
  @ApiOkResponse({ description: 'Wiki page unfavorited' })
  unfavoritePage(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardDeleteRequest(`wiki/pages/${id}/favorite`, authorization);
  }

  // ── Shares ────────────────────────────────────────────────────────────────

  @Get(':id/shares')
  @ApiOperation({ summary: 'List shares for a wiki page' })
  @ApiOkResponse({ description: 'Shares retrieved' })
  listShares(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardGetRequest(`wiki/pages/${id}/shares`, authorization);
  }

  @Post(':id/shares')
  @ApiOperation({ summary: 'Share wiki page with a user' })
  @ApiBody({ type: ShareWikiPageBodyDto })
  @ApiCreatedResponse({ description: 'Share created' })
  shareWithUser(
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
    @Body() body: ShareWikiPageBodyDto,
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPostRequest(`wiki/pages/${id}/shares`, body, authorization);
  }

  @Patch(':id/shares/:userId')
  @ApiOperation({ summary: 'Update share permission' })
  @ApiBody({ type: UpdateShareBodyDto })
  @ApiOkResponse({ description: 'Share updated' })
  updateShare(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: RequestWithAuth,
    @Body() body: UpdateShareBodyDto,
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPatchRequest(`wiki/pages/${id}/shares/${userId}`, body, authorization);
  }

  @Delete(':id/shares/:userId')
  @ApiOperation({ summary: 'Remove share' })
  @ApiOkResponse({ description: 'Share removed' })
  removeShare(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: RequestWithAuth,
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardDeleteRequest(`wiki/pages/${id}/shares/${userId}`, authorization);
  }
}

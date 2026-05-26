import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, WikiPageVisibility, WikiSharePermission, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreateWikiPageDto,
  ShareWikiPageDto,
  UpdateShareDto,
  UpdateWikiPageDto,
} from './dto/wiki.dto';

type Membership = {
  role: WorkspaceRole;
  departmentId: string | null;
};

type WikiPageWithMeta = Prisma.WikiPageGetPayload<{
  include: {
    department: { select: { name: true } };
    favorites: { select: { userId: true } };
    shares: {
      select: {
        id: true;
        userId: true;
        permission: true;
        createdAt: true;
        user: { select: { id: true; displayName: true; email: true } };
      };
    };
  };
}>;

@Injectable()
export class WikiService {
  constructor(private readonly prisma: PrismaService) {}

  async listPages(orgId: string, userId: string) {
    const membership = await this.getMembership(orgId, userId);
    const accessFilter = await this.buildAccessWhere(orgId, userId, membership);

    const pages = await this.prisma.wikiPage.findMany({
      where: { orgId, deletedAt: null, ...accessFilter },
      include: this.includeMeta(userId),
      orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
    });

    return { pages: pages.map((page) => this.toDto(page, userId, membership)) };
  }

  async getPage(orgId: string, userId: string, pageId: string) {
    const membership = await this.getMembership(orgId, userId);
    const page = await this.findVisiblePage(orgId, userId, membership, pageId);

    await this.prisma.wikiPageRecent.upsert({
      where: { pageId_userId: { pageId: page.id, userId } },
      create: { pageId: page.id, userId },
      update: { viewedAt: new Date() },
    });

    return this.toDto(page, userId, membership);
  }

  async createPage(orgId: string, userId: string, input: CreateWikiPageDto) {
    const membership = await this.getMembership(orgId, userId);
    await this.validateVisibility(orgId, userId, membership, input.visibility, input.departmentId);
    await this.validateParent(orgId, userId, membership, input.parentId);

    const page = await this.prisma.wikiPage.create({
      data: {
        orgId,
        createdById: userId,
        parentId: input.parentId || null,
        title: input.title.trim(),
        icon: this.nullableText(input.icon),
        coverColor: this.nullableText(input.coverColor),
        contentMarkdown: input.contentMarkdown ?? '',
        contentJson: input.contentJson ?? Prisma.JsonNull,
        visibility: input.visibility,
        departmentId: input.visibility === WikiPageVisibility.DEPARTMENT
          ? input.departmentId
          : null,
      },
      include: this.includeMeta(userId),
    });

    return this.toDto(page, userId, membership);
  }

  async updatePage(
    orgId: string,
    userId: string,
    role: WorkspaceRole,
    pageId: string,
    input: UpdateWikiPageDto,
  ) {
    const membership = await this.getMembership(orgId, userId);
    const existing = await this.findVisiblePage(orgId, userId, membership, pageId);
    this.assertCanEdit(existing, userId, role);

    const nextVisibility = input.visibility ?? existing.visibility;
    const nextDepartmentId = input.departmentId !== undefined
      ? input.departmentId
      : existing.departmentId;
    await this.validateVisibility(orgId, userId, membership, nextVisibility, nextDepartmentId);

    if (input.parentId !== undefined) {
      if (input.parentId === pageId) {
        throw new BadRequestException('A page cannot be nested under itself');
      }
      await this.validateParent(orgId, userId, membership, input.parentId);
    }

    const data: Prisma.WikiPageUpdateInput = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.parentId !== undefined) {
      data.parent = input.parentId ? { connect: { id: input.parentId } } : { disconnect: true };
    }
    if (input.icon !== undefined) data.icon = this.nullableText(input.icon);
    if (input.coverColor !== undefined) data.coverColor = this.nullableText(input.coverColor);
    if (input.contentMarkdown !== undefined) data.contentMarkdown = input.contentMarkdown ?? '';
    if (input.contentJson !== undefined) data.contentJson = input.contentJson ?? Prisma.JsonNull;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.visibility !== undefined || input.departmentId !== undefined) {
      data.department = nextVisibility === WikiPageVisibility.DEPARTMENT && nextDepartmentId
        ? { connect: { id: nextDepartmentId } }
        : { disconnect: true };
    }

    const page = await this.prisma.wikiPage.update({
      where: { id: existing.id },
      data,
      include: this.includeMeta(userId),
    });

    return this.toDto(page, userId, membership);
  }

  async deletePage(orgId: string, userId: string, role: WorkspaceRole, pageId: string) {
    const membership = await this.getMembership(orgId, userId);
    const existing = await this.findVisiblePage(orgId, userId, membership, pageId);
    this.assertCanEdit(existing, userId, role);

    await this.prisma.wikiPage.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async favoritePage(orgId: string, userId: string, pageId: string) {
    const membership = await this.getMembership(orgId, userId);
    const page = await this.findVisiblePage(orgId, userId, membership, pageId);

    await this.prisma.wikiPageFavorite.upsert({
      where: { pageId_userId: { pageId: page.id, userId } },
      create: { pageId: page.id, userId },
      update: {},
    });

    return { favorite: true };
  }

  async unfavoritePage(orgId: string, userId: string, pageId: string) {
    const membership = await this.getMembership(orgId, userId);
    const page = await this.findVisiblePage(orgId, userId, membership, pageId);

    await this.prisma.wikiPageFavorite.deleteMany({
      where: { pageId: page.id, userId },
    });

    return { favorite: false };
  }

  // ── Share methods ────────────────────────────────────────────────────────

  async listShares(orgId: string, userId: string, pageId: string) {
    const membership = await this.getMembership(orgId, userId);
    const page = await this.findVisiblePage(orgId, userId, membership, pageId);

    const shares = await this.prisma.wikiPageShare.findMany({
      where: { pageId: page.id },
      include: { user: { select: { id: true, displayName: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { shares: shares.map(this.toShareDto) };
  }

  async shareWithUser(
    orgId: string,
    userId: string,
    pageId: string,
    input: ShareWikiPageDto,
  ) {
    const membership = await this.getMembership(orgId, userId);
    const page = await this.findVisiblePage(orgId, userId, membership, pageId);
    this.assertCanShare(page, userId, membership.role);

    if (input.userId === userId) {
      throw new BadRequestException('You cannot share a page with yourself');
    }

    const targetMember = await this.prisma.workspaceMember.findFirst({
      where: { orgId, userId: input.userId },
    });
    if (!targetMember) {
      throw new NotFoundException('User is not a member of this workspace');
    }

    const share = await this.prisma.wikiPageShare.upsert({
      where: { pageId_userId: { pageId: page.id, userId: input.userId } },
      create: {
        pageId: page.id,
        userId: input.userId,
        permission: input.permission,
        grantedById: userId,
      },
      update: { permission: input.permission },
      include: { user: { select: { id: true, displayName: true, email: true } } },
    });

    return this.toShareDto(share);
  }

  async updateShare(
    orgId: string,
    userId: string,
    pageId: string,
    targetUserId: string,
    input: UpdateShareDto,
  ) {
    const membership = await this.getMembership(orgId, userId);
    const page = await this.findVisiblePage(orgId, userId, membership, pageId);
    this.assertCanShare(page, userId, membership.role);

    const existing = await this.prisma.wikiPageShare.findUnique({
      where: { pageId_userId: { pageId: page.id, userId: targetUserId } },
    });
    if (!existing) {
      throw new NotFoundException('Share not found');
    }

    const share = await this.prisma.wikiPageShare.update({
      where: { pageId_userId: { pageId: page.id, userId: targetUserId } },
      data: { permission: input.permission },
      include: { user: { select: { id: true, displayName: true, email: true } } },
    });

    return this.toShareDto(share);
  }

  async removeShare(
    orgId: string,
    userId: string,
    pageId: string,
    targetUserId: string,
  ) {
    const membership = await this.getMembership(orgId, userId);
    const page = await this.findVisiblePage(orgId, userId, membership, pageId);
    this.assertCanShare(page, userId, membership.role);

    await this.prisma.wikiPageShare.deleteMany({
      where: { pageId: page.id, userId: targetUserId },
    });

    return { success: true };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private includeMeta(userId: string) {
    return {
      department: { select: { name: true } },
      favorites: {
        where: { userId },
        select: { userId: true },
      },
      shares: {
        select: {
          id: true,
          userId: true,
          permission: true,
          createdAt: true,
          user: { select: { id: true, displayName: true, email: true } },
        },
      },
    } as const;
  }

  private async getMembership(orgId: string, userId: string): Promise<Membership> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { orgId, userId },
      select: { role: true, departmentId: true },
    });

    if (!membership) {
      throw new UnauthorizedException('Organization access denied');
    }

    return membership;
  }

  private async buildAccessWhere(
    orgId: string,
    userId: string,
    membership: Membership,
  ): Promise<Prisma.WikiPageWhereInput> {
    if (membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN) {
      return {};
    }

    const inheritedIds = await this.getDescendantsOfSharedPages(orgId, userId);

    return {
      OR: [
        { visibility: WikiPageVisibility.WORKSPACE },
        { createdById: userId },
        ...(membership.departmentId
          ? [{ visibility: WikiPageVisibility.DEPARTMENT, departmentId: membership.departmentId }]
          : []),
        { shares: { some: { userId } } },
        ...(inheritedIds.length > 0 ? [{ id: { in: inheritedIds } }] : []),
      ],
    };
  }

  private async getDescendantsOfSharedPages(orgId: string, userId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE tree AS (
        SELECT wp.id, wp."parentId"
        FROM "WikiPage" wp
        INNER JOIN "WikiPageShare" wps ON wps."pageId" = wp.id AND wps."userId" = ${userId}
        WHERE wp."orgId" = ${orgId} AND wp."deletedAt" IS NULL
        UNION ALL
        SELECT child.id, child."parentId"
        FROM "WikiPage" child
        INNER JOIN tree ON child."parentId" = tree.id
        WHERE child."deletedAt" IS NULL
      )
      SELECT id FROM tree
    `;
    return rows.map((r) => r.id);
  }

  private async findVisiblePage(
    orgId: string,
    userId: string,
    membership: Membership,
    pageId: string,
  ) {
    const accessFilter = await this.buildAccessWhere(orgId, userId, membership);
    const page = await this.prisma.wikiPage.findFirst({
      where: { id: pageId, orgId, deletedAt: null, ...accessFilter },
      include: this.includeMeta(userId),
    });

    if (!page) {
      throw new NotFoundException('Wiki page not found');
    }

    return page;
  }

  private async validateVisibility(
    orgId: string,
    userId: string,
    membership: Membership,
    visibility: WikiPageVisibility,
    departmentId?: string | null,
  ) {
    if (visibility === WikiPageVisibility.DEPARTMENT) {
      if (membership.role === WorkspaceRole.MEMBER) {
        throw new ForbiddenException('Only admins can assign pages to departments');
      }
      if (!departmentId) {
        throw new BadRequestException('Department pages require a department');
      }
      const department = await this.prisma.department.findFirst({
        where: { id: departmentId, orgId },
        select: { id: true },
      });
      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }
  }

  private async validateParent(
    orgId: string,
    userId: string,
    membership: Membership,
    parentId?: string | null,
  ) {
    if (!parentId) return;
    await this.findVisiblePage(orgId, userId, membership, parentId);
  }

  private assertCanEdit(page: WikiPageWithMeta, userId: string, role: WorkspaceRole) {
    const hasEditShare = page.shares.some(
      (s) => s.userId === userId && s.permission === WikiSharePermission.EDIT,
    );
    if (
      page.createdById === userId ||
      role === WorkspaceRole.OWNER ||
      role === WorkspaceRole.ADMIN ||
      hasEditShare
    ) {
      return;
    }
    throw new ForbiddenException('You cannot edit this wiki page');
  }

  private assertCanShare(page: WikiPageWithMeta, userId: string, role: WorkspaceRole) {
    const hasEditShare = page.shares.some(
      (s) => s.userId === userId && s.permission === WikiSharePermission.EDIT,
    );
    if (
      page.createdById === userId ||
      role === WorkspaceRole.OWNER ||
      role === WorkspaceRole.ADMIN ||
      hasEditShare
    ) {
      return;
    }
    throw new ForbiddenException('You cannot manage shares for this page');
  }

  private nullableText(value?: string | null) {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private toShareDto(share: {
    id: string;
    userId: string;
    permission: WikiSharePermission;
    createdAt: Date;
    user: { id: string; displayName: string; email: string };
  }) {
    return {
      id: share.id,
      userId: share.userId,
      userName: share.user.displayName,
      userEmail: share.user.email,
      permission: share.permission,
      createdAt: share.createdAt,
    };
  }

  private toDto(page: WikiPageWithMeta, userId: string, membership: Membership) {
    const hasEditShare = page.shares.some(
      (s) => s.userId === userId && s.permission === WikiSharePermission.EDIT,
    );
    return {
      id: page.id,
      parentId: page.parentId,
      createdById: page.createdById,
      title: page.title,
      icon: page.icon,
      coverColor: page.coverColor,
      contentMarkdown: page.contentMarkdown,
      contentJson: page.contentJson,
      visibility: page.visibility,
      departmentId: page.departmentId,
      departmentName: page.department?.name ?? null,
      favorite: page.favorites.length > 0,
      canEdit:
        page.createdById === userId ||
        membership.role === WorkspaceRole.OWNER ||
        membership.role === WorkspaceRole.ADMIN ||
        hasEditShare,
      shares: page.shares.map(this.toShareDto),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }
}

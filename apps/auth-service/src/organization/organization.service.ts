import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AccessTokenService } from '../shared/access-token.service';
import {
  CreateOrganizationRequestDto,
  SwitchOrganizationRequestDto,
} from './dto/organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokenService: AccessTokenService
  ) {}

  async listOrganizations(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      organizations: memberships.map((entry) => ({
        id: entry.organization.id,
        name: entry.organization.name,
        slug: entry.organization.slug,
        role: entry.role,
      })),
    };
  }

  async createOrganization(
    userId: string,
    input: CreateOrganizationRequestDto
  ) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: input.slug.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Organization slug is already in use');
    }

    const { organization, member } = await this.prisma.$transaction(
      async (transaction) => {
        const organization = await transaction.organization.create({
          data: {
            name: input.name.trim(),
            slug: input.slug.toLowerCase(),
          },
        });

        const member = await transaction.workspaceMember.create({
          data: {
            orgId: organization.id,
            userId,
            role: WorkspaceRole.OWNER,
          },
          include: { user: true },
        });

        return { organization, member };
      }
    );

    const accessToken = this.accessTokenService.sign(
      member.user,
      organization.id,
      member.role
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: member.role,
      },
    };
  }

  async switchOrganization(
    userId: string,
    input: SwitchOrganizationRequestDto
  ) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId,
        organization: { slug: input.orgSlug },
      },
      include: {
        user: true,
        organization: true,
      },
    });

    if (!membership) {
      throw new UnauthorizedException('Organization access denied');
    }

    const accessToken = this.accessTokenService.sign(
      membership.user,
      membership.organization.id,
      membership.role
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
      },
    };
  }
}

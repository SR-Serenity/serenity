import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { PrismaService } from '../database/prisma.service';

interface JwtPayload {
  user_id: string;
  sub: string;
  email: string;
  org_id: string;
  role: string;
  [key: string]: unknown;
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganization(orgId: string, authHeader: string) {
    const userId = this.extractUserIdFromAuth(authHeader);

    // Verify user has access to this organization
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId,
        orgId,
      },
    });

    if (!membership) {
      throw new UnauthorizedException('Organization access denied');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        memberships: {
          select: { id: true },
        },
      },
    });

    if (!org) {
      return null;
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      memberCount: org.memberships.length,
    };
  }

  async getOrganizationBySlug(slug: string, authHeader: string) {
    const userId = this.extractUserIdFromAuth(authHeader);

    const org = await this.prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        memberships: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!org) {
      return null;
    }

    // Verify user has access to this organization
    const userHasAccess = org.memberships.some((m) => m.userId === userId);
    if (!userHasAccess) {
      throw new UnauthorizedException('Organization access denied');
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      memberCount: org.memberships.length,
    };
  }

  async getOrganizationMembers(orgId: string, authHeader: string) {
    const userId = this.extractUserIdFromAuth(authHeader);

    // Verify user has access to this organization
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId,
        orgId,
      },
    });

    if (!membership) {
      throw new UnauthorizedException('Organization access denied');
    }

    const members = await this.prisma.workspaceMember.findMany({
      where: { orgId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      members: members.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        displayName: m.user.displayName,
        role: m.role,
        joinedAt: m.createdAt,
      })),
    };
  }

  private extractUserIdFromAuth(authHeader: string): string {
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new UnauthorizedException('JWT_SECRET is not configured');
      }

      const payload = verify(token, secret) as JwtPayload;
      const userId = payload.user_id ?? payload.sub;

      if (typeof userId !== 'string' || !userId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return userId;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

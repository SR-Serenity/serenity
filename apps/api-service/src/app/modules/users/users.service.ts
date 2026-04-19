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
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserProfile(authHeader: string) {
    const userId = this.extractUserIdFromAuth(authHeader);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        memberId: m.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });

    return user;
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
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

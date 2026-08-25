import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AccessTokenService } from '../shared/access-token.service';
import { LoginRequestDto, RegisterRequestDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokenService: AccessTokenService
  ) {}

  async register(input: RegisterRequestDto) {
    const email = input.email.trim().toLowerCase();

    const [existingUser, existingOrg] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.organization.findUnique({ where: { slug: input.orgSlug } }),
    ]);

    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }

    if (existingOrg) {
      throw new BadRequestException('Organization slug is already in use');
    }

    const passwordHash = await hash(input.password, 10);
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          displayName: input.displayName.trim(),
          passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: input.orgName.trim(),
          slug: input.orgSlug.toLowerCase(),
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId: user.id,
          orgId: organization.id,
          role: WorkspaceRole.OWNER,
        },
      });

      return { user, organization };
    });

    const accessToken = this.accessTokenService.sign(
      created.user,
      created.organization.id,
      WorkspaceRole.OWNER
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: created.user.id,
        email: created.user.email,
        displayName: created.user.displayName,
      },
      organization: {
        id: created.organization.id,
        name: created.organization.name,
        slug: created.organization.slug,
      },
    };
  }

  async login(input: LoginRequestDto) {
    const email = input.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await compare(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.memberships.length === 0) {
      throw new UnauthorizedException(
        'User is not a member of any organization'
      );
    }

    const orgSlug = input.orgSlug?.toLowerCase();
    const membership = orgSlug
      ? user.memberships.find(
        (entry) => entry.organization.slug === orgSlug
      )
      : user.memberships[0];

    if (!membership) {
      throw new UnauthorizedException('Organization access denied');
    }

    if (!orgSlug && user.memberships.length > 1) {
      throw new BadRequestException(
        'Multiple organizations found. Provide orgSlug to login.'
      );
    }

    const accessToken = this.accessTokenService.sign(
      user,
      membership.organization.id,
      membership.role
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
      },
      organizations: user.memberships.map((entry) => ({
        id: entry.organization.id,
        name: entry.organization.name,
        slug: entry.organization.slug,
        role: entry.role,
      })),
    };
  }
}

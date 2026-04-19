import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { JwtPayload, type SignOptions, sign, verify } from 'jsonwebtoken';
import { PrismaService } from '../database/prisma.service';

type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  orgName: string;
  orgSlug: string;
};

type LoginInput = {
  email: string;
  password: string;
  orgSlug?: string;
};

type CreateOrgInput = {
  name: string;
  slug: string;
};

type AuthTokenPayload = JwtPayload & {
  sub: string;
  user_id: string;
  org_id: string;
  role: WorkspaceRole;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterInput) {
    this.assertEmail(input.email);
    this.assertPassword(input.password);
    this.assertSlug(input.orgSlug, 'Organization slug');
    this.assertRequired(input.displayName, 'Display name');
    this.assertRequired(input.orgName, 'Organization name');

    const [existingUser, existingOrg] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: input.email } }),
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
          email: input.email.toLowerCase(),
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

      const member = await tx.workspaceMember.create({
        data: {
          userId: user.id,
          orgId: organization.id,
          role: WorkspaceRole.OWNER,
        },
      });

      return { user, organization, member };
    });

    return this.authResponse(
      created.user.id,
      created.user.email,
      created.organization.id,
      WorkspaceRole.OWNER,
      {
        user: {
          id: created.user.id,
          email: created.user.email,
          displayName: created.user.displayName,
        },
        organization: {
          id: created.organization.id,
          memberId: created.member.id,
          name: created.organization.name,
          slug: created.organization.slug,
        },
      }
    );
  }

  async login(input: LoginInput) {
    this.assertEmail(input.email);
    this.assertRequired(input.password, 'Password');
    if (input.orgSlug) {
      this.assertSlug(input.orgSlug, 'Organization slug');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
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
      throw new UnauthorizedException('User is not a member of any organization');
    }

    const membership = this.resolveMembership(
      user.memberships,
      input.orgSlug?.toLowerCase()
    );

    return this.authResponse(
      user.id,
      user.email,
      membership.orgId,
      membership.role,
      {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
        organization: {
          id: membership.organization.id,
          memberId: membership.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
        },
        organizations: user.memberships.map((entry) => ({
          id: entry.organization.id,
          memberId: entry.id,
          name: entry.organization.name,
          slug: entry.organization.slug,
          role: entry.role,
        })),
      }
    );
  }

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

  async createOrganization(userId: string, input: CreateOrgInput) {
    this.assertRequired(input.name, 'Organization name');
    this.assertSlug(input.slug, 'Organization slug');

    const existing = await this.prisma.organization.findUnique({
      where: { slug: input.slug.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Organization slug is already in use');
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: input.name.trim(),
        slug: input.slug.toLowerCase(),
      },
    });

    const member = await this.prisma.workspaceMember.create({
      data: {
        orgId: organization.id,
        userId,
        role: WorkspaceRole.OWNER,
      },
      include: {
        user: true,
      },
    });

    return this.authResponse(
      member.user.id,
      member.user.email,
      organization.id,
      member.role,
      {
        organization: {
          id: organization.id,
          memberId: member.id,
          name: organization.name,
          slug: organization.slug,
        },
      }
    );
  }

  async switchOrganization(userId: string, orgSlug: string) {
    this.assertSlug(orgSlug, 'Organization slug');

    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId,
        organization: {
          slug: orgSlug.toLowerCase(),
        },
      },
      include: {
        user: true,
        organization: true,
      },
    });

    if (!membership) {
      throw new UnauthorizedException('Organization access denied');
    }

    return this.authResponse(
      membership.user.id,
      membership.user.email,
      membership.orgId,
      membership.role,
      {
        organization: {
          id: membership.organization.id,
          memberId: membership.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
        },
      }
    );
  }

  getUserIdFromAuthHeader(authHeader?: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    const payload = verify(token, this.jwtSecret());
    if (!payload || typeof payload === 'string') {
      throw new UnauthorizedException('Invalid token payload');
    }

    const userId = payload.user_id ?? payload.sub;
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new UnauthorizedException('Token missing user_id');
    }
    return userId;
  }

  private authResponse(
    userId: string,
    email: string,
    orgId: string,
    role: WorkspaceRole,
    extra: Record<string, unknown>
  ) {
    const payload: AuthTokenPayload = {
      sub: userId,
      user_id: userId,
      org_id: orgId,
      role,
      email,
    };

    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '1d') as SignOptions['expiresIn'];
    const accessToken = sign(payload, this.jwtSecret(), { expiresIn });

    return {
      accessToken,
      tokenType: 'Bearer',
      ...extra,
    };
  }

  private resolveMembership(
    memberships: Array<{
      orgId: string;
      role: WorkspaceRole;
      organization: { id: string; name: string; slug: string };
    }>,
    orgSlug?: string
  ) {
    if (orgSlug) {
      const matched = memberships.find(
        (entry) => entry.organization.slug === orgSlug
      );
      if (!matched) {
        throw new UnauthorizedException('Organization access denied');
      }
      return matched;
    }

    if (memberships.length > 1) {
      throw new BadRequestException(
        'Multiple organizations found. Provide orgSlug to login.'
      );
    }

    return memberships[0];
  }

  private jwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET is not configured');
    }
    return secret;
  }

  private assertRequired(value: string | undefined, fieldName: string) {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required`);
    }
  }

  private assertEmail(email: string) {
    this.assertRequired(email, 'Email');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('Email is invalid');
    }
  }

  private assertPassword(password: string) {
    this.assertRequired(password, 'Password');
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
  }

  private assertSlug(value: string | undefined, fieldName: string) {
    this.assertRequired(value, fieldName);
    if (!/^[a-z0-9-]+$/.test(value ?? '')) {
      throw new BadRequestException(
        `${fieldName} must contain only lowercase letters, numbers, and hyphens`
      );
    }
  }
}

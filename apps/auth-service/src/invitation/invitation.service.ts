import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import {
  InvitationStatus,
  Prisma,
  type User,
  WorkspaceRole,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { RegisterWithInvitationRequestDto } from '../auth/dto/auth.dto';
import {
  AcceptInvitationRequestDto,
  CreateInvitationRequestDto,
} from './dto/invitation.dto';
import { EmailService } from './email.service';
import { AccessTokenService } from '../shared/access-token.service';

type InvitationWithOrganization = Prisma.InvitationGetPayload<{
  include: { organization: true };
}>;

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly accessTokenService: AccessTokenService,
    private readonly configService: ConfigService
  ) {}

  async createInvitation(
    orgId: string,
    inviterId: string,
    input: CreateInvitationRequestDto
  ) {
    const inviter = await this.prisma.workspaceMember.findFirst({
      where: { userId: inviterId, orgId },
      include: { user: true, organization: true },
    });

    if (!inviter) {
      throw new ForbiddenException('Not a member of this organization');
    }

    if (input.role === WorkspaceRole.OWNER) {
      throw new BadRequestException(
        'Owners cannot be invited. Transfer ownership after onboarding.'
      );
    }

    if (
      input.role === WorkspaceRole.ADMIN &&
      inviter.role !== WorkspaceRole.OWNER
    ) {
      throw new ForbiddenException('Only owners can invite admins');
    }

    if (input.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: input.departmentId, orgId },
        select: { id: true },
      });
      if (!department) {
        throw new BadRequestException(
          'Department does not belong to this organization'
        );
      }
    }

    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        orgId,
        user: { email: input.email.toLowerCase() },
      },
    });

    if (existingMember) {
      throw new BadRequestException(
        'User is already a member of this organization'
      );
    }

    const existingInvite = await this.prisma.invitation.findFirst({
      where: {
        email: input.email.toLowerCase(),
        orgId,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvite) {
      throw new BadRequestException('Invitation already sent to this email');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: input.email.toLowerCase(),
        orgId,
        role: input.role,
        departmentId: input.departmentId || null,
        token,
        expiresAt,
        inviterId,
      },
      include: {
        organization: true,
        department: true,
      },
    });

    const webUrl =
      this.configService.get<string>('WEB_URL') ??
      this.configService.get<string>('FRONTEND_URL') ??
      'http://localhost:9999';
    const inviteUrl = `${webUrl.replace(/\/$/, '')}/invite/${token}`;
    await this.emailService.sendInvitationEmail(
      invitation.email,
      inviter.user.displayName,
      invitation.organization.name,
      inviteUrl
    );

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      departmentId: invitation.departmentId,
      departmentName: invitation.department?.name || null,
      status: invitation.status,
      inviterName: inviter.user.displayName,
      orgName: invitation.organization.name,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      inviteUrl,
    };
  }

  async listInvitations(orgId: string) {
    const invitations = await this.prisma.invitation.findMany({
      where: { orgId, status: InvitationStatus.PENDING },
      include: {
        organization: true,
        inviter: { select: { displayName: true } },
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        departmentId: inv.departmentId,
        departmentName: inv.department?.name || null,
        status: inv.status,
        inviterName: inv.inviter.displayName,
        orgName: inv.organization.name,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
    };
  }

  async revokeInvitation(orgId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, orgId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });
  }

  async acceptInvitation(input: AcceptInvitationRequestDto) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        token: input.token,
        status: InvitationStatus.PENDING,
      },
      include: {
        organization: true,
        department: true,
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (!user) {
      return {
        needsRegistration: true,
        email: invitation.email,
        token: invitation.token,
        orgName: invitation.organization.name,
        role: invitation.role,
        departmentId: invitation.departmentId,
      };
    }

    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        orgId: invitation.orgId,
      },
    });

    if (existingMember) {
      throw new BadRequestException(
        'You are already a member of this organization'
      );
    }

    await this.prisma.workspaceMember.create({
      data: {
        userId: user.id,
        orgId: invitation.orgId,
        role: invitation.role,
        departmentId: invitation.departmentId,
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.ACCEPTED },
    });

    return this.generateAuthResponse(user, invitation);
  }

  async registerWithInvitation(input: RegisterWithInvitationRequestDto) {
    const invitation = await this.findUsableInvitation(input.inviteToken);
    const email = input.email.toLowerCase().trim();

    if (email !== invitation.email) {
      throw new BadRequestException(
        'Invitation email does not match registration email'
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException(
        'Email is already in use. Please sign in to accept this invitation.'
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          displayName: input.displayName.trim(),
          passwordHash,
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId: createdUser.id,
          orgId: invitation.orgId,
          role: invitation.role,
          departmentId: invitation.departmentId,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      });

      return createdUser;
    });

    return this.generateAuthResponse(user, invitation);
  }

  private async findUsableInvitation(token: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        token,
        status: InvitationStatus.PENDING,
      },
      include: {
        organization: true,
        department: true,
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }

  private generateAuthResponse(
    user: User,
    invitation: InvitationWithOrganization
  ) {
    const accessToken = this.accessTokenService.sign(
      user,
      invitation.orgId,
      invitation.role
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
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
        role: invitation.role,
      },
    };
  }
}

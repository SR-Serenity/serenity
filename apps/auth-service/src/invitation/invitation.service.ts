import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WorkspaceRole, InvitationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { CreateInvitationBodyDto, AcceptInvitationBodyDto } from './dto/invitation.dto';
import { EmailService } from './email.service';

@Injectable()
export class InvitationService {
  private readonly jwtSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret';
  }

  async createInvitation(
    orgId: string,
    inviterId: string,
    role: WorkspaceRole,
    input: CreateInvitationBodyDto
  ) {
    const inviter = await this.prisma.workspaceMember.findFirst({
      where: { userId: inviterId, orgId },
      include: { user: true, organization: true },
    });

    if (!inviter) {
      throw new ForbiddenException('Not a member of this organization');
    }

    if (inviter.role !== WorkspaceRole.OWNER) {
      if (role === WorkspaceRole.ADMIN) {
        throw new ForbiddenException('Only owners can invite admins');
      }
    }

    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        orgId,
        user: { email: input.email.toLowerCase() },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this organization');
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

    const inviteUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/invite/${token}`;
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
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
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

  async acceptInvitation(input: AcceptInvitationBodyDto) {
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

    let user = await this.prisma.user.findUnique({
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
      throw new BadRequestException('You are already a member of this organization');
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

  private async generateAuthResponse(user: any, invitation: any) {
    const payload = {
      sub: user.id,
      user_id: user.id,
      org_id: invitation.orgId,
      role: invitation.role,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

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
      },
    };
  }
}
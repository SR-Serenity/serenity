import { Injectable, UnauthorizedException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganization(orgId: string, userId: string) {
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

  async getOrganizationBySlug(slug: string, userId: string) {
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

  async getOrganizationMembers(orgId: string, userId: string) {
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
        departmentId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
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
        departmentId: m.departmentId,
        departmentName: m.department?.name || null,
        joinedAt: m.createdAt,
      })),
    };
  }

  async updateMemberRole(
    orgId: string,
    memberUserId: string,
    newRole: WorkspaceRole,
    userId: string,
    userRole: WorkspaceRole
  ) {
    if (userRole !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only owners can update member roles');
    }

    const targetMembership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId: memberUserId,
        orgId,
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }

    if (targetMembership.role === WorkspaceRole.OWNER) {
      throw new BadRequestException('Cannot change owner role');
    }

    await this.prisma.workspaceMember.update({
      where: { id: targetMembership.id },
      data: { role: newRole },
    });

    return { success: true };
  }

  async updateMemberDepartment(
    orgId: string,
    memberUserId: string,
    departmentId: string | null,
    userId: string,
    userRole: WorkspaceRole
  ) {
    if (userRole !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only owners can update member departments');
    }

    const targetMembership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId: memberUserId,
        orgId,
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }

    if (departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: departmentId, orgId },
      });
      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    await this.prisma.workspaceMember.update({
      where: { id: targetMembership.id },
      data: { departmentId },
    });

    return { success: true };
  }
}

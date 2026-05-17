import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ContactStatus,
  ContactType,
  Prisma,
  WorkspaceRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async listContacts(orgId: string, userId: string) {
    await this.ensureOrgAccess(orgId, userId);

    const [members, contacts, invitations] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: { orgId },
        select: {
          role: true,
          departmentId: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          department: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.contact.findMany({
        where: { orgId, status: { not: ContactStatus.ARCHIVED } },
        include: { department: { select: { name: true } } },
        orderBy: [{ type: 'asc' }, { displayName: 'asc' }],
      }),
      this.prisma.invitation.findMany({
        where: { orgId, status: 'PENDING' },
        include: { department: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      contacts: [
        ...members.map((member) => ({
          id: `employee:${member.user.id}`,
          type: ContactType.EMPLOYEE,
          status: ContactStatus.ACTIVE,
          displayName: member.user.displayName,
          email: member.user.email,
          phone: null,
          company: null,
          title: null,
          role: member.role,
          departmentId: member.departmentId,
          departmentName: member.department?.name ?? null,
          notes: null,
          sourceUserId: member.user.id,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        })),
        ...invitations.map((invitation) => ({
          id: `invitation:${invitation.id}`,
          type: ContactType.GUEST,
          status: ContactStatus.INVITED,
          displayName: invitation.email,
          email: invitation.email,
          phone: null,
          company: null,
          title: null,
          role: invitation.role,
          departmentId: invitation.departmentId,
          departmentName: invitation.department?.name ?? null,
          notes: null,
          sourceUserId: null,
          createdAt: invitation.createdAt,
          updatedAt: invitation.createdAt,
        })),
        ...contacts.map((contact) => ({
          id: contact.id,
          type: contact.type,
          status: contact.status,
          displayName: contact.displayName,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          title: contact.title,
          role: null,
          departmentId: contact.departmentId,
          departmentName: contact.department?.name ?? null,
          notes: contact.notes,
          sourceUserId: null,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
        })),
      ],
    };
  }

  async createContact(
    orgId: string,
    userId: string,
    userRole: WorkspaceRole,
    input: CreateContactDto
  ) {
    this.assertCanManage(userRole);
    await this.ensureOrgAccess(orgId, userId);
    this.assertExternalType(input.type);
    await this.ensureDepartment(orgId, input.departmentId);

    const contact = await this.prisma.contact.create({
      data: {
        orgId,
        type: input.type,
        displayName: input.displayName,
        email: input.email?.toLowerCase(),
        phone: input.phone,
        company: input.company,
        title: input.title,
        departmentId: input.departmentId || null,
        notes: input.notes,
      },
      include: { department: { select: { name: true } } },
    });

    return this.toExternalContact(contact);
  }

  async updateContact(
    orgId: string,
    contactId: string,
    userId: string,
    userRole: WorkspaceRole,
    input: UpdateContactDto
  ) {
    this.assertCanManage(userRole);
    await this.ensureOrgAccess(orgId, userId);
    await this.ensureDepartment(orgId, input.departmentId);

    const existing = await this.prisma.contact.findFirst({
      where: { id: contactId, orgId },
    });

    if (!existing) {
      throw new NotFoundException('Contact not found');
    }

    const data: Prisma.ContactUpdateInput = {};
    if (input.status !== undefined) {
      data.status = input.status;
    }
    if (input.displayName !== undefined) {
      data.displayName = input.displayName;
    }
    if (input.email !== undefined) {
      data.email = input.email.toLowerCase();
    }
    if (input.phone !== undefined) {
      data.phone = input.phone;
    }
    if (input.company !== undefined) {
      data.company = input.company;
    }
    if (input.title !== undefined) {
      data.title = input.title;
    }
    if (input.notes !== undefined) {
      data.notes = input.notes;
    }
    if (input.departmentId !== undefined) {
      data.department = input.departmentId
        ? { connect: { id: input.departmentId } }
        : { disconnect: true };
    }

    const contact = await this.prisma.contact.update({
      where: { id: existing.id },
      data,
      include: { department: { select: { name: true } } },
    });

    return this.toExternalContact(contact);
  }

  async archiveContact(
    orgId: string,
    contactId: string,
    userId: string,
    userRole: WorkspaceRole
  ) {
    this.assertCanManage(userRole);
    await this.ensureOrgAccess(orgId, userId);

    const existing = await this.prisma.contact.findFirst({
      where: { id: contactId, orgId },
    });

    if (!existing) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.contact.update({
      where: { id: existing.id },
      data: { status: ContactStatus.ARCHIVED },
    });

    return { success: true };
  }

  private async ensureOrgAccess(orgId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { orgId, userId },
      select: { id: true },
    });

    if (!membership) {
      throw new UnauthorizedException('Organization access denied');
    }
  }

  private async ensureDepartment(orgId: string, departmentId?: string | null) {
    if (!departmentId) {
      return;
    }

    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, orgId },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }
  }

  private assertCanManage(role: WorkspaceRole) {
    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
      throw new UnauthorizedException(
        'Only owners and admins can manage contacts'
      );
    }
  }

  private assertExternalType(type: ContactType) {
    if (type === ContactType.EMPLOYEE) {
      throw new BadRequestException(
        'Employee contacts are managed through workspace members'
      );
    }
  }

  private toExternalContact(
    contact: Prisma.ContactGetPayload<{
      include: { department: { select: { name: true } } };
    }>
  ) {
    return {
      id: contact.id,
      type: contact.type,
      status: contact.status,
      displayName: contact.displayName,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      title: contact.title,
      role: null,
      departmentId: contact.departmentId,
      departmentName: contact.department?.name ?? null,
      notes: contact.notes,
      sourceUserId: null,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateDepartmentBodyDto,
  UpdateDepartmentBodyDto,
} from './dto/department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async createDepartment(
    orgId: string,
    userId: string,
    input: CreateDepartmentBodyDto
  ) {
    this.assertRequired(input.name, 'Department name');

    const existing = await this.prisma.department.findFirst({
      where: {
        orgId,
        name: {
          equals: input.name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Department name already exists');
    }

    const department = await this.prisma.department.create({
      data: {
        name: input.name.trim(),
        orgId,
      },
    });

    return department;
  }

  async listDepartments(orgId: string) {
    const departments = await this.prisma.department.findMany({
      where: { orgId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      departments: departments.map((d) => ({
        id: d.id,
        name: d.name,
        orgId: d.orgId,
        createdAt: d.createdAt,
        memberCount: d._count.members,
      })),
    };
  }

  async getDepartment(orgId: string, departmentId: string) {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, orgId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async updateDepartment(
    orgId: string,
    departmentId: string,
    input: UpdateDepartmentBodyDto
  ) {
    this.assertRequired(input.name, 'Department name');

    const existing = await this.prisma.department.findFirst({
      where: {
        orgId,
        name: {
          equals: input.name.trim(),
          mode: 'insensitive',
        },
        NOT: { id: departmentId },
      },
    });

    if (existing) {
      throw new BadRequestException('Department name already exists');
    }

    const department = await this.prisma.department.update({
      where: { id: departmentId },
      data: { name: input.name.trim() },
    });

    return department;
  }

  async deleteDepartment(orgId: string, departmentId: string) {
    await this.prisma.department.delete({
      where: { id: departmentId },
    });
  }

  private assertRequired(value: string | undefined, fieldName: string) {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required`);
    }
  }
}

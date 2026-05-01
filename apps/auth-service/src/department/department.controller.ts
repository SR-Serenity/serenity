import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import {
  CreateDepartmentBodyDto,
  ListDepartmentsResponseDto,
  UpdateDepartmentBodyDto,
} from './dto/department.dto';
import { DepartmentService } from './department.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

@ApiTags('departments')
@ApiBearerAuth()
@Controller('auth')
export class DepartmentController {
  constructor(
    private readonly authService: AuthService,
    private readonly departmentService: DepartmentService
  ) {}

  @Post('departments')
  @ApiOperation({ summary: 'Create a new department (OWNER only)' })
  @ApiBody({ type: CreateDepartmentBodyDto })
  @ApiCreatedResponse({ description: 'Department created successfully' })
  createDepartment(
    @Req() req: RequestWithAuth,
    @Body() body: CreateDepartmentBodyDto
  ) {
    const authorization = req.headers.authorization as string;
    const userId = this.authService.getUserIdFromAuthHeader(authorization);
    const { orgId, role } = this.authService.getOrgContextFromHeader(
      authorization
    );
    this.authService.assertOwnerOnly(role, 'create department');
    return this.departmentService.createDepartment(orgId, userId, body);
  }

  @Get('departments')
  @ApiOperation({ summary: 'List all departments' })
  @ApiOkResponse({
    description: 'List of departments',
    type: ListDepartmentsResponseDto,
  })
  listDepartments(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    const { orgId } = this.authService.getOrgContextFromHeader(authorization);
    return this.departmentService.listDepartments(orgId);
  }

  @Patch('departments/:id')
  @ApiOperation({ summary: 'Update a department (OWNER only)' })
  @ApiBody({ type: UpdateDepartmentBodyDto })
  @ApiOkResponse({ description: 'Department updated successfully' })
  updateDepartment(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() body: UpdateDepartmentBodyDto
  ) {
    const authorization = req.headers.authorization as string;
    const { orgId, role } = this.authService.getOrgContextFromHeader(
      authorization
    );
    this.authService.assertOwnerOnly(role, 'update department');
    return this.departmentService.updateDepartment(orgId, id, body);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete a department (OWNER only)' })
  @ApiNoContentResponse({ description: 'Department deleted successfully' })
  deleteDepartment(
    @Req() req: RequestWithAuth,
    @Param('id') id: string
  ) {
    const authorization = req.headers.authorization as string;
    const { orgId, role } = this.authService.getOrgContextFromHeader(
      authorization
    );
    this.authService.assertOwnerOnly(role, 'delete department');
    return this.departmentService.deleteDepartment(orgId, id);
  }
}

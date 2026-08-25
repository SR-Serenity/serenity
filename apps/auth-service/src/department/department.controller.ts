import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthUtilsService } from '../shared/auth-utils.service';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../shared/jwt-auth.guard';
import {
  CreateDepartmentRequestDto,
  UpdateDepartmentRequestDto,
} from './dto/department.dto';
import { DepartmentService } from './department.service';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class DepartmentController {
  constructor(
    private readonly authUtils: AuthUtilsService,
    private readonly departmentService: DepartmentService
  ) {}

  @Post('departments')
  createDepartment(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateDepartmentRequestDto
  ) {
    this.authUtils.assertOwner(request.user.role, 'create department');
    return this.departmentService.createDepartment(request.user.org_id, input);
  }

  @Get('departments')
  listDepartments(@Req() request: AuthenticatedRequest) {
    return this.departmentService.listDepartments(request.user.org_id);
  }

  @Patch('departments/:id')
  updateDepartment(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdateDepartmentRequestDto
  ) {
    this.authUtils.assertOwner(request.user.role, 'update department');
    return this.departmentService.updateDepartment(
      request.user.org_id,
      id,
      input
    );
  }

  @Delete('departments/:id')
  deleteDepartment(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    this.authUtils.assertOwner(request.user.role, 'delete department');
    return this.departmentService.deleteDepartment(request.user.org_id, id);
  }
}

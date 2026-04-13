import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            listOrganizations: jest.fn(),
            createOrganization: jest.fn(),
            switchOrganization: jest.fn(),
            getUserIdFromAuthHeader: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = app.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

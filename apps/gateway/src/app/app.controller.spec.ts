import { Test, TestingModule } from '@nestjs/testing';
import { AuthProxyController } from './modules/auth/auth-proxy.controller';
import { AuthProxyService } from './modules/auth/auth-proxy.service';

describe('AuthProxyController', () => {
  let controller: AuthProxyController;

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthProxyController],
      providers: [
        {
          provide: AuthProxyService,
          useValue: {
            forwardAuthRequest: jest.fn(),
            forwardAuthGet: jest.fn(),
            getRequestContext: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = app.get<AuthProxyController>(AuthProxyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

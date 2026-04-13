import { Test } from '@nestjs/testing';
import { AuthProxyService } from './modules/auth/auth-proxy.service';

describe('AuthProxyService', () => {
  let service: AuthProxyService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AuthProxyService],
    }).compile();

    service = app.get<AuthProxyService>(AuthProxyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

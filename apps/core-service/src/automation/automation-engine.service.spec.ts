import { AutomationEngineService } from './automation-engine.service';
import { AutomationConditionType } from './dto/automation.dto';

function createService() {
  return new AutomationEngineService({} as never, {} as never, {} as never);
}

describe('AutomationEngineService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('evaluates time windows in the configured timezone', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-26T02:30:00.000Z'));

    const service = createService() as unknown as {
      evaluateCondition: (
        node: { nodeType: string; config: Record<string, unknown> },
        context: { orgId: string },
      ) => Promise<boolean>;
    };

    await expect(
      service.evaluateCondition(
        {
          nodeType: AutomationConditionType.TIME_WINDOW,
          config: {
            startHour: 9,
            endHour: 10,
            days: ['FRI'],
            timeZone: 'Asia/Ho_Chi_Minh',
          },
        },
        { orgId: 'org-1' },
      ),
    ).resolves.toBe(true);
  });
});

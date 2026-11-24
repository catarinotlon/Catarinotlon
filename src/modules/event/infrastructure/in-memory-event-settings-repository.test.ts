import { describeEventSettingsContract } from './event-settings-repository.contract';
import { InMemoryEventSettingsRepository } from './in-memory-event-settings-repository';

describeEventSettingsContract('in-memory', async () => ({
  repository: new InMemoryEventSettingsRepository(),
  cleanup: () => undefined,
}));

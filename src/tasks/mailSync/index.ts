import { registerTask } from '../registry';
import { runMailSync } from './orchestrator';

await registerTask('MAIL_SYNC', 'Mail Service: Sync with Listmonk', runMailSync);

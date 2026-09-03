import { ClientProfile, ClientType } from '../types.js';
import { claudeProfile } from './claude.js';
import { cursorProfile } from './cursor.js';
import { chatgptProfile } from './chatgpt.js';
import { antigravityProfile } from './antigravity.js';

const profiles: Record<ClientType, ClientProfile> = {
  claude: claudeProfile,
  cursor: cursorProfile,
  chatgpt: chatgptProfile,
  antigravity: antigravityProfile,
};

export function getClientProfile(type: ClientType): ClientProfile {
  const profile = profiles[type];
  if (!profile) {
    throw new Error(`Unknown client type '${type}'. Available profiles: ${Object.keys(profiles).join(', ')}`);
  }
  return profile;
}

export function getAllClientProfiles(): ClientProfile[] {
  return Object.values(profiles);
}

export { claudeProfile, cursorProfile, chatgptProfile, antigravityProfile };

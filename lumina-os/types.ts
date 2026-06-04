export type LuminaOSNav =
  | 'messages'
  | 'friends'
  | 'squads'
  | 'calls'
  | 'activity'
  | 'notifications'
  | 'settings';

export type LuminaOSUserStatus = 'online' | 'away' | 'busy' | 'invisible';

export interface LuminaOSPersisted {
  selectedChatId: string | null;
  activeNav: LuminaOSNav;
  drafts: Record<string, string>;
  vaultLevel: number;
  contextCollapsed: boolean;
  userStatus: LuminaOSUserStatus;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    read: boolean;
    createdAt: string;
  }>;
  preferences: { sounds: boolean; enterToSend: boolean };
}

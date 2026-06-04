# Lumina OS — React migration scaffold

Reference implementation for a future Vite + React + TypeScript build. The production app today uses the vanilla modules in `assets/lumina-os/`.

## Target router

```tsx
// src/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { LuminaOSLayout } from './layouts/LuminaOSLayout';

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <FeedPage /> },
      { path: '/vault', element: <VaultPage /> },
      { path: '/discover', element: <DiscoverPage /> },
      { path: '/achievements', element: <AchievementsPage /> },
      { path: '/profile', element: <ProfilePage /> },
    ],
  },
  {
    path: '/lumina-os',
    element: <LuminaOSLayout />,
    children: [
      { index: true, element: <MessagesWorkspace /> },
      { path: 'friends', element: <FriendsPanel /> },
      { path: 'squads', element: <SquadsPanel /> },
      { path: 'calls', element: <CallsPanel /> },
      { path: 'activity', element: <ActivityPanel /> },
      { path: 'settings', element: <OsSettingsPanel /> },
    ],
  },
]);
```

## Zustand store

```ts
// src/store/luminaOsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LuminaOSPersisted } from '../../types';

export const useLuminaOsStore = create<LuminaOSPersisted>()(
  persist(
    (set) => ({
      selectedChatId: null,
      activeNav: 'messages',
      drafts: {},
      vaultLevel: 1,
      contextCollapsed: false,
      userStatus: 'online',
      notifications: [],
      preferences: { sounds: true, enterToSend: true },
      setState: (patch) => set(patch),
    }),
    { name: 'lumina_os_v1' }
  )
);
```

## Framer Motion page transition

```tsx
// src/layouts/LuminaOSLayout.tsx
import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { ContextPanel } from '../components/ContextPanel';

export function LuminaOSLayout() {
  return (
    <motion.div
      className="lumina-os-root"
      initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.985 }}
      animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.985 }}
      transition={{ duration: 0.3 }}
    >
      <Sidebar />
      <main className="workspace">
        <Outlet />
      </main>
      <ContextPanel />
    </motion.div>
  );
}
```

Wire Supabase auth from the parent shell context; reuse `poxy_dm` and `friendships` tables unchanged.

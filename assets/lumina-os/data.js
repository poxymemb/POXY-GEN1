/**
 * Lumina OS — seeded module data (squads, activity, notifications).
 */
(function (global) {
  function seedSquads() {
    return [
      {
        id: 'sq-iron',
        name: 'Iron Phalanx',
        motto: 'Unbroken, unyielding, undeniable.',
        league: 'Platinum League',
        winRate: 78.4,
        totalPc: 12450,
        active: 3,
        capacity: 5,
        icon: 'shield',
        region: 'EU-WEST',
        members: ['👾', '👾', '👾'],
        joinState: 'idle',
      },
      {
        id: 'sq-viper',
        name: 'Viper Strike',
        motto: 'Speed is the only variable that matters.',
        league: 'Diamond Elite',
        winRate: 92.1,
        totalPc: 28900,
        active: 5,
        capacity: 5,
        icon: 'bolt',
        region: 'NA-EAST',
        members: ['👾', '👾', '👾', '👾'],
        joinState: 'rejected',
      },
      {
        id: 'sq-neon',
        name: 'Neon Ghosts',
        motto: 'They won\'t see us until it\'s too late.',
        league: 'Gold Rank',
        winRate: 52.8,
        totalPc: 4120,
        active: 1,
        capacity: 5,
        icon: 'token',
        region: 'APAC',
        members: ['👾'],
        joinState: 'idle',
      },
    ];
  }

  function seedActivity() {
    const now = Date.now();
    return [
      {
        id: 'act-1',
        day: 'Today',
        title: 'Achievement Unlocked: "Deep Diver"',
        body: 'You spent 10 consecutive hours in the Library catalog.',
        time: '2h ago',
        icon: 'military_tech',
        tone: 'tertiary',
      },
      {
        id: 'act-2',
        day: 'Today',
        title: 'Victory in CyberSector 7',
        body: 'Your squad Alpha-Nine secured 1st place in regional qualifiers.',
        time: '5h ago',
        icon: 'emoji_events',
        tone: 'primary',
      },
      {
        id: 'act-3',
        day: 'Yesterday',
        title: 'New Connection: Sarah J.',
        body: 'Sarah sent you a friend request. 4 mutual connections.',
        time: '1d ago',
        icon: 'person_add',
        tone: 'primary',
        actions: true,
      },
      {
        id: 'act-4',
        day: 'Yesterday',
        title: 'System Update: v4.2.0 Complete',
        body: 'Enhanced neomorphic rendering and faster response times.',
        time: '1d ago',
        icon: 'update',
        tone: 'primary',
      },
    ];
  }

  function seedNotifications() {
    return [
      {
        id: 'n1',
        group: 'Today',
        title: 'Alex Mercer sent you a message',
        body: 'Hey, are you joining the raid tonight?',
        time: '2m ago',
        icon: 'chat',
        unread: true,
        tone: 'primary',
      },
      {
        id: 'n2',
        group: 'Today',
        title: 'System Update is ready',
        body: 'Version 4.2.0 improves performance and gestures.',
        time: '1h ago',
        icon: 'system_update',
        unread: true,
        tone: 'tertiary',
      },
      {
        id: 'n3',
        group: 'Today',
        title: 'Sarah Connor liked your post',
        body: 'In the collection "Modern Soft UI Concepts".',
        time: '3h ago',
        icon: 'favorite',
        unread: false,
        tone: 'muted',
      },
      {
        id: 'n4',
        group: 'Yesterday',
        title: 'New Achievement unlocked!',
        body: 'Early Adopter — Lumina OS since Alpha.',
        time: 'Yesterday',
        icon: 'celebration',
        unread: true,
        tone: 'primary',
      },
    ];
  }

  global.LuminaOSData = {
    seedSquads,
    seedActivity,
    seedNotifications,
  };
})(window);

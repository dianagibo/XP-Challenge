module.exports = {
  player: {
    name: 'Sofi',
    level: 3,
    title: 'Rising Star',
    currentXp: 145,
    nextLevelXp: 200,
    coins: 280,
    avatar: 'nova'
  },
  dailyProgress: {
    completed: 2,
    total: 3
  },
  featuredMission: {
    id: 'room-reset',
    title: 'Room reset',
    description: 'Leave your room ready for a fresh new day.',
    category: 'Home',
    difficulty: 'Medium',
    xp: 20,
    coins: 20,
    icon: 'bi-stars'
  },
  missions: [
    {
      id: 'healthy-sleep',
      title: 'Recharge mode',
      description: 'Be ready to sleep by 9:30 p.m.',
      category: 'Wellness',
      xp: 10,
      coins: 10,
      icon: 'bi-moon-stars',
      color: 'purple',
      status: 'pending'
    },
    {
      id: 'cheer-practice',
      title: 'Cheer power',
      description: 'Practice your coach-approved routine.',
      category: 'Sport',
      xp: 20,
      coins: 20,
      icon: 'bi-lightning-charge',
      color: 'pink',
      status: 'pending'
    },
    {
      id: 'kitchen-help',
      title: 'Kitchen hero',
      description: 'Help leave the kitchen organized.',
      category: 'Home',
      xp: 20,
      coins: 20,
      icon: 'bi-house-heart',
      color: 'mint',
      status: 'completed'
    }
  ],
  streak: {
    count: 5,
    label: 'days in a row',
    best: 7
  },
  teamMission: {
    title: 'Stronger together',
    description: 'Sofi practices cheer and Diana exercises twice this week.',
    progress: 50,
    xp: 40,
    daysLeft: 3
  },
  avatars: [
    { id: 'nova', name: 'Nova', symbol: '✦', theme: 'violet', unlocked: true },
    { id: 'lumi', name: 'Lumi', symbol: '♥', theme: 'pink', unlocked: true },
    { id: 'kai', name: 'Kai', symbol: '⚡', theme: 'blue', unlocked: true },
    { id: 'yuna', name: 'Yuna', symbol: '♫', theme: 'mint', unlocked: false, level: 4 },
    { id: 'aria', name: 'Aria', symbol: '★', theme: 'sunset', unlocked: false, level: 5 },
    { id: 'mika', name: 'Mika', symbol: '☾', theme: 'midnight', unlocked: false, level: 7 }
  ]
};

module.exports = {
  player: {
    name: 'Sofi',
    level: 1,
    title: 'New Adventurer',
    currentXp: 0,
    nextLevelXp: 100,
    coins: 0,
    avatar: 'nova'
  },
  streak: {
    count: 0,
    label: 'days',
    best: 0
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

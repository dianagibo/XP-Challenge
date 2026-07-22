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
    { id: 'nova', name: 'Nova', description: 'Una exploradora brillante que convierte cada reto en una nueva aventura.', symbol: '✦', theme: 'violet', unlocked: true },
    { id: 'lumi', name: 'Lumi', description: 'Una aventurera alegre que ilumina cada misión con su energía y creatividad.', symbol: '♥', theme: 'pink', unlocked: true },
    { id: 'kai', name: 'Kai', description: 'Un personaje valiente y veloz que enfrenta cada desafío con determinación.', symbol: '⚡', theme: 'blue', unlocked: true },
    { id: 'yuna', name: 'Yuna', description: 'Una artista curiosa que encuentra ritmo e inspiración en cada aventura.', symbol: '♫', theme: 'mint', unlocked: false, level: 4 },
    { id: 'aria', name: 'Aria', description: 'Una estrella perseverante que siempre busca superar su mejor versión.', symbol: '★', theme: 'sunset', unlocked: false, level: 5 },
    { id: 'mika', name: 'Mika', description: 'Una exploradora serena que avanza con paciencia, ingenio y confianza.', symbol: '☾', theme: 'midnight', unlocked: false, level: 7 }
  ]
};

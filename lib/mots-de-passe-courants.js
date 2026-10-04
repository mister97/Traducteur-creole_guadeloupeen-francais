// Mots de passe trop courants, refusés à l'inscription (comparaison en minuscules,
// sans accents). Liste volontairement courte et embarquée : elle écarte les choix
// évidents sans dépendance externe.
export const MOTS_DE_PASSE_COURANTS = new Set([
  '123456789012', '1234567890123', '12345678901234', '123456789012345', '111111111111', '000000000000',
  'azertyuiopqs', 'qwertyuiopas', 'azertyazerty', 'qwertyqwerty', 'motdepasse', 'motdepasse1', 'motdepasse123',
  'motdepasse2026', 'password', 'password1', 'password123', 'password1234', 'passwordpassword', 'passw0rd123',
  'administrateur', 'administrator', 'administrateur1', 'adminadmin12', 'admin1234567', 'administrateur123',
  'bonjourbonjour', 'bonjour123456', 'coucoucoucou', 'soleilsoleil', 'chouchou1234', 'doudou123456',
  'jetaimejetaime', 'jetaime12345', 'loveyoulove1', 'iloveyou1234', 'princesse123', 'princesse1234',
  'guadeloupe', 'guadeloupe1', 'guadeloupe123', 'guadeloupe2026', 'gwadloup971', 'gwadloupe123',
  'creolecreole', 'kreyolkreyol', 'kreyol971971', 'chalviraj12345', 'chalvirajchalviraj', 'dictionnaire',
  'dictionnaire1', 'diksyonne123', 'basileusbasil', 'qwerty123456', 'azerty123456', 'abcdefghijkl',
  'abcd1234abcd', 'aaaaaaaaaaaa', 'secretsecret', 'secret123456', 'changemechange', 'changeme1234',
  'letmein12345', 'welcome12345', 'bienvenue123', 'bienvenue1234', 'football1234', 'baseball1234',
  'liverpool123', 'superman1234', 'batman123456', 'pokemon12345', 'starwars1234', 'sunshine1234',
  'trustno1trust', 'whatever1234', 'monkey123456', 'dragon123456', 'master123456', 'shadow123456',
  'michael12345', 'jennifer1234', 'jordan123456', 'hunter123456', 'ranger123456', 'buster123456',
  'thomas123456', 'robert123456', 'daniel123456', 'charlie12345', 'maggie123456', 'pepper123456',
  'ginger123456', 'summer123456', 'chocolat1234', 'chocolate123', 'cookie123456', 'banana123456',
  'orange123456', 'purple123456', 'silver123456', 'golden123456', 'diamond12345', 'crystal12345',
  'qazwsxedcrfv', 'zaqwsxcderfv', '1qaz2wsx3edc', 'q1w2e3r4t5y6', 'a1b2c3d4e5f6', 'abc123abc123',
  'test12345678', 'testtesttest', 'demo12345678', 'temporaire12', 'temporary123', 'provisoire12',
  'motdepasse!1', 'motdepasse@1', 'p@ssw0rd1234', 'passe123456', 'monmotdepasse', 'monmotdepasse1',
]);

export function motDePasseTropCourant(motDePasse) {
  const normalise = String(motDePasse)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (MOTS_DE_PASSE_COURANTS.has(normalise)) return true;
  // Une suite d'un seul caractère répété, ou une suite croissante, reste devinable
  if (/^(.)\1+$/.test(normalise)) return true;
  return '01234567890123456789'.includes(normalise) || 'abcdefghijklmnopqrstuvwxyz'.includes(normalise);
}

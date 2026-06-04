/**
 * Curated affirmation collections seeded on first install.
 * All content is original — written for clarity, truth and emotional resonance.
 */

export type SeedCollection = {
  id: string;
  title: string;
  emoji: string;
  coverColor: string;
  category: string;
  sortIdx: number;
  affirmations: string[];
};

export const SEED_COLLECTIONS: SeedCollection[] = [
  {
    id: 'morning-power',
    title: 'Morning Power',
    emoji: '🌅',
    coverColor: '#E8A85C',
    category: 'morning',
    sortIdx: 0,
    affirmations: [
      'Today I choose to meet life with my full energy.',
      'I wake up with purpose and I close the day with gratitude.',
      'My mind is clear, my heart is open, my intentions are set.',
      'Each morning is permission to begin again, better.',
      'I do not need to be perfect — I need to be present.',
      'Small, consistent actions are quietly building something extraordinary.',
      'I move through this day with patience and direction.',
      'I give myself permission to take up space today.',
      'Today I do what I can, as well as I can — and that is enough.',
      'I start before I feel ready, because waiting is not a strategy.',
    ],
  },
  {
    id: 'self-worth',
    title: 'Self-Worth',
    emoji: '💫',
    coverColor: '#D98BAA',
    category: 'self',
    sortIdx: 1,
    affirmations: [
      'I am whole — not in progress toward wholeness.',
      'My worth does not fluctuate with anyone\'s opinion of me.',
      'I deserve good things without having to earn them first.',
      'I am allowed to outgrow people and places.',
      'Being myself is not a risk — it is a requirement.',
      'I do not compare my chapter one to someone else\'s chapter ten.',
      'I trust my own judgment.',
      'I stop apologising for being who I genuinely am.',
      'I am both a work in progress and already enough, simultaneously.',
      'My feelings are valid and they deserve room.',
    ],
  },
  {
    id: 'calm-mind',
    title: 'Calm Mind',
    emoji: '🌊',
    coverColor: '#6BAAC0',
    category: 'calm',
    sortIdx: 2,
    affirmations: [
      'I breathe in calm and release what I cannot control.',
      'This moment is not an emergency.',
      'I can pause before I react.',
      'My mind settles like water — naturally, given space.',
      'I release the need to have all the answers right now.',
      'Not everything that feels urgent is actually important.',
      'I can return to stillness whenever I choose.',
      'Peace is not something I find — it is something I choose.',
      'I let difficult thoughts pass without making them my identity.',
      'There is no version of ease that requires rushing.',
    ],
  },
  {
    id: 'growth-mindset',
    title: 'Growth Mindset',
    emoji: '🌱',
    coverColor: '#72A882',
    category: 'growth',
    sortIdx: 3,
    affirmations: [
      'Every attempt — even a failed one — narrows the gap.',
      'Discomfort is where my growth actually lives.',
      'I do not know yet — but I will.',
      'I am not afraid of being a beginner.',
      'My failures are data, not definitions.',
      'Hard is not the same as impossible.',
      'I allow myself to learn at my own pace.',
      'I am getting measurably better at the things that matter.',
      'Progress over perfection, always.',
      'I choose curiosity over judgment — in myself and others.',
    ],
  },
  {
    id: 'courage',
    title: 'Courage',
    emoji: '🔥',
    coverColor: '#C07868',
    category: 'growth',
    sortIdx: 4,
    affirmations: [
      'I do the brave thing first, then wait for the confidence to catch up.',
      'Fear does not have to disappear for me to begin.',
      'I have survived every hard day I was sure would break me.',
      'I take one step. Then another. That is all that is required.',
      'I choose meaningful action over comfortable waiting.',
      'Speaking my truth is not aggression — it is integrity.',
      'The version of me I respect most takes calculated risks.',
      'I am more resilient than I remember in this moment.',
      'I act in spite of doubt because doubt is not a stop sign.',
    ],
  },
  {
    id: 'body-wellness',
    title: 'Body & Wellness',
    emoji: '🌿',
    coverColor: '#74B8A0',
    category: 'body',
    sortIdx: 5,
    affirmations: [
      'I respect this body that carries me through everything.',
      'I move not to punish myself but to feel fully alive.',
      'Rest is not laziness — it is essential maintenance.',
      'I nourish my body because I genuinely value it.',
      'I listen to what my body needs today, not what I think it should.',
      'I am at peace with where I am in my wellness journey.',
      'Sleep is my first act of self-respect every evening.',
      'My body is my home. I care for it.',
      'I release the pressure to look a certain way and focus on how I feel.',
    ],
  },
  {
    id: 'deep-focus',
    title: 'Deep Focus',
    emoji: '🎯',
    coverColor: '#7888C0',
    category: 'work',
    sortIdx: 6,
    affirmations: [
      'One thing at a time, done with full attention.',
      'I close other doors so I can walk fully through this one.',
      'My best work comes from deep focus, not more hours.',
      'I protect my attention like the resource it is.',
      'I begin. That is all I am required to do right now.',
      'I work with my natural energy, not against it.',
      'Flow arrives when I stop forcing it and simply start.',
      'Clarity comes from doing, not from more planning.',
      'I am building something worth the quiet effort it requires.',
    ],
  },
  {
    id: 'relationships',
    title: 'In Relationships',
    emoji: '💛',
    coverColor: '#C8A06A',
    category: 'connection',
    sortIdx: 7,
    affirmations: [
      'I show up in my relationships with honesty and care.',
      'I communicate what I need, clearly and without apology.',
      'I release relationships that require me to shrink.',
      'Deep connection begins with being fully myself.',
      'I give generously and receive gracefully.',
      'I choose quality over quantity in who I keep close.',
      'I let people love me in the way they know how.',
      'I set boundaries not from fear, but from self-respect.',
    ],
  },
  {
    id: 'abundance',
    title: 'Abundance',
    emoji: '✨',
    coverColor: '#BEA048',
    category: 'mindset',
    sortIdx: 8,
    affirmations: [
      'There is enough time, energy and possibility — for me too.',
      'I receive good things with open hands.',
      'My success creates more space for others\' success, not less.',
      'I stop waiting for permission to pursue what I want.',
      'Good things are already moving toward me.',
      'I trust the timing of my life, even when it confuses me.',
      'I have what I need. I am steadily building what I want.',
      'Gratitude opens every door that fear quietly keeps closed.',
      'I operate from abundance, not from scarcity.',
    ],
  },
  {
    id: 'evening-gratitude',
    title: 'Evening Gratitude',
    emoji: '🌙',
    coverColor: '#9880B8',
    category: 'evening',
    sortIdx: 9,
    affirmations: [
      'I close this day knowing I did what I could with what I had.',
      'Today had something worth holding onto.',
      'I lay down without carrying tomorrow into the night.',
      'I am becoming who I want to be — slowly, steadily, and surely.',
      'Rest is both my reward and my preparation.',
      'I release the day. It is complete as it is.',
      'Enough was done. I am enough.',
      'I am grateful for the small moments I almost missed today.',
      'Tomorrow I will begin again with everything I\'ve learned.',
    ],
  },
];

// Which collections appear first on the main screen under "Editor's Picks"
export const FEATURED_IDS = ['morning-power', 'calm-mind', 'self-worth', 'evening-gratitude'];

// Daily affirmation: deterministic rotation based on day-of-year
export function getDailyAffirmation(): { body: string; collection: string } {
  const allAffirmations: Array<{ body: string; collection: string }> = [];
  for (const col of SEED_COLLECTIONS) {
    for (const body of col.affirmations) {
      allAffirmations.push({ body, collection: col.title });
    }
  }
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const idx = dayOfYear % allAffirmations.length;
  return allAffirmations[idx];
}

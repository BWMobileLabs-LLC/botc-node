
export const seed = async (knex) => {
  // Deletes ALL existing entries
  await knex('characters').where('type', 'traveller').del();

  // Inserts seed entries
  await knex('characters').insert([
    {
      name: 'Scapegoat',
      wiki_link_name: 'Scapegoat',
      type: 'traveller',
      ability: 'If a player of your alignment is executed, you might be executed instead.',
      flavor_text: 'Good evening! Thank you for inviting me to the ball. I\'m not from around here, but you sure seem like a friendly bunch, by golly. I\'m sure we\'ll get along just dandy. What\'s all that rope for?'
    },
    {
      name: 'Gunslinger',
      wiki_link_name: 'Gunslinger',
      type: 'traveller',
      ability: 'Each day, after the 1st vote has been tallied, you may choose a player that voted: they die.',
      flavor_text: 'It\'s time someone took matters into their own hands. That someone... is me.'
    },
    {
      name: 'Beggar',
      wiki_link_name: 'Beggar',
      type: 'traveller',
      ability: 'You must use a vote token to vote. If a dead player gives you theirs, you learn their alignment. You are sober and healthy.',
      flavor_text: 'Alms for the poor, good Sir? Spare a coin, Madam? Thank you. God bless! You\'re a right kind soul and no mistake! I\'ll have some swanky nosh tonight, I will!'
    },
    {
      name: 'Bureaucrat',
      wiki_link_name: 'Bureaucrat',
      type: 'traveller',
      ability: 'Each night, choose a player (not yourself): their vote counts as 3 votes tomorrow.',
      flavor_text: 'Sign here please. And here. And here. Aaaaaaaaand here. This should all be sorted and tallied by the end of the day, assuming everyone\'s signatures are legible. We haven\'t had a mix-up in the paperwork for ages. Yesterday noon, if memory serves...'
    },
    {
      name: 'Thief',
      wiki_link_name: 'Thief',
      type: 'traveller',
      ability: 'Each night, choose a player (not yourself): their vote counts negatively tomorrow.',
      flavor_text: 'I aint done nuffink. I weren\'t even in dat alley last night! It weren\'t me what stole Mayor Bruno\'s briefcase wiv all dem fancy dockoments innit. Besides, it was too \'eavy to carry far.'
    },
    {
      name: 'Butcher',
      wiki_link_name: 'Butcher',
      type: 'traveller',
      ability: 'Each day, after the 1st execution, you may nominate again.',
      flavor_text: 'It tastes like chicken. More please.'
    },
    {
      name: 'Bone Collector',
      wiki_link_name: 'Bone_Collector',
      type: 'traveller',
      ability: 'Once per game, at night*, choose a dead player: they regain their ability until dusk.',
      flavor_text: 'I collect many things. Hair. Teeth. Clothes. Fragments of poems. The dreams of lost lovers. My secret arts are not for you to know but my fee is a mere pittance. Bring me the blood of a noblewoman who died of heartbreak under a full moon, and you shall have your answers.'
    },
    {
      name: 'Harlot',
      wiki_link_name: 'Harlot',
      type: 'traveller',
      ability: 'Each night*, choose a living player: if they agree, you learn their character, but you both might die.',
      flavor_text: 'Enchanté, Sailor. You look like you need someone to really listen to your troubles. I\'m a good listener. Very, very good.'
    },
    {
      name: 'Barista',
      wiki_link_name: 'Barista',
      type: 'traveller',
      ability: 'Each night, until dusk, 1) a player becomes sober, healthy & gets true info, or 2) their ability works twice. They learn which.',
      flavor_text: 'A cup of coffee with no cream, Monsieur? I\'m terribly sorry, but we\'re fresh out of cream — how about with no milk?'
    },
    {
      name: 'Deviant',
      wiki_link_name: 'Deviant',
      type: 'traveller',
      ability: 'If you were funny today, you cannot die by exile.',
      flavor_text: 'Twas the lady\'s quip, forsooth.'
    },
    {
      name: 'Apprentice',
      wiki_link_name: 'Apprentice',
      type: 'traveller',
      ability: 'On your 1st night, you gain a Townsfolk ability (if good) or a Minion ability (if evil).',
      flavor_text: 'For years have I traveled, studying the ways of The Craft. Which craft, you ask? Simply that of the simple folk. Nothing to worry about. Not yet'
    },
    {
      name: 'Matron',
      wiki_link_name: 'Matron',
      type: 'traveller',
      ability: 'Each day, you may choose up to 3 sets of 2 players to swap seats. Players may not leave their seats to talk in private.',
      flavor_text: 'Miss Featherbottom, be quiet. Master Rutherford, a teacup needs just the four fingers, please. I know you are a father of nine, but age, or lack there-of as the case may be, is never an excuse for poor manners'
    },
    {
      name: 'Voudon',
      wiki_link_name: 'Voudon',
      type: 'traveller',
      ability: 'Only you & the dead can vote. They don\'t need a vote token to do so. A 50% majority isn\'t required.',
      flavor_text: 'Bien venu. Sit down. Breathe deep. Enter the land of the dead. See with their eyes. Speak with their voice. Yon sel lang se janm ase.'
    },
    {
      name: 'Judge',
      wiki_link_name: 'Judge',
      type: 'traveller',
      ability: 'Once per game, if another player nominated, you may choose to force the current execution to pass or fail.',
      flavor_text: 'I find the defendant guilty of the crimes of murder, fraud, arson, larceny, impersonating an officer of the law, practicing medicine without a license, slander, regicide, and littering.'
    },
    {
      name: 'Bishop',
      wiki_link_name: 'Bishop',
      type: 'traveller',
      ability: 'Only the Storyteller can nominate. At least 1 opposing player must be nominated each day',
      flavor_text: 'In nomine Patris, et Filii, et Spiritus Sancti… Nos mos Dei. Deus vult de nobis.'
    },
    {
      name: 'Cacklejack',
      wiki_link_name: 'Cacklejack',
      type: 'traveller',
      ability: 'Each day, choose a player: a different player changes character tonight.',
      flavor_text: 'Wire α To wire β. LigHt oN. BuZZer off. GAzOinks! Arms STra1ght. FingER 2 nose. hOooLd stiLL. BoiNgo-banGo! Ha-ha-ha!'
    },
    {
      name: 'Gangster',
      wiki_link_name: 'Gangster',
      type: 'traveller',
      ability: 'Once per day, you may choose to kill an alive neighbor, if your other alive neighbor agrees.',
      flavor_text: 'I like your shoes. It would be such a shame if you had a little accident, and they got ruined. Now that you mention it, I like your cufflinks too.'
    },
    {
      name: 'Gnome',
      wiki_link_name: 'Gnome',
      type: 'traveller',
      ability: 'All players start knowing a player of your alignment. You may choose to kill anyone who nominates them.',
      flavor_text: 'Four the score or seven beers, no shows are goes for me and my. A prank to crack the cranks and planks o\' the floor foundation length, so incontravertabubbilly mini. The large essays down streams of joyce, no greater than is scene, not inherdt, Ha-urrumph.o.'
    }
  ]);
};


export const seed = async (knex) => {
  // Deletes ALL existing entries
  await knex('characters').where('type', 'demon').del();

  // Inserts seed entries
  await knex('characters').insert([
    {
      name: 'Al-Hadikhia',
      wiki_link_name: 'Al-Hadikhia',
      type: 'demon',
      ability: 'Each night*, you may choose 3 players (all players learn who): each silently chooses to live or die, but if all live, all die.',
      flavor_text: 'Alsukut min dhahab.',
    },
    {
      name: 'Fang Gu',
      wiki_link_name: 'Fang_Gu',
      type: 'demon',
      ability: 'Each night*, choose a player: they die. The 1st Outsider this kills becomes an evil Fang Gu & you die instead. [+1 Outsider]',
      flavor_text: 'Your walls and your weapons are but smoke in dreams.',
    },
    {
      name: 'Imp',
      wiki_link_name: 'Imp',
      type: 'demon',
      ability: 'Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.',
      flavor_text: 'We must keep our wits sharp and our sword sharper. Evil walks among us, and will stop at nothing to destroy us good, simple folk, bringing our fine town to ruin. Trust no-one. But, if you must trust someone, trust me.',
    },
    {
      name: 'Kazali',
      wiki_link_name: 'Kazali',
      type: 'demon',
      ability: 'Each night*, choose a player: they die. [You choose which players are which Minions. -? to +? Outsiders]',
      flavor_text: 'Gon(z)a7les6. Take cau8tun. The mech4an4ion is iNvert10d. E99ors insy6tum. Reco{7}fig.',
    },
    {
      name: 'Legion',
      wiki_link_name: 'Legion',
      type: 'demon',
      ability: 'Each night*, a player might die. Executions fail if only evil voted. You register as a Minion too. [Most players are Legion]',
      flavor_text: 'We are the chill wind on a winter\'s day. We are the shadow in the moonless night. We are the poison in your tea and the whisper in your ear. We are everywhere.',
    },
    {
      name: 'Leviathan',
      wiki_link_name: 'Leviathan',
      type: 'demon',
      ability: 'If more than 1 good player is executed, evil wins. All players know you are in play. After day 5, evil wins.',
      flavor_text: 'To the last, I grapple with thee. From Hell\'s heart, I stab at thee. For hate\'s sake, I spit my last breath at thee.',
    },
    {
      name: 'Lil\' Monsta',
      wiki_link_name: 'Lil\'_Monsta',
      type: 'demon',
      ability: 'Each night, Minions choose who babysits Lil\' Monsta & "is the Demon". Each night*, a player might die. [+1 Minion]',
      flavor_text: 'Step 1: Be cute.\nStep 2: World domination.\nStep 3: Bweakfast.',
    },
    {
      name: 'Lleech',
      wiki_link_name: 'Lleech',
      type: 'demon',
      ability: 'Each night*, choose a player: they die. You start by choosing a player: they are poisoned. You die if & only if they are dead.',
      flavor_text: 'Tasty, tasty, tasty, tasty, tasty, tasty, tasty, tasty brai- I mean pie! Yes. Tasty pie. That\'s what I meant to say.',
    },
    {
      name: 'Lord of Typhon',
      wiki_link_name: 'Lord_of_Typhon',
      type: 'demon',
      ability: 'Each night*, choose a player: they die. [Evil characters are in a line. You are in the middle. +1 Minion. -? to +? Outsiders]',
      flavor_text: 'In the shadowed and forgotten corners of the cosmos, where the stars whisper secrets to the void, lies a truth so profound that the merest glimpse of it unravels the sanity of mortal minds.',
    },
    {
      name: 'No Dashii',
      wiki_link_name: 'No_Dashii',
      type: 'demon',
      ability: 'Each night*, choose a player: they die. Your 2 Townsfolk neighbors are poisoned.',
      flavor_text: 'By the sins of Arnoch, I feel thy laden stench. By the curs-ed sun and her foul legion of tiny grinning gods, I corrupt thee. By the blessed night and the hidden depths of the horrid and unholy sea, I end thy squalid life upon this plane.',
    },
    {
      name: 'Ojo',
      wiki_link_name: 'Ojo',
      type: 'demon',
      ability: 'Each night*, choose a character: they die. If they are not in play, the Storyteller chooses who dies.',
      flavor_text: 'Like a bonfire on a moonless night... I see you, mortal.',
    },
    {
      name: 'Po',
      wiki_link_name: 'Po',
      type: 'demon',
      ability: 'Each night*, you may choose a player: they die. If your last choice was no-one, choose 3 players tonight.',
      flavor_text: 'Would you like a flower? I\'m so lonely.',
    },
    {
      name: 'Pukka',
      wiki_link_name: 'Pukka',
      type: 'demon',
      ability: 'Each night, choose a player: they are poisoned. The previously poisoned player dies then becomes healthy.',
      flavor_text: 'You truly have been kind welcoming me into your beautiful home. I am so sorry I accidentally scratched you. A little thing. No matter. But please, take this golden toothpick as a humble token of my regret.',
    },
    {
      name: 'Riot',
      wiki_link_name: 'Riot',
      type: 'demon',
      ability: 'On day 3, Minions become Riot & nominees die but nominate an alive player immediately. This must happen.',
      flavor_text: 'Larga vida a la revolución! Mi revolucion!',
    },
    {
      name: 'Shabaloth',
      wiki_link_name: 'Shabaloth',
      type: 'demon',
      ability: 'Each night*, choose 2 players: they die. A dead player you chose last night might be regurgitated.',
      flavor_text: 'Blarg f\'taag nm mataan! No sho gumtha m\'sik na yuuu. Fluuuuuuuuurg h-sikkkh.',
    },
    {
      name: 'Vigormortis',
      wiki_link_name: 'Vigormortis',
      type: 'demon',
      ability: 'Each night*, choose a player: they die. Minions you kill keep their ability & poison 1 Townsfolk neighbor. [-1 Outsider]',
      flavor_text: 'All doors are one door. All keys are one key. All cups are one cup, but whosoever drinketh of the water that I give shall never thirst, but the water shall be in him a well springing up into everlasting life.',
    },
    {
      name: 'Vortox',
      wiki_link_name: 'Vortox',
      type: 'demon',
      ability: 'Each night*, choose a player: they die. Townsfolk abilities yield false info. Each day, if no-one is executed, evil wins.',
      flavor_text: 'Black is White. Right is Wrong. Left is Right. Up is Long. Down is Sight. Short is Blind. Follow me. Answers find.',
    },
    {
      name: 'Yaggababble',
      wiki_link_name: 'Yaggababble',
      type: 'demon',
      ability: 'You start knowing a secret phrase. For each time you said it publicly today, a player might die.',
      flavor_text: 'Murders inside the Rue Morgue? Фальшивые новости! Hounds on the Baskerville moor? Фальшивые новости! Death while sailing the Nile? Фальшивые новости!',
    },
    {
      name: 'Zombuul',
      wiki_link_name: 'Zombuul',
      type: 'demon',
      ability: 'Each night*, if no-one died today, choose a player: they die. The 1st time you die, you live but register as dead.',
      flavor_text: 'I do not. Understand. Your ways. Fellow human. Show me. The dirt. Where the holy. Lay. Sleeping. I too. Must sleep. Soon.',
    }
  ]);
};

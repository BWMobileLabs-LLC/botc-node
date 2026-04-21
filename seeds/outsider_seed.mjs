
export const seed = async (knex) => {
  // Deletes ALL existing entries
  await knex('characters').where('type', 'outsider').del();

  // Inserts seed entries
  await knex('characters').insert([
    {
      name: 'Barber',
      wiki_link_name: 'Barber',
      type: 'outsider',
      ability: 'If you died today or tonight, the Demon may choose 2 players (not another Demon) to swap characters.',
      flavor_text: 'Did you know that barbery and surgery were once the same profession? No? Well, now you do.',
    },
    {
      name: 'Butler',
      wiki_link_name: 'Butler',
      type: 'outsider',
      ability: 'Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too.',
      flavor_text: 'Yes, sir...\nNo, sir...\nCertainly, sir.'
    },
    {
      name: 'Damsel',
      wiki_link_name: 'Damsel',
      type: 'outsider',
      ability: 'All Minions know a Damsel is in play. If a Minion publicly guesses you (once), your team loses.',
      flavor_text: 'Don\'t touch ze hair, honey.'
    },
    {
      name: 'Drunk',
      wiki_link_name: 'Drunk',
      type: 'outsider',
      ability: 'You do not know you are the Drunk. You think you are a Townsfolk character, but you are not.',
      flavor_text: 'I\'m only a *hic* social drinker, my dear. Admittedly, I am a heavy *burp* socializer.'
    },
    {
      name: 'Golem',
      wiki_link_name: 'Golem',
      type: 'outsider',
      ability: 'You may only nominate once per game. When you do, if the nominee is not the Demon, they die.',
      flavor_text: 'Golem help? Golem smash! Golem help.'
    },
    {
      name: 'Goon',
      wiki_link_name: 'Goon',
      type: 'outsider',
      ability: 'Each night, the 1st player to choose you with their ability is drunk until dusk. You become their alignment.',
      flavor_text: 'Yes boss. I explained fings real good to dat geezer. He don\'t want me explain it again. Nah boss, I don\'t need no doctor - it\'s only a knife wound. Be right come mornin'
    },
    {
      name: 'Hatter',
      wiki_link_name: 'Hatter',
      type: 'outsider',
      ability: 'If you died today or tonight, the Minion & Demon players may choose new Minion & Demon characters to be.',
      flavor_text: 'One Hat. Too Hat. Three Hat. Tea Hat. Fore Hat. Thrive Hat. Six Hat. Sticks Hat.'
    },
    {
      name: 'Heretic',
      wiki_link_name: 'Heretic',
      type: 'outsider',
      ability: 'Whoever wins, loses & whoever loses, wins, even if you are dead.',
      flavor_text: 'After the hail has smashed the roof and splintered the glass of the Cathedral windows, it melts again into the earth, like a dying lamb in the desert sun. Such is the parable of the madman.'
    },
    {
      name: 'Hermit',
      wiki_link_name: 'Hermit',
      type: 'outsider',
      ability: 'You have all Outsider abilities. [-0 or -1 Outsider]',
      flavor_text: 'In the lost and forgotten places of the earth, the soul\'s light beckons.'
    },
    {
      name: 'Klutz',
      wiki_link_name: 'Klutz',
      type: 'outsider',
      ability: 'When you learn that you died, publicly choose 1 alive player: if they are evil, your team loses.',
      flavor_text: 'Oops.'
    },
    {
      name: 'Lunatic',
      wiki_link_name: 'Lunatic',
      type: 'outsider',
      ability: 'You think you are a Demon, but you are not. The Demon knows who you are & who you choose at night.',
      flavor_text: 'I am the night... I think.'
    },
    {
      name: 'Moonchild',
      wiki_link_name: 'Moonchild',
      type: 'outsider',
      ability: 'When you learn that you died, publicly choose 1 alive player. Tonight, if it was a good player, they die.',
      flavor_text: 'Scorpio looks sideways at the lovers, and you have a choice to make. With silver cross my palm, and your fate shall be revealed. With steel cross my throat, and by the stars you shall regret it.'
    },
    {
      name: 'Mutant',
      wiki_link_name: 'Mutant',
      type: 'outsider',
      ability: 'If you are "mad" about being an Outsider, you might be executed.',
      flavor_text: 'I am not a freak! I am a human being! Have mercy!'
    },
    {
      name: 'Ogre',
      wiki_link_name: 'Ogre',
      type: 'outsider',
      ability: 'On your 1st night, choose a player (not yourself): you become their alignment (you don\'t know which) even if drunk or poisoned.',
      flavor_text: '<grunt><grin></grunt>'
    },
    {
      name: 'Plague Doctor',
      wiki_link_name: 'Plague_Doctor',
      type: 'outsider',
      ability: 'When you die, the Storyteller gains a Minion ability.',
      flavor_text: 'Pleauze shtay shtill. Thinks nid tiime for hillink. Myrhh-myrhh.'
    },
    {
      name: 'Politician',
      wiki_link_name: 'Politician',
      type: 'outsider',
      ability: 'If you were the player most responsible for your team losing, you change alignment & win, even if dead.',
      flavor_text: 'I\'m glad you asked that question. Truly, I am. But I think the REAL question here is...'
    },
    {
      name: 'Puzzlemaster',
      wiki_link_name: 'Puzzlemaster',
      type: 'outsider',
      ability: '1 player is drunk, even if you die. If you guess (once) who it is, learn the Demon player, but guess wrong & get false info.',
      flavor_text: 'When one begins to think that some thing is merely some other thing, one is usually on the brink of an error. Patience, patience. Don\'t confuse just and should with is and isn\'t.'
    },
    {
      name: 'Recluse',
      wiki_link_name: 'Recluse',
      type: 'outsider',
      ability: 'You might register as evil & as a Minion or Demon, even if dead.',
      flavor_text: 'Garn git ya darn grub ya mitts ofma lorn yasee. Grr. Natsy pikkins yonder southwise ye begittin afta ya! Git! Me harvy no so widda licks and demmons no be fightin\' hadsup ne\'er ma kin. Git, assay!'
    },
    {
      name: 'Saint',
      wiki_link_name: 'Saint',
      type: 'outsider',
      ability: 'If you die by execution, your team loses.',
      flavor_text: 'Wisdom begets peace. Patience begets wisdom. Fear not, for the time shall come when fear too shall pass. Let us pray, and may the unity of our vision make saints of us all.'
    },
    {
      name: 'Snitch',
      wiki_link_name: 'Snitch',
      type: 'outsider',
      ability: 'Each Minion gets 3 bluffs.',
      flavor_text: 'It was John.'
    },
    {
      name: 'Sweetheart',
      wiki_link_name: 'Sweetheart',
      type: 'outsider',
      ability: 'When you die, 1 player is drunk from now on.',
      flavor_text: 'I will never forget her. Never.'
    },
    {
      name: 'Tinker',
      wiki_link_name: 'Tinker',
      type: 'outsider',
      ability: 'You might die at any time',
      flavor_text: 'I think I see the problem. Luckily, I have an idea! This catapult will shoot twice as far with just a minor adjustment...'
    },
    {
      name: 'Zealot',
      wiki_link_name: 'Zealot',
      type: 'outsider',
      ability: 'If there are 5 or more players alive, you must vote for every nomination.',
      flavor_text: 'I enjoy talking to you. Your mind appeals to me. It resembles my own mind except that you happen to be insane.'
    }
  ]);
};

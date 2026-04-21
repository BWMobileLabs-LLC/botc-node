export const seed = async (knex) => {
  // Deletes ALL existing entries
  await knex('characters').where('type', 'townsfolk').del();

  // Inserts seed entries
  await knex('characters').insert([
    {
      name: 'Acrobat',
      wiki_link_name: 'Acrobat',
      type: 'townsfolk',
      ability: 'Each night*, choose a player: if they are or become drunk or poisoned tonight, you die.',
      flavor_text: 'Ladies and gentlemen, hold fast to your hats, for I shall defy the very laws of gravity and dance upon the air, a marvel of agility and daring, all for your delight and wonder!',
    },
    {
      name: 'Alchemist',
      wiki_link_name: 'Alchemist',
      type: 'townsfolk',
      ability: 'You have a Minion ability. When using this, the Storyteller may prompt you to choose differently.',
      flavor_text: 'Visit the interior of the Earth. By rectification thou shalt find the hidden stone. Above the gold, lieth the red. Kether in Malkuth.'
    },
    {
      name: 'Alsaahir',
      wiki_link_name: 'Alsaahir',
      type: 'townsfolk',
      ability: 'Each day, if you publicly guess which players are Minion(s) and which are Demon(s), good wins.',
      flavor_text: 'I am here because of you, and you are here because of me.'
    },
    {
      name: 'Amnesiac',
      wiki_link_name: 'Amnesiac',
      type: 'townsfolk',
      ability: 'You do not know what your ability is. Each day, privately guess what it is: you learn how accurate you are.',
      flavor_text: 'Wait. What. Who? Oh, ok. Wait. What?'
    },
    {
      name: 'Artist',
      wiki_link_name: 'Artist',
      type: 'townsfolk',
      ability: 'Once per game, during the day, privately ask the Storyteller any yes/no question.',
      flavor_text: 'Mon Dieu! C\'est lumineux! My work, she is... how you say... Magnifique! Dieu est révélé! Oui.'
    },
    {
      name: 'Atheist',
      wiki_link_name: 'Atheist',
      type: 'townsfolk',
      ability: 'The Storyteller can break the game rules, and if executed, good wins, even if you are dead. [No evil characters]',
      flavor_text: 'Let us disperse with unnecessary conjecture and silly paranoia. There is a perfectly rational explanation for everything. Yes, a teacup may indeed be orbiting the planet, too small to see, but I shall drink my tea from the very real china in my very real hands.'
    },
    {
      name: 'Balloonist',
      wiki_link_name: 'Balloonist',
      type: 'townsfolk',
      ability: 'Each night, you learn a player of a different character type than last night. [+0 or +1 Outsider]',
      flavor_text: 'More heat! Higher! Higher! Più alto! Ahhh... it is so beautiful from up here, don\'t you agree? Can you see the children fishing by the river, under the willow? Can you see the glint of the sun on the circus tent-poles? What\'s this? An old man, alone, passed out in the vineyard? Less heat! Lower! Lower! Vai più in basso!'
    },
    {
      name: 'Banshee',
      wiki_link_name: 'Banshee',
      type: 'townsfolk',
      ability: 'If the Demon kills you, all players learn this. From now on, you may nominate twice per day and vote twice per nomination.',
      flavor_text: 'Gorm do shúile, dearg do ghruaig, ní bheidh sé i bhfad, is a mbeidh tú san uaigh.'
    },
    {
      name: 'Bounty Hunter',
      wiki_link_name: 'Bounty_Hunter',
      type: 'townsfolk',
      ability: 'You start knowing 1 evil player. If the player you know dies, you learn another evil player tonight. [1 Townsfolk is evil]',
      flavor_text: 'Alone, I walk these streets, paved with the sick stench of corruption. Its thickness worms its way into my nostrils, unbidden, burning with revulsion. And anticipation. The illness of this wretched place grows each night. And I... I am the cure.'
    },
    {
      name: 'Cannibal',
      wiki_link_name: 'Cannibal',
      type: 'townsfolk',
      ability: 'You have the ability of the recently killed executee. If they are evil, you are poisoned until a good player dies by execution.',
      flavor_text: 'I don\'t like clowns. They taste funny.'
    },
    {
      name: 'Chambermaid',
      wiki_link_name: 'Chambermaid',
      type: 'townsfolk',
      ability: 'Each night, choose 2 alive players (not yourself): you learn how many woke tonight due to their ability.',
      flavor_text: 'I aint seen nothin\' untoward, Milady. Begging your pardon, but if I did see somethin\', it certainly weren\'t the master o\' the house sneaking into the professor\'s laboratory \'round eleven o\'clock and mixing up fancy potions, just like you said, Miss.'
    },
    {
      name: 'Chef',
      wiki_link_name: 'Chef',
      type: 'townsfolk',
      ability: 'You start knowing how many pairs of evil players there are.',
      flavor_text: 'This evening\'s reservations seem odd. Never before has Mrs Mayweather kept company with that scamp from Hudson Lane. Yet, tonight, they have a table for two. Strange.'
    },
    {
      name: 'Choirboy',
      wiki_link_name: 'Choirboy',
      type: 'townsfolk',
      ability: 'If the Demon kills the King, you learn which player is the Demon. [+the King]',
      flavor_text: 'I saw it, I did. I was in the pews, tidying the hymn books, when a dreadful tune started from the pipe organ. The organist had a long cloak, and long fingers on the keys. And a hat that looked… just like… yours.'
    },
    {
      name: 'Clockmaker',
      wiki_link_name: 'Clockmaker',
      type: 'townsfolk',
      ability: 'You start knowing how many steps from the Demon to its nearest Minion',
      flavor_text: 'Do not disturb me. The tick must continue, for the circle is a symbol of life and contains all things - all answers - in its divine machinery. I must work.'
    },
    {
      name: 'Courtier',
      wiki_link_name: 'Courtier',
      type: 'townsfolk',
      ability: 'Once per game, at night, choose a character: they are drunk for 3 nights & 3 days.',
      flavor_text: 'I am more afraid of an army of one hundred sheep led by a lion than an army of one hundred lions led by a sheep.'
    },
    {
      name: 'Cult Leader',
      wiki_link_name: 'Cult_Leader',
      type: 'townsfolk',
      ability: 'Each night, you become the alignment of an alive neighbor. If all good players choose to join your cult, your team wins.',
      flavor_text: 'Thinking themselves wise, they became fools.'
    },
    {
      name: 'Dreamer',
      wiki_link_name: 'Dreamer',
      type: 'townsfolk',
      ability: 'Each night, choose a player (not yourself or Travellers): you learn 1 good & 1 evil character, 1 of which is correct.',
      flavor_text: 'I remember the Clockmaker. The sky was red and it was raining fractal triangles. There was a smell of violets and a bubbling sound. A woman with glowing eyes and a scraggly beard was hissing at the sky. Then, I awoke.'
    },
    {
      name: 'Empath',
      wiki_link_name: 'Empath',
      type: 'townsfolk',
      ability: 'Each night, you learn how many of your 2 alive neighbors are evil.',
      flavor_text: 'My skin prickles. Something is not right here. I can feel it.'
    },
    {
      name: 'Engineer',
      wiki_link_name: 'Engineer',
      type: 'townsfolk',
      ability: 'Once per game, at night, choose which Minions or which Demon is in play.',
      flavor_text: 'If it bends, great. If it breaks, well, it probably needed fixing anyway.'
    },
    {
      name: 'Exorcist',
      wiki_link_name: 'Exorcist',
      type: 'townsfolk',
      ability: 'Each night*, choose a player (different to last night): the Demon, if chosen, learns who you are then doesn\'t wake tonight.',
      flavor_text: 'We cast you out, every unclean spirit, every satanic power, every onslaught of the infernal adversary, every legion, every diabolical group and sect, in the name and by the power of Our Lord Jesus Christ. We command you, begone and fly far from the Church of God, from the souls made by God in His image and redeemed by the precious blood of the divine Lamb.'
    },
    {
      name: 'Farmer',
      wiki_link_name: 'Farmer',
      type: 'townsfolk',
      ability: 'When you die at night, an alive good player becomes a Farmer.',
      flavor_text: 'Even the high and mighty need food on the table. Without us, the city starves.'
    },
    {
      name: 'Fisherman',
      wiki_link_name: 'Fisherman',
      type: 'townsfolk',
      ability: 'Once per game, during the day, visit the Storyteller for some advice to help your team win.',
      flavor_text: 'This was my favourite part of the river... see how the sunlight makes a rainbow from the monastery to the market? This was the best place for big fish. And the older I get, the bigger they were.'
    },
    {
      name: 'Flowergirl',
      wiki_link_name: 'Flowergirl',
      type: 'townsfolk',
      ability: 'Each night*, you learn if a Demon voted today.',
      flavor_text: 'Yesterday\'s violets have withered and died, but today my poppies bloom.'
    },
    {
      name: 'Fool',
      wiki_link_name: 'Fool',
      type: 'townsfolk',
      ability: 'The 1st time you die, you don\'t.',
      flavor_text: '...and the King said \'What?! I\'ve never even owned a pair of rubber pantaloons, let alone a custard cannon!\' Ho-ho! Jolly day!'
    },
    {
      name: 'Fortune Teller',
      wiki_link_name: 'Fortune_Teller',
      type: 'townsfolk',
      ability: 'Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you.',
      flavor_text: 'I sense great evil in your soul! But... that could just be your perfume. I am allergic to Elderberry.'
    },
    {
      name: 'Gambler',
      wiki_link_name: 'Gambler',
      type: 'townsfolk',
      ability: 'Each night*, choose a player & guess their character: if you guess wrong, you die.',
      flavor_text: 'Heads, I win. Tails, you lose.'
    },
    {
      name: 'General',
      wiki_link_name: 'General',
      type: 'townsfolk',
      ability: 'Each night, you learn which alignment the Storyteller believes is winning: good, evil, or neither.',
      flavor_text: 'I don\'t have time for quotes.'
    },
    {
      name: 'Gossip',
      wiki_link_name: 'Gossip',
      type: 'townsfolk',
      ability: 'Each day, you may make a public statement. Tonight, if it was true, a player dies.',
      flavor_text: 'Blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah. Blah.'
    },
    {
      name: 'Grandmother',
      wiki_link_name: 'Grandmother',
      type: 'townsfolk',
      ability: 'You start knowing a good player & their character. If the Demon kills them, you die too.',
      flavor_text: 'Take a jacket if you go outside, dearie. And your thermos. And your scarf. I have a weak heart, you know. Whatever would I do if you caught cold...or worse?'
    },
    {
      name: 'High Priestess',
      wiki_link_name: 'High_Priestess',
      type: 'townsfolk',
      ability: 'Each night, learn which player the Storyteller believes you should talk to most.',
      flavor_text: 'There is life behind the personality that uses personalities as masks. There are times when life puts off the mask and deep answers to deep.'
    },
    {
      name: 'Huntsman',
      wiki_link_name: 'Huntsman',
      type: 'townsfolk',
      ability: 'Once per game, at night, choose a living player: the Damsel, if chosen, becomes a not-in-play Townsfolk. [+the Damsel]',
      flavor_text: 'My cabin is warm and sturdy. My axe by the door, my boots drying by the fire, and elk stew a-simmering… Hark! A scream echoes through the valley! The rain and the mud and the cold, cold wind mask the scent of the wolves, but I know the path and my pace is steady. I am coming.'
    }, {
      name: 'Innkeeper',
      wiki_link_name: 'Innkeeper',
      type: 'townsfolk',
      ability: 'Each night*, choose 2 players: they can\'t die tonight, but 1 is drunk until dusk.',
      flavor_text: 'Come inside, fair traveller, and rest your weary bones. Drink and be merry, for the legions of the Dark One shall not harass thee tonight.'
    },
    {
      name: 'Investigator',
      wiki_link_name: 'Investigator',
      type: 'townsfolk',
      ability: 'You start knowing that 1 of 2 players is a particular Minion.',
      flavor_text: 'It is a fine night for a stroll, wouldn\'t you say, Mister Morozov? Or should I say... BARON Morozov?'
    },
    {
      name: 'Juggler',
      wiki_link_name: 'Juggler',
      type: 'townsfolk',
      ability: 'On your 1st day, publicly guess up to 5 players\' characters. That night, you learn how many you got correct.',
      flavor_text: 'For my next trick, as per request, I will need a flower, a bag of beans, a toy snake, a paintbrush, and a motorized gasoline-powered hedge trimming device. I warn you, this trick may be my last. Oh dear.'
    },
    {
      name: 'King',
      wiki_link_name: 'King',
      type: 'townsfolk',
      ability: 'Each night, if the dead equal or outnumber the living, you learn 1 alive character. The Demon knows you are the King.',
      flavor_text: '↑Betwixt the unknown strains of mortal strife→ And morbid night, sweet↓ with mystery and woe ←Lies unfettered joys of fate\'s long and colored life Who\'s garden blooms with each painted Face to Show.'
    },
    {
      name: 'Knight',
      wiki_link_name: 'Knight',
      type: 'townsfolk',
      ability: 'You start knowing 2 players that are not the Demon',
      flavor_text: 'When a man lies, he murders some part of the world.'
    },
    {
      name: 'Librarian',
      wiki_link_name: 'Librarian',
      type: 'townsfolk',
      ability: 'You start knowing that 1 of 2 players is a particular Outsider. (Or that zero are in play.)',
      flavor_text: 'Certainly madam, under normal circumstances, you may borrow the Codex Malificarium from the library vaults. However, you do not seem to be a member.'
    },
    {
      name: 'Lycanthrope',
      wiki_link_name: 'Lycanthrope',
      type: 'townsfolk',
      ability: 'Each night*, choose an alive player. If good, they die & the Demon doesn\'t kill tonight. One good player registers as evil.',
      flavor_text: 'Beneath the thin veneer of civilisation lies a howling madness.'
    },
    {
      name: 'Magician',
      wiki_link_name: 'Magician',
      type: 'townsfolk',
      ability: 'The Demon thinks you are a Minion. Minions think you are a Demon.',
      flavor_text: '1... 2... Abra... 3... 4... Cadabra... *poof!* And, as you can see, ladies and gentlemen, Captain Farnsworth\'s bag of gold has disappeared! Gone! Without a trace! Thank you, and goodnight!'
    },
    {
      name: 'Mathematician',
      wiki_link_name: 'Mathematician',
      type: 'townsfolk',
      ability: 'Each night, you learn how many players\' abilities worked abnormally (since dawn) due to another character\'s ability.',
      flavor_text: 'Any consistent formal system x, within which a certain amount of elementary arithmetic can be carried out is incomplete; that is, there are statements of the language of x which can neither be proved nor disproved in x. Ergo, you are drunk.'
    },
    {
      name: 'Mayor',
      wiki_link_name: 'Mayor',
      type: 'townsfolk',
      ability: 'If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead.',
      flavor_text: 'We must put our differences aside, and cease this senseless killing. We are all taxpayers after all. Well, most of us.'
    },
    {
      name: 'Minstrel',
      wiki_link_name: 'Minstrel',
      type: 'townsfolk',
      ability: 'When a Minion dies by execution, all other players (except Travellers) are drunk until dusk tomorrow.',
      flavor_text: 'And I shall hear, tho\' soft you tread above me... And all my dreams will warm and sweeter be... If you\'ll not fail to tell me that you love me... I simply sleep in peace until you come to me.'
    },
    {
      name: 'Monk',
      wiki_link_name: 'Monk',
      type: 'townsfolk',
      ability: 'Each night*, choose a player (not yourself): they are safe from the Demon tonight.',
      flavor_text: '\'Tis an ill and deathly wind that blows tonight. Come, my brother, take shelter in the abbey while the storm rages. By my word, or by my life, you will be safe.'
    },
    {
      name: 'Nightwatchman',
      wiki_link_name: 'Nightwatchman',
      type: 'townsfolk',
      ability: 'Once per game, at night, choose a player: they learn you are the Nightwatchman.',
      flavor_text: 'he night is cold and lonely, but I have the moon, the stars, the crisp wind and the soft thud of leather boots on cobbled stone for company. Yonder, candlelight flickers behind a murky window...'
    },
    {
      name: 'Noble',
      wiki_link_name: 'Noble',
      type: 'townsfolk',
      ability: 'You start knowing 3 players, 1 and only 1 of which is evil.',
      flavor_text: 'Sarcasm is indeed the lowest form of wit. But speaking in response to your criticism, Sir, it is, nevertheless, a form of wit.'
    },
    {
      name: 'Oracle',
      wiki_link_name: 'Oracle',
      type: 'townsfolk',
      ability: 'Each night*, you learn how many dead players are evil.',
      flavor_text: 'Only the chosen may gaze beyond the veil. The dead are restless, and they point in silence toward the icy north.'
    },
    {
      name: 'Pacifist',
      wiki_link_name: 'Pacifist',
      type: 'townsfolk',
      ability: 'Executed good players might not die.',
      flavor_text: 'Distrust all in whom the impulse to punish is powerful.'
    },
    {
      name: 'Philosopher',
      wiki_link_name: 'Philosopher',
      type: 'townsfolk',
      ability: 'Once per game, at night, choose a good character: gain that ability. If this character is in play, they are drunk.',
      flavor_text: 'If anything is real, beer is real. Drink, for tomorrow we may die.'
    },
    {
      name: 'Pixie',
      wiki_link_name: 'Pixie',
      type: 'townsfolk',
      ability: 'You start knowing 1 in-play Townsfolk. If you were mad that you were this character, you gain their ability when they die.',
      flavor_text: 'Round and round the garden, go.\nLittle girls run to and fro.\nLittle boys climb up the tree.\nWhich of these should Pixie be?\nLadies smile and go to town.\nLords with axe chop forest down.\nWhat\'s yours is mine.\nWhat\'s mine, divine.\nSilly little Pixie, me.'
    },
    {
      name: 'Poppy Grower',
      wiki_link_name: 'Poppy_Grower',
      type: 'townsfolk',
      ability: 'Minions & Demons do not know each other. If you die, they learn who each other are that night.',
      flavor_text: 'In the hidden groves of the deep forest, the black poppy dwells. To see its revelry is to be enchanted. To smell its thick aroma is to be lost forever, a slave to the gods of light and dark.'
    },
    {
      name: 'Preacher',
      wiki_link_name: 'Preacher',
      type: 'townsfolk',
      ability: 'Each night, choose a player: a Minion, if chosen, learns this. All chosen Minions have no ability.',
      flavor_text: 'It is better to be rich and healthy than poor and sick.'
    },
    {
      name: 'Princess',
      wiki_link_name: 'Princess',
      type: 'townsfolk',
      ability: 'On your 1st day, if you nominated & executed a player, the Demon doesn\'t kill tonight.',
      flavor_text: 'Our words are hounds, bound by silken threads, dear lords. Let kindness weave them true, lest the reigns unravel and rend our court.'
    },
    {
      name: 'Professor',
      wiki_link_name: 'Professor',
      type: 'townsfolk',
      ability: 'Once per game, at night*, choose a dead player: if they are a Townsfolk, they are resurrected.',
      flavor_text: 'The process is simple. Attach the hydraulic confabulator to the modified chi matrix amplifier, add 20 CCs of pseudodorafine, keep his Z levels above 20%, and your husband will be fine. Now, all we need is a lightning strike.'
    },
    {
      name: 'Ravenkeeper',
      wiki_link_name: 'Ravenkeeper',
      type: 'townsfolk',
      ability: 'If you die at night, you are woken to choose a player: you learn their character.',
      flavor_text: 'My birds will avenge me! Fly! Fly, my sweet and dutiful pets! To the manor and to the river! To the alleys and to the salons! Fly!'
    },
    {
      name: 'Sage',
      wiki_link_name: 'Sage',
      type: 'townsfolk',
      ability: 'If the Demon kills you, you learn that it is 1 of 2 players.',
      flavor_text: 'These mountainous tomes guard the secret, I am sure of it! Twixt word and word, it lies in wait. More candles, boy! More ink! These notes may look arcane, but the infernal puzzle is revealing itself.'
    },
    {
      name: 'Sailor',
      wiki_link_name: 'Sailor',
      type: 'townsfolk',
      ability: 'Each night, choose an alive player: either you or they are drunk until dusk. You can\'t die.',
      flavor_text: 'I\'ll drink any one of yer under the table! You! The chatterbox! Reckon you can take me? No? Howza \'bout you, Grandma? You ever tried Old McKillys Extra Spiced Rum before? Guaranteed to put hairs on yer chest! Step aboard, aye!'
    },
    {
      name: 'Savant',
      wiki_link_name: 'Savant',
      type: 'townsfolk',
      ability: 'Each day, you may visit the Storyteller to learn 2 things in private: 1 is true & 1 is false.',
      flavor_text: 'Seventy-two matchsticks on the floor... the sun sets early but the moon is unchanged... a torn piece of cloth... evil in the manor house... three by three... the one we trusted is not what he seems... green light means magnesium... residue, but the pattern is wrong... Seventy-two matchsticks on the floor...'
    },
    {
      name: 'Seamstress',
      wiki_link_name: 'Seamstress',
      type: 'townsfolk',
      ability: 'Once per game, at night, choose 2 players (not yourself): you learn if they are the same alignment.',
      flavor_text: 'Did you hear that stranger in the cashmere coat put the word on our young Belle? And she said yes? Well, that\'s nothing compared to what Harry and that juggler got up to at the fair! The things I could say if I was a tattletale... my, yes.'
    },
    {
      name: 'Shugenja',
      wiki_link_name: 'Shugenja',
      type: 'townsfolk',
      ability: 'You start knowing if your closest evil player is clockwise or anti-clockwise. If equidistant, this info is arbitrary.',
      flavor_text: 'これは夢。それも夢。すべて夢です。'
    },
    {
      name: 'Slayer',
      wiki_link_name: 'Slayer',
      type: 'townsfolk',
      ability: 'Once per game, during the day, publicly choose a player: if they are the Demon, they die.',
      flavor_text: 'Die.'
    },
    {
      name: 'Snake Charmer',
      wiki_link_name: 'Snake_Charmer',
      type: 'townsfolk',
      ability: 'Each night, choose an alive player: a chosen Demon swaps characters & alignments with you & is then poisoned.',
      flavor_text: 'Effendi... I am but a humble man, but my pipe is golden and a single tune will tame the wildest djinn, Inshallah. They say that greed hangs more men than rope. But not I, Effendi... not I.'
    },
    {
      name: 'Soldier',
      wiki_link_name: 'Soldier',
      type: 'townsfolk',
      ability: 'You are safe from the Demon.',
      flavor_text: 'As David said to Goliath, as Theseus said to the Minotaur, as Arjuna said to Bhagadatta... No.'
    },
    {
      name: 'Steward',
      wiki_link_name: 'Steward',
      type: 'townsfolk',
      ability: 'You start knowing 1 good player.',
      flavor_text: 'How DARE you accuse Her Ladyship of wrongdoing? I\'ve known her my entire life! All nine years!'
    },
    {
      name: 'Tea Lady',
      wiki_link_name: 'Tea_Lady',
      type: 'townsfolk',
      ability: 'If both your alive neighbors are good, they can\'t die.',
      flavor_text: 'If you are cold, tea will warm you. If you are too heated, tea will cool you. If you are depressed, tea will cheer you. If you are excited, tea will calm you.'
    },
    {
      name: 'Town Crier',
      wiki_link_name: 'Town_Crier',
      type: 'townsfolk',
      ability: 'Each night*, you learn if a Minion nominated today.',
      flavor_text: 'Hear ye! Hear ye! Witchcraft in the labyrinth! Genius savant reveals all! Town in danger! Hear Ye!'
    },
    {
      name: 'Undertaker',
      wiki_link_name: 'Undertaker',
      type: 'townsfolk',
      ability: 'Each night*, you learn which character died by execution today.',
      flavor_text: 'Hmmm....what have we here? The left boot is worn down to the heel, with flint shavings under the tongue. This is the garb of a Military man.'
    },
    {
      name: 'Village Idiot',
      wiki_link_name: 'Village_Idiot',
      type: 'townsfolk',
      ability: 'Each night, choose a player: you learn their alignment. [+0 to +2 Village Idiots. 1 of the extras is drunk]',
      flavor_text: 'Roses are blue, and violets are red, Please reverse what I just said.'
    },
    {
      name: 'Virgin',
      wiki_link_name: 'Virgin',
      type: 'townsfolk',
      ability: 'The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately.',
      flavor_text: 'I am pure. Let those who are without sin cast themselves down and suffer in my stead. My reputation shall not be stained with your venomous accusations.'
    },
    {
      name: 'Washerwoman',
      wiki_link_name: 'Washerwoman',
      type: 'townsfolk',
      ability: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
      flavor_text: 'Bloodstains on a dinner jacket? No, this is cooking sherry. How careless.'
    }
  ]);
};

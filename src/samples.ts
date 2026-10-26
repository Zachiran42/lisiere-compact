import type { LibraryBook } from './types';

type Story = { id: string; title: string; accent: string; chapters: { title: string; paragraphs: string[] }[] };

// These short stories were written for Lisière. They are demonstration content,
// rather than excerpts or reproductions of published books.
const stories: Story[] = [
  {
    id: 'sample-heures-bleues',
    title: 'Les heures bleues',
    accent: '#365B48',
    chapters: [
      {
        title: 'La fenêtre du matin',
        paragraphs: [
          'La maison avait une manière bien à elle de se réveiller. Avant le premier autobus, avant le boulanger et son rideau de métal, un rectangle bleu apparaissait sur le mur de la cuisine. Il avançait lentement jusqu’à la table. C’était à ce signe que Jeanne ouvrait les yeux.',
          'Elle avait quitté la ville trois semaines plus tôt, avec deux valises et un carton de tasses dépareillées. On lui avait demandé ce qu’elle venait chercher ici. Elle avait parlé de travail, de loyers moins chers, du jardin qu’elle pourrait enfin entretenir. Elle avait oublié de dire qu’elle voulait retrouver le temps de regarder une lumière traverser une pièce.',
          'Ce matin-là, un carnet attendait sur le rebord de la fenêtre. Elle l’avait découvert la veille, derrière un radiateur. Sa couverture était bleue, presque grise. Sur la première page, une écriture minuscule avait noté : « Les jours commencent avant nos projets. » Rien d’autre. Toutes les pages suivantes étaient blanches.',
          'Jeanne prépara du café. Elle posa le carnet devant elle et chercha une phrase assez importante pour mériter la seconde page. Les nouvelles du monde lui vinrent à l’esprit, puis la liste des choses à réparer dans la maison, puis une lettre qu’elle n’avait jamais envoyée. Aucune phrase ne resta.',
          'Dehors, le facteur traversait la place. Il leva la main vers une fenêtre, sans attendre de réponse. Jeanne prit son stylo et écrivit simplement : « Aujourd’hui, quelqu’un a salué une maison. » Le rectangle bleu touchait maintenant sa tasse. Cela lui parut un début suffisant.',
        ],
      },
      {
        title: 'Le détour',
        paragraphs: [
          'Pour aller acheter du pain, il existait deux chemins. Le premier suivait la route, longeait trois garages et arrivait en quatre minutes. Le second descendait vers la rivière, passait sous les saules et remontait derrière la boulangerie. Il fallait presque vingt minutes, à condition de ne pas s’arrêter.',
          'Jeanne choisit le second. Au pied du pont, un homme réparait un banc. Il avait disposé ses outils sur un torchon à carreaux. Chaque vis retrouvait sa place dans une petite boîte en fer. Il travaillait sans se presser, comme si le banc lui racontait quelque chose qu’il ne voulait pas interrompre.',
          '« Il penchait », expliqua-t-il en voyant Jeanne ralentir. Elle répondit qu’elle ne l’avait pas remarqué. L’homme sourit. « Personne ne le remarque tant qu’il tient. » Il se présenta : Lucien, ancien menuisier, actuel promeneur. Il trouvait cette seconde occupation beaucoup plus exigeante.',
          'Ils parlèrent du niveau de la rivière et du saule dont une branche effleurait l’eau. Lucien lui montra une marque sur la pierre du pont, souvenir d’une crue ancienne. Jeanne passa la main dessus. La trace était discrète, mais elle changeait tout : le paysage avait une mémoire, et elle venait d’en apprendre une ligne.',
          'Lorsqu’elle arriva à la boulangerie, il ne restait que des pains ronds. Elle en choisit un, encore chaud. Sur le chemin du retour, elle s’assit sur le banc réparé. Le pain tiédissait contre ses genoux. Dans son carnet, ce soir-là, elle écrivit : « Un détour peut être exactement le chemin qu’il fallait prendre. »',
        ],
      },
      {
        title: 'Une lampe pour deux',
        paragraphs: [
          'La pluie arriva le jeudi et resta jusqu’au dimanche. Elle dessinait de petites routes sur les vitres, effaçait la colline et faisait du jardin une île sombre. Jeanne installa une lampe près de la fenêtre. Son cercle jaune était assez grand pour le carnet, une tasse et le pain du matin.',
          'À dix-huit heures, on frappa. Lucien se tenait sur le seuil avec une boîte de biscuits et un parapluie qui avait renoncé à sa fonction. Il venait rapporter un livre trouvé sous le banc. Ce n’était pas celui de Jeanne, mais il avait pensé qu’elle saurait à qui le rendre. Dans le village, les personnes qui lisent finissent toujours par se connaître.',
          'Elle le fit entrer. Ils cherchèrent un nom dans le livre et ne trouvèrent qu’un ticket de train, daté de l’été précédent. La destination était une ville au bord de la mer. Ils imaginèrent le voyage : une fenêtre ouverte, un sac trop lourd, le soulagement de voir apparaître l’eau après des heures de champs.',
          'Puis ils cessèrent de parler. Lucien feuilletait le livre. Jeanne écrivait. La pluie continuait, mais la pièce ne semblait plus attendre qu’elle s’arrête. Il y avait deux tasses dans le cercle de la lampe, et suffisamment de place pour le silence.',
          'Quand Lucien repartit, Jeanne n’ajouta rien à sa page. Elle laissa le carnet ouvert. Le lendemain, la lumière bleue reviendrait. Peut-être écrirait-elle une longue phrase, peut-être trois mots. Elle savait désormais que les pages blanches ne réclamaient rien. Elles étaient simplement là, disponibles, comme une chaise près de la fenêtre.',
        ],
      },
    ],
  },
  {
    id: 'sample-jardin-possibles',
    title: 'Le jardin des possibles',
    accent: '#A96246',
    chapters: [
      {
        title: 'La parcelle oubliée',
        paragraphs: [
          'Au bout de la rue des Écoles, derrière une grille qui ne fermait plus, un terrain poussait tout seul. Les enfants l’appelaient la jungle. Les adultes l’appelaient le terrain vague. Nora, qui venait de louer l’appartement du dessus, l’appela un jardin. Le nom changeait déjà quelque chose.',
          'Elle descendit un samedi avec une paire de gants et un sac. Elle n’avait ni plan ni expérience. Elle savait seulement reconnaître les bouteilles vides et les sachets emportés par le vent. Ce premier travail ne demandait aucune connaissance des plantes, uniquement un peu de patience et le désir de voir le sol.',
          'Vers midi, un garçon l’observa depuis la grille. Il s’appelait Sami et possédait une loupe. Il cherchait des insectes, expliqua-t-il, mais seulement ceux qui acceptaient de se montrer. Nora lui confia une mission : choisir un coin que personne ne dérangerait. Il désigna aussitôt le vieux tas de branches.',
          'La voisine du rez-de-chaussée apporta deux verres d’eau. Elle avait vu passer quatre propriétaires et trois projets de parking. Aucun n’avait abouti. « Vous pensez vraiment faire quelque chose ici ? » demanda-t-elle. Nora regarda les sacs alignés près de la grille. « Quelque chose a déjà commencé. »',
          'Le soir, elle dessina le terrain sur une feuille. Elle réserva une place aux branches de Sami, une autre à un banc qui n’existait pas encore. Le reste demeura vide. Elle écrivit en haut : « À décider ensemble. » Ce fut le premier plan du jardin.',
        ],
      },
      {
        title: 'Ce qui prend racine',
        paragraphs: [
          'Les premiers plants arrivèrent dans des contenants improbables : un pot de confiture, une boîte de thé, un seau troué. Chacun apportait ce qu’il avait. La menthe de madame Aïcha sentait déjà toute une cuisine. Le romarin de Paul avait survécu à trois déménagements. Sami apporta une graine dont il ignorait le nom.',
          'Nora aurait voulu tout organiser par hauteur et par couleur. Aïcha proposa plutôt de regarder le soleil. Ils passèrent une matinée à déplacer des caisses, à observer les ombres, à essayer de comprendre ce que le terrain savait déjà. Le jardin les obligeait à poser des questions plus lentes.',
          'La première semaine, rien ne sembla changer. La deuxième, les feuilles de la menthe doublèrent presque de taille. La troisième, le plant anonyme de Sami fit apparaître deux feuilles rondes. Il venait le voir chaque jour et prenait des notes dans un carnet beaucoup trop grand pour sa poche.',
          'Il y eut aussi des échecs. Une rangée de radis fut oubliée sous la chaleur. Un orage renversa les étiquettes. Nora découvrit qu’on peut arroser trop, même en voulant bien faire. Ils recommencèrent. Personne ne tint de compte des erreurs, mais tout le monde se souvenait des conseils qui avaient aidé.',
          'À la fin du mois, ils installèrent le banc. Paul l’avait fabriqué avec des planches récupérées. Il était un peu trop bas et tout à fait confortable. Aïcha s’y assit la première. Elle regarda les plantes, les outils, les mains couvertes de terre. « Voilà, dit-elle. Maintenant, il y a une raison de rester. »',
        ],
      },
      {
        title: 'La place libre',
        paragraphs: [
          'En août, le jardin avait une porte toujours ouverte et des habitudes précises. On arrosait tôt, on partageait les tomates mûres, on laissait un mot sur l’ardoise quand une brouette devait être rendue. Le terrain vague avait disparu sans que personne puisse dire quel jour exactement.',
          'La plante de Sami se révéla être un tournesol. Elle dépassa le banc, puis la grille. Le garçon en fut très fier, mais aussi un peu inquiet : il n’avait pas prévu de s’occuper de quelque chose d’aussi grand. Aïcha lui expliqua qu’il suffisait parfois de placer un tuteur et de laisser faire le reste.',
          'Un dimanche, ils organisèrent un déjeuner. Des voisins qui ne s’étaient jamais parlé coupèrent du pain à la même table. On échangea des recettes, une adresse de cordonnier, le nom d’un oiseau aperçu au printemps. Nora regardait les chaises dépareillées. Elles dessinaient un cercle plus vaste que son premier plan.',
          'Près du mur, une petite parcelle restait vide. On lui proposa d’y planter des fraisiers ou d’installer un second banc. Elle hésita, puis demanda qu’on attende. Quelqu’un arriverait peut-être avec une idée qu’ils n’avaient pas encore eue. Le jardin pouvait garder une place pour cette personne.',
          'Le soir, Sami distribua les premières graines séchées du tournesol. Chacun en reçut cinq dans une enveloppe. Nora rangea les siennes à côté du dessin de la première journée. Elle n’avait pas transformé le terrain seule. Le terrain, lentement, avait appris à tout le monde comment faire un peu de place.',
        ],
      },
    ],
  },
  {
    id: 'sample-lumiere',
    title: 'Là où va la lumière',
    accent: '#B38A45',
    chapters: [
      {
        title: 'Le dernier atelier',
        paragraphs: [
          'L’atelier de Mira occupait le dernier étage d’une ancienne école. On y montait par un escalier de pierre dont les marches gardaient, au milieu, le creux des pas. Elle fabriquait des lampes. Pas des lampes compliquées : un pied de bois, un abat-jour de papier, un interrupteur qui faisait un bruit rassurant.',
          'Chaque matin, avant de travailler, elle éteignait tout. Elle voulait voir où la lumière du jour choisissait de se poser. En hiver, elle restait près des fenêtres. En été, elle allait jusqu’au fond de l’atelier et révélait une poussière que personne ne remarquait autrement.',
          'Un jour, un enfant entra avec son père. Ils cherchaient une lampe pour une chambre qui venait d’être repeinte. L’enfant ne regarda aucun modèle sur les étagères. Il observa le plafond, où un reflet tremblait à cause d’un verre d’eau. « Est-ce qu’on peut acheter celle-là ? » demanda-t-il.',
          'Mira leva les yeux. Elle avait passé des années à construire des objets qui donnent de la lumière, et voici qu’on lui demandait de vendre un reflet. Elle répondit qu’on ne pouvait pas l’acheter, mais qu’on pouvait apprendre à le faire revenir. Elle déplaça le verre et attendit que le soleil trouve le bon angle.',
          'L’enfant repartit avec une petite lampe et un verre vide. Mira conserva sa question. Le soir, elle posa sur son établi une feuille blanche et écrivit : « Ce qu’un objet permet de voir. » Elle ne dessina rien. Pour une fois, l’espace autour de la lampe lui semblait aussi important que la lampe elle-même.',
        ],
      },
      {
        title: 'Une ville à petites fenêtres',
        paragraphs: [
          'À la tombée du jour, Mira prit l’habitude de marcher. Les fenêtres s’allumaient à des heures différentes. Certaines montraient une cuisine, d’autres un rideau et rien de plus. Chaque carré lumineux semblait dire : quelqu’un est rentré, quelqu’un prépare quelque chose, quelqu’un veille encore.',
          'Dans une rue étroite, elle remarqua une fenêtre toujours sombre. Le lendemain, elle la retrouva. Une semaine passa. Elle finit par rencontrer sa propriétaire, une femme qui réparait une sonnette. Elle s’appelait Ada et dessinait des cartes du ciel. Le soir, elle travaillait dans l’obscurité pour mieux observer les étoiles.',
          'Mira s’excusa d’avoir imaginé une absence là où il y avait une présence attentive. Ada rit. Elle l’invita à monter. La pièce sentait le papier et le thé. Sur le bureau, des cartes couvertes de points attendaient un ciel dégagé. À travers la fenêtre, on voyait une mince bande de nuit entre deux toits.',
          'Ada lui montra une étoile qui semblait banale et lui expliqua le temps que sa lumière avait mis pour arriver. Mira eut soudain l’impression que la pièce était beaucoup plus grande que ses murs. Il y avait des distances qu’aucun atelier ne pourrait contenir, et pourtant elles tenaient dans un regard.',
          'En rentrant, elle ne chercha plus seulement les fenêtres éclairées. Elle regarda aussi les fenêtres sombres, les arbres, les espaces entre les réverbères. La ville possédait plusieurs manières d’être habitée. Elle avait longtemps prêté attention à une seule.',
        ],
      },
      {
        title: 'La lampe de papier',
        paragraphs: [
          'Pour Ada, Mira fabriqua une lampe très basse, couverte d’un papier couleur de terre. Sa lumière éclairait les mains et laissait la fenêtre dans l’ombre. Elle l’essaya plusieurs soirs. Il fallut déplacer l’ampoule, épaissir un côté, ouvrir l’autre. Ce n’était pas une lampe destinée à prendre toute la place.',
          'Quand elle l’apporta, le ciel était couvert. Ada posa la lampe au milieu des cartes. Elles burent du thé en attendant une éclaircie. Sans étoiles à montrer, Ada raconta son enfance dans une maison où l’électricité s’arrêtait parfois. On sortait les bougies et les adultes se mettaient à parler plus doucement.',
          'Mira pensa à l’enfant et à son verre d’eau. Elle pensa aussi aux fenêtres qu’elle croisait chaque soir. Les objets qu’elle fabriquait n’étaient peut-être que de petites invitations : s’asseoir ici, ouvrir ce livre, continuer cette conversation quelques minutes de plus.',
          'Vers onze heures, les nuages se séparèrent. Ada éteignit la lampe. La pièce devint presque noire, puis les contours revinrent. Elles regardèrent longtemps le morceau de ciel. Mira ne connaissait le nom d’aucune constellation. Cela ne l’empêchait pas de sentir qu’elle était à sa place.',
          'Le lendemain, elle retourna à l’atelier. Le soleil touchait le bord d’une planche et la poignée d’un outil. Elle ouvrit la fenêtre, rangea son établi et commença une nouvelle lampe. Sur la feuille blanche, sous sa première phrase, elle ajouta enfin : « Et ce qu’il sait laisser dans l’ombre. »',
        ],
      },
    ],
  },
];

export function createSamples(): LibraryBook[] {
  const now = Date.now();
  return stories.map((story, index) => ({
    id: story.id,
    title: story.title,
    author: 'La bibliothèque Lisière',
    language: 'fr',
    accent: story.accent,
    sample: true,
    addedAt: now - index * 1000,
    chapterIndex: 0,
    scroll: 0,
    favorite: false,
    finished: false,
    bookmarks: [],
    chapters: story.chapters.map((chapter, chapterIndex) => ({
      id: `${story.id}-chapter-${chapterIndex + 1}`,
      title: chapter.title,
      href: `chapter-${chapterIndex + 1}.xhtml`,
      html: `<h1>${chapter.title}</h1>${chapter.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}`,
    })),
  }));
}

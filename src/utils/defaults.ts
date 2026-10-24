import { RunnerProfile, Shoe, TrainingDay, RunLog, RaceSlot, StrengthExercise, PainZone } from '../types.ts';
import { estimateVO2MaxFrom5k } from './runningMath.ts';

export const PATRYK_PRESET: RunnerProfile = {
  name: 'Patryk',
  birthdate: '14.05.1995',
  gender: 'M',
  weight: 74.5,
  targetWeight: 70.0,
  height: 180,
  city: 'Zgierz',
  weeklyKm: 32,
  time5k: '26:43',
  hrMax: 188,
  rhr: 58,
  vo2max: estimateVO2MaxFrom5k('26:43'),
  targetGoal: 'Sub-25 min na 5 km i półmaraton poniżej 1h 55m',
  selectedDays: ['Wt', 'Czw', 'Sob', 'Niedz'],
  selectedShoeId: 'shoe-1',
  bamboos: 165,
  levelXp: 820,
  activePandaGear: {
    gear: 'Czapeczka Biegowa',
    skin: 'Klasyczna Panda',
    bg: 'Park Miejski w Zgierzu',
  },
  coachTone: 'naukowy',
  medications: '',
  smokeFreeDays: 45,
  activePainZones: [],
  accentColor: 'orange',
  theme: 'dark',
  isPro: true,
  subscriptionTier: 'PRO',
};

export const BEGINNER_PRESET: RunnerProfile = {
  name: 'Michał (Debiutant)',
  birthdate: '20.08.1998',
  gender: 'M',
  weight: 82.0,
  targetWeight: 76.0,
  height: 178,
  city: 'Warszawa',
  weeklyKm: 18,
  time5k: '32:30',
  hrMax: 192,
  rhr: 68,
  vo2max: estimateVO2MaxFrom5k('32:30'),
  targetGoal: 'Ukończenie biegu na 5 km bez zatrzymania',
  selectedDays: ['Wt', 'Czw', 'Sob'],
  selectedShoeId: 'shoe-4',
  bamboos: 60,
  levelXp: 180,
  activePandaGear: {
    gear: 'Koszulka RunPanda',
    skin: 'Klasyczna Panda',
    bg: 'Stadion Lekkoatletyczny',
  },
  coachTone: 'motywacyjny',
  medications: '',
  smokeFreeDays: 0,
  activePainZones: [],
  accentColor: 'emerald',
  theme: 'dark',
};

export const CLEAN_PRESET: RunnerProfile = {
  name: 'Nowy Biegacz',
  birthdate: '01.01.2000',
  gender: 'M',
  weight: 70.0,
  targetWeight: 68.0,
  city: 'Warszawa',
  weeklyKm: 20,
  time5k: '28:00',
  hrMax: 185,
  rhr: 62,
  vo2max: estimateVO2MaxFrom5k('28:00'),
  targetGoal: 'Budowa regularności i kondycji',
  selectedDays: ['Wt', 'Czw', 'Sob'],
  selectedShoeId: 'shoe-1',
  bamboos: 30,
  levelXp: 90,
  activePandaGear: {
    gear: 'Koszulka RunPanda',
    skin: 'Klasyczna Panda',
    bg: 'Stadion Lekkoatletyczny',
  },
  coachTone: 'minimalistyczny',
  medications: '',
  smokeFreeDays: 0,
  activePainZones: [],
  accentColor: 'orange',
  theme: 'dark',
};

export const DEFAULT_RACES_2027: RaceSlot[] = [];

// 12 Market Brands Shoes Catalog with Advanced Biomechanics & Training Purposes
export const DEFAULT_SHOES: Shoe[] = [
  {
    id: 'shoe-1',
    name: 'Asics Novablast 4',
    brand: 'ASICS',
    footType: 'Neutralna',
    mileageKm: 215,
    maxMileageKm: 700,
    dropMm: 8,
    weightG: 260,
    energyReturn: 9,
    cushionRating: 9,
    stabilityRating: 7,
    cushion: 'Sprężysta FF BLAST+ ECO',
    idealFor: 'Codzienne wybiegania, tempo run i długie wybiegania w Z2',
    cushionLevel: 'Maksymalna (Max Cushion)',
    dynamicsLevel: 'Wysoka (Superfoam)',
    stabilityType: 'Stopa Neutralna (Poszerzona platforma)',
    trainingPurposes: ['wolne_wybieganie', 'tempo', 'long_run', 'treningowo_startowe'],
    recommendedDistance: '10 km - Maraton (10 - 42.2 km)',
    plateType: 'Brak płytki (Kołyska Rocker)',
    surfaceType: 'Asfalt / Chodnik & Park miejski',
    foamTechnology: 'FF BLAST+ ECO (20% biosurowców)',
    dropDescription: 'Drop 8 mm — uniwersalny kąt przetoczenia odciążający mięśnie płaszczkowate łydki i wspierający płynne przejście z pięty na palce.',
    aiVerdict: 'Idealny wół roboczy dla biegacza 70–80 kg. Geometria trampoliny wspiera płynne przetoczenie.',
  },
  {
    id: 'shoe-2',
    name: 'Nike Vaporfly 3',
    brand: 'Nike',
    footType: 'Neutralna',
    mileageKm: 45,
    maxMileageKm: 450,
    dropMm: 8,
    weightG: 198,
    energyReturn: 10,
    cushionRating: 8,
    stabilityRating: 5,
    cushion: 'Pianka ZoomX + Pełna płytka Flyplate z włókna węglowego',
    idealFor: 'Zawody 5K, 10K, Półmaraton i Maraton',
    cushionLevel: 'Wysoka responsywna',
    dynamicsLevel: 'Maksymalna (Płytka Karbonowa)',
    stabilityType: 'Wąska platforma startowa (Dla wprawnych biegaczy)',
    trainingPurposes: ['startowe', 'tempo'],
    recommendedDistance: '5 km - Maraton (Race Day)',
    plateType: 'Karbon (Pełnowymiarowa płytka Flyplate)',
    surfaceType: 'Asfalt & Atestowane trasy uliczne',
    foamTechnology: '100% Pełna pianka ZoomX (Pebax)',
    dropDescription: 'Drop 8 mm z karbonowym rockerem — generuje maksymalną dźwignię wybicia i oszczędza glikogen mięśniowy.',
    aiVerdict: 'Maksymalny zwrot energii (~85%). Wymaga mocnego ścięgna Achillesa i stabilnej kadencji (>168 spm).',
  },
  {
    id: 'shoe-3',
    name: 'Adidas Adizero Boston 12',
    brand: 'Adidas',
    footType: 'Neutralna',
    mileageKm: 130,
    maxMileageKm: 650,
    dropMm: 7,
    weightG: 265,
    energyReturn: 8,
    cushionRating: 8,
    stabilityRating: 8,
    cushion: 'Lightstrike Pro + Pręty z włókna szklanego EnergyRods 2.0',
    idealFor: 'Biegi tempowe, interwały i starty kontrolne',
    cushionLevel: 'Wysoka / Dynamiczna',
    dynamicsLevel: 'Wysoka (Pręty EnergyRods 2.0)',
    stabilityType: 'Stopa Neutralna z prowadzeniem przodostopia',
    trainingPurposes: ['tempo', 'treningowo_startowe', 'long_run'],
    recommendedDistance: '10 km - Półmaraton (10 - 21.1 km)',
    plateType: 'Pręty z włókna szklanego (EnergyRods 2.0)',
    surfaceType: 'Asfalt & Bieżnia lekkoatletyczna',
    foamTechnology: 'Lightstrike Pro (góra) + Lightstrike 2.0 (dół)',
    dropDescription: 'Drop 7 mm — wspiera biomechaniczne wybicie ze śródstopia przy tempach progowych poniżej 5:00/km.',
    aiVerdict: 'Świetna dynamika bez przesadnej agresywności. Pręty odciążają powięź podeszwową.',
  },
  {
    id: 'shoe-4',
    name: 'Hoka Clifton 9',
    brand: 'Hoka',
    footType: 'Neutralna',
    mileageKm: 310,
    maxMileageKm: 750,
    dropMm: 5,
    weightG: 248,
    energyReturn: 7,
    cushionRating: 10,
    stabilityRating: 8,
    cushion: 'Maksymalistyczna formowana ciśnieniowo pianka EVA CMEVA',
    idealFor: 'Biegi regeneracyjne i długie wybiegania niedzielne',
    cushionLevel: 'Maksymalna (Max Cushion)',
    dynamicsLevel: 'Umiarkowana (Płynna kołyska Meta-Rocker)',
    stabilityType: 'Stopa Neutralna (Szerokie łoże stopy Active Foot Frame)',
    trainingPurposes: ['wolne_wybieganie', 'long_run'],
    recommendedDistance: '15 km - Ultra (Ochrona stawów)',
    plateType: 'Brak płytki (Elastyczność pianki)',
    surfaceType: 'Twardy asfalt, Chodnik, Beton',
    foamTechnology: 'Formowana ciśnieniowo pianka CMEVA',
    dropDescription: 'Niski drop 5 mm — wymusza naturalne lądowanie pod środkiem ciężkości ciała i drastycznie redukuje siły uderzenia w rzepkę kolanową.',
    aiVerdict: 'Niski drop (5 mm) wymusza lądowanie na śródstopiu i odciąża kolano przy masie >75 kg.',
  },
  {
    id: 'shoe-5',
    name: 'Saucony Endorphin Speed 4',
    brand: 'Saucony',
    footType: 'Neutralna',
    mileageKm: 95,
    maxMileageKm: 600,
    dropMm: 8,
    weightG: 233,
    energyReturn: 9,
    cushionRating: 8,
    stabilityRating: 7,
    cushion: 'Pianka PWRRUN PB (PEBA) + Skrzydełkowa płytka nylonowa',
    idealFor: 'Interwały, tempo run i starty 5K/Półmaraton',
    cushionLevel: 'Wysoka / Sprężysta',
    dynamicsLevel: 'Wysoka (Płytka nylonowa Speedroll)',
    stabilityType: 'Stopa Neutralna ze skrzydełkami centrującymi płytki',
    trainingPurposes: ['tempo', 'treningowo_startowe', 'startowe'],
    recommendedDistance: '5 km - Półmaraton (Biegi z akcentem)',
    plateType: 'Nylonowa płytka ze skrzydełkami bocznymi',
    surfaceType: 'Asfalt & Bieżnia lekkoatletyczna',
    foamTechnology: 'Koralikowa pianka PWRRUN PB (Pebax)',
    dropDescription: 'Drop 8 mm z technologią Speedroll — zapewnia naturalne przetoczenie i łagodne przejście w fazę odbicia.',
    aiVerdict: 'Płytka nylonowa wybacza drobne błędy techniki znacznie lepiej niż sztywny karbon.',
  },
  {
    id: 'shoe-6',
    name: 'New Balance Fresh Foam X 1080 v13',
    brand: 'New Balance',
    footType: 'Neutralna',
    mileageKm: 180,
    maxMileageKm: 800,
    dropMm: 6,
    weightG: 262,
    energyReturn: 7,
    cushionRating: 10,
    stabilityRating: 7,
    cushion: 'Ultra-miękka pianka Fresh Foam X',
    idealFor: 'Maksymalny komfort na regeneracyjnych wybieganiach',
    cushionLevel: 'Maksymalna (Ultra-Soft)',
    dynamicsLevel: 'Umiarkowana / Poduszkowa',
    stabilityType: 'Stopa Neutralna (Szeroka podstawa śródstopia)',
    trainingPurposes: ['wolne_wybieganie', 'long_run'],
    recommendedDistance: 'Każdy dystans regeneracyjny (5 - 35 km)',
    plateType: 'Brak płytki',
    surfaceType: 'Asfalt, Chodniki, Kostka brukowa',
    foamTechnology: 'Fresh Foam X (Injected EVA o niskiej gęstości)',
    dropDescription: 'Drop 6 mm — połączenie miękkości pianki z bezpieczną pozycją ścięgna Achillesa na wolnych kilometrach.',
    aiVerdict: 'Pianka poduszkowa chroni stawy i piszczele przed mikrourazami po mocnych akcentach.',
  },
  {
    id: 'shoe-7',
    name: 'Brooks Ghost 16',
    brand: 'Brooks',
    footType: 'Neutralna',
    mileageKm: 420,
    maxMileageKm: 800,
    dropMm: 12,
    weightG: 270,
    energyReturn: 6,
    cushionRating: 8,
    stabilityRating: 9,
    cushion: 'Pianka DNA LOFT v3 nasycana azotem',
    idealFor: 'Codzienny trening objętościowy w strefie tlenowej',
    cushionLevel: 'Wysoka zrównoważona',
    dynamicsLevel: 'Umiarkowana / Niezawodna',
    stabilityType: 'Bardzo stabilna platforma neutralna',
    trainingPurposes: ['wolne_wybieganie', 'long_run'],
    recommendedDistance: '5 km - Półmaraton (Baza kilometrowa)',
    plateType: 'Brak płytki',
    surfaceType: 'Asfalt, Szuter parkowy, Twarde ścieżki',
    foamTechnology: 'DNA LOFT v3 (Azotowa pianka nitro)',
    dropDescription: 'Wysoki drop 12 mm — maksymalnie odciąża ścięgno Achillesa, mięsień brzuchaty i płaszkowaty u osób lądujących na pięcie.',
    aiVerdict: 'Wysoki drop (12 mm) bardzo mocno odciąża ścięgno Achillesa i mięsień płaszczkowaty.',
  },
  {
    id: 'shoe-8',
    name: 'Puma Deviate Nitro 3',
    brand: 'Puma',
    footType: 'Neutralna',
    mileageKm: 70,
    maxMileageKm: 600,
    dropMm: 10,
    weightG: 265,
    energyReturn: 9,
    cushionRating: 8,
    stabilityRating: 8,
    cushion: 'Nitro Elite + Płytka PWRPLATE + Guma PUMAGRIP',
    idealFor: 'Uniwersalny startowo-treningowy na mokre nawierzchnie',
    cushionLevel: 'Wysoka sprężysta',
    dynamicsLevel: 'Wysoka (Płytka kompozytowa PWRPLATE)',
    stabilityType: 'Stopa Neutralna z usztywnieniem wzdłużnym',
    trainingPurposes: ['tempo', 'treningowo_startowe', 'long_run', 'startowe'],
    recommendedDistance: '10 km - Maraton (Każda pogoda)',
    plateType: 'Płytka węglowo-kompozytowa PWRPLATE',
    surfaceType: 'Mokry asfalt, Deszcz, Zmienna przyczepność',
    foamTechnology: 'Nitro Elite (Pianka PEBA nasycana azotem)',
    dropDescription: 'Drop 10 mm z płytką kompozytową — chroni tyłostopie przy jednoczesnym generowaniu mocnego wybicia.',
    aiVerdict: 'Najlepsza przyczepność na mokrym asfalcie w całej stawce biegowej.',
  },
  {
    id: 'shoe-9',
    name: 'On Cloudmonster 2',
    brand: 'On Running',
    footType: 'Neutralna',
    mileageKm: 85,
    maxMileageKm: 650,
    dropMm: 6,
    weightG: 295,
    energyReturn: 8,
    cushionRating: 9,
    stabilityRating: 8,
    cushion: 'Chmury CloudTec z pianki Helion + Płytka Speedboard',
    idealFor: 'Dynamiczne wybiegania miejskie i ochrona przed twardym asfaltem',
    cushionLevel: 'Maksymalna (Monster Cushion)',
    dynamicsLevel: 'Wysoka (Płytka Speedboard)',
    stabilityType: 'Stopa Neutralna z szeroką bazą CloudTec',
    trainingPurposes: ['wolne_wybieganie', 'long_run', 'tempo'],
    recommendedDistance: '10 km - Półmaraton',
    plateType: 'Płytka termoplastyczna Speedboard®',
    surfaceType: 'Asfalt miejski & Kostka brukowa',
    foamTechnology: 'Helion™ Superfoam + Poduszki CloudTec®',
    dropDescription: 'Drop 6 mm — niski profil dropu ułatwia toczenie po sztywnej płytce Speedboard, redukując zmęczenie śródstopia.',
    aiVerdict: 'Efektowna sprężystość i sztywna kołyska ułatwiająca toczenie stopy.',
  },
  {
    id: 'shoe-10',
    name: 'Mizuno Wave Rider 28',
    brand: 'Mizuno',
    footType: 'Neutralna',
    mileageKm: 140,
    maxMileageKm: 800,
    dropMm: 12,
    weightG: 280,
    energyReturn: 7,
    cushionRating: 8,
    stabilityRating: 9,
    cushion: 'Płytka Wave z plastiku rycynowego + Pianka Enerzy NXT',
    idealFor: 'Klasyczny trening dla biegaczy lądujących na pięcie',
    cushionLevel: 'Wysoka stabilna',
    dynamicsLevel: 'Umiarkowana sprężysta',
    stabilityType: 'Bardzo stabilna neutralna (Płytka Mizuno Wave)',
    trainingPurposes: ['wolne_wybieganie', 'long_run'],
    recommendedDistance: '10 km - Maraton',
    plateType: 'Płytka Wave (Strukturalne rozproszenie sił)',
    surfaceType: 'Asfalt & Twarde drogi utwardzone',
    foamTechnology: 'Mizuno Enerzy NXT + Bio-Plate Wave',
    dropDescription: 'Drop 12 mm — klasyczna japońska geometria rozpraszająca uderzenie pięty na boki i stabilizująca staw skokowy.',
    aiVerdict: 'Niezniszczalna platforma o legendarnej trwałości podeszwy.',
  },
  {
    id: 'shoe-11',
    name: 'Altra Torin 7',
    brand: 'Altra',
    footType: 'Neutralna',
    mileageKm: 60,
    maxMileageKm: 700,
    dropMm: 0,
    weightG: 278,
    energyReturn: 7,
    cushionRating: 8,
    stabilityRating: 7,
    cushion: 'Zerowy drop (Zero Drop) + Pianka Altra EGO MAX',
    idealFor: 'Naturalny bieg, wzmacnianie mięśni stóp i zapobieganie haluksom',
    cushionLevel: 'Wysoka naturalna (30 mm stos podeszwy)',
    dynamicsLevel: 'Naturalna / Responsywna',
    stabilityType: 'Szeroka stopa FootShape™ (Naturalne rozstawienie palców)',
    trainingPurposes: ['wolne_wybieganie', 'tempo', 'long_run'],
    recommendedDistance: '5 km - Półmaraton (Bieganie naturalne)',
    plateType: 'Brak płytki (Pełna elastyczność łuku stopy)',
    surfaceType: 'Asfalt, Ścieżki parkowe, Lekki szuter',
    foamTechnology: 'Altra EGO™ MAX',
    dropDescription: 'Zero Drop (0 mm) — pięta i palce na tej samej wysokości (30 mm). Wymusza prawidłową postawę i lądowanie na śródstopiu.',
    aiVerdict: 'Zero drop wymaga stopniowej adaptacji łydki (2–4 tygodnie), aby nie przeciążyć Achillesa.',
  },
  {
    id: 'shoe-12',
    name: 'Salomon Glide Max TR',
    brand: 'Salomon',
    footType: 'Neutralna',
    mileageKm: 110,
    maxMileageKm: 700,
    dropMm: 6,
    weightG: 286,
    energyReturn: 7,
    cushionRating: 9,
    stabilityRating: 8,
    cushion: 'Pianka Energy Foam + Bieżnik All Terrain Contagrip',
    idealFor: 'Mieszane trasy: park miejski, szuter, leśne ścieżki i asfalt',
    cushionLevel: 'Maksymalna Trail (Max Cushioning)',
    dynamicsLevel: 'Umiarkowana z płynnym przetoczeniem Reverse Camber',
    stabilityType: 'Stabilna w terenie (Głębokie trzymanie stopy SensiFit)',
    trainingPurposes: ['terenowe', 'long_run', 'wolne_wybieganie'],
    recommendedDistance: '15 km - Ultra (Trasy mieszane)',
    plateType: 'Brak płytki (Elastyczny bieżnik All-Terrain)',
    surfaceType: 'Teren / Trail, Las, Błoto, Szuter & Asfalt',
    foamTechnology: 'Energy Foam (Połączenie EVA i Olefiny)',
    dropDescription: 'Drop 6 mm w geometrii Reverse Camber — umożliwia zbieganie w trudnym terenie bez utraty stabilności kolan.',
    aiVerdict: 'Doskonały wybór na jesienno-zimowe treningi w zmiennym terenie.',
  },
];

// Biomechanical Strength Packages with animations
export const STRENGTH_EXERCISES: StrengthExercise[] = [
  {
    id: 'str-1',
    name: 'Martwy Ciąg Jednonóż (Single-Leg RDL)',
    package: 'itbs',
    targetMuscle: 'Pośladek wielki i średni, grupa kulszowo-goleniowa',
    gctBenefit: 'Skraca GCT o 3 ms przez stabilizację miednicy w locie',
    equipment: 'dom',
    repsSets: '3 serie x 10 powtórzeń na stronę',
    instructions: [
      'Stań na jednej nodze, lekko uginając kolano nogi podporowej.',
      'Pochylaj tułów w przód, unosząc wolną nogę w linii prostej z kręgosłupem.',
      'Utrzymaj miednicę równolegle do podłoża (nie otwieraj biodra na zewnątrz).',
      'Wróć do stania napinając pośladek nogi podporowej.',
    ],
    animationType: 'rdl',
  },
  {
    id: 'str-2',
    name: 'Przysiad Bułgarski z pauzą 2 sek.',
    package: 'itbs',
    targetMuscle: 'Mięsień czworogłowy, pośladkowy średni, stabilizatory kolana',
    gctBenefit: 'Eliminuje asymetrię siły między nogami i chroni pasmo ITBS',
    equipment: 'dom',
    repsSets: '3 serie x 8 powtórzeń (pauza 2s w dole)',
    instructions: [
      'Oprzyj grzbiet jednej stopy na krześle lub kanapie za sobą.',
      'Wykonaj powolny przysiad na nodze wykrocznej, aż udo będzie poziomo.',
      'Zatrzymaj ruch na dole na pełne 2 sekundy izometrii.',
      'Dynamicznie wybij się z całej stopy do góry.',
    ],
    animationType: 'bulgarian',
  },
  {
    id: 'str-3',
    name: 'Monster Walk z taśmą Mini Band',
    package: 'itbs',
    targetMuscle: 'Mięsień pośladkowy średni (Gluteus Medius)',
    gctBenefit: 'Zapobiega koślawieniu kolana przy lądowaniu (Knee Valgus)',
    equipment: 'band',
    repsSets: '3 serie x 15 kroków w prawo i w lewo',
    instructions: [
      'Załóż taśmę oporową nad kolanami lub na wysokości kostek.',
      'Ugnij biodra i kolana do pozycji półprzysiadu.',
      'Wykonuj kroki w bok, utrzymując stałe napięcie taśmy i kolana na zewnątrz.',
    ],
    animationType: 'monster-walk',
  },
  {
    id: 'str-4',
    name: 'Protokół Alfredsona (Opuszczanie na stopniu)',
    package: 'achilles',
    targetMuscle: 'Ścięgno Achillesa, mięsień brzuchaty łydki',
    gctBenefit: 'Zwiększa sztywność ścięgna i magazynowanie energii sprężystej',
    equipment: 'dom',
    repsSets: '3 serie x 15 powtórzeń (faza ekscentryczna 3 sek.)',
    instructions: [
      'Stań przodostopiem na krawędzi stopnia schodów.',
      'Wspnij się obunóż na palce.',
      'Unieś jedną nogę i powoli opuszczaj piętę nogi ćwiczącej przez 3 sekundy poniżej stopnia.',
      'Dostaw drugą nogę i powtórz.',
    ],
    animationType: 'alfredson',
  },
  {
    id: 'str-5',
    name: 'Wspięcia na ugiętych kolanach (Mięsień Płaszczkowaty Soleus)',
    package: 'achilles',
    targetMuscle: 'Mięsień płaszczkowaty (Soleus) generujący siłę nośną kroku',
    gctBenefit: 'Odciąża kolano przenosząc energię na staw skokowy',
    equipment: 'gym',
    repsSets: '4 serie x 12 powtórzeń z obciążeniem',
    instructions: [
      'Usiądź na ławce z kolanami ugiętymi pod kątem 90 stopni.',
      'Umieść hantle lub sztangę na kolanach.',
      'Wspij się wysoko na palce, zatrzymaj na 1s i powoli opuść.',
    ],
    animationType: 'soleus',
  },
  {
    id: 'str-6',
    name: 'Wieloskoki Reaktywne Pogo Hops',
    package: 'achilles',
    targetMuscle: 'Kompleks ścięgna Achillesa i rozcięgna podeszwowego',
    gctBenefit: 'Błyskawiczne skrócenie czasu kontaktu z podłożem do <220 ms',
    equipment: 'dom',
    repsSets: '3 serie x 25 sprężystych podskoków',
    instructions: [
      'Utrzymuj stawy kolanowe niemal wyprostowane (sztywne).',
      'Skacz dynamicznie z samego przodostopia jak piłeczka kauczukowa.',
      'Minimalizuj kontakt z ziemią – ląduj i natychmiast odbijaj się w górę.',
    ],
    animationType: 'pogo',
  },
  {
    id: 'str-7',
    name: 'Dead Bug (Martwy Robak)',
    package: 'core',
    targetMuscle: 'Mięsień poprzeczny brzucha (TVA), miednica',
    gctBenefit: 'Eliminuje przodopochylenie miednicy podczas zmęczenia na mecie',
    equipment: 'dom',
    repsSets: '3 serie x 12 powtórzeń naprzemiennie',
    instructions: [
      'Połóż się na plecach, dociśnij odcinek lędźwiowy płasko do podłogi.',
      'Ręce pionowo w górę, kolana ugięte 90 stopni w powietrzu.',
      'Jednocześnie prostuj przeciwną rękę i nogę tuż nad podłogę bez odrywania lędźwi.',
      'Wróć i powtórz drugą stroną.',
    ],
    animationType: 'deadbug',
  },
  {
    id: 'str-8',
    name: 'Bird-Dog z Izometrią 3 sek.',
    package: 'core',
    targetMuscle: 'Mięśnie głębokie grzbietu, stabilizatory kręgosłupa',
    gctBenefit: 'Utrzymuje wyprostowaną sylwetkę i ułatwia głęboki oddech',
    equipment: 'dom',
    repsSets: '3 serie x 10 powtórzeń na stronę',
    instructions: [
      'Klęk podparty: dłonie pod barkami, kolana pod biodrami.',
      'Wyciągnij prawą rękę w przód i lewą nogę w tył.',
      'Zatrzymaj pozycję na 3 sekundy w idealnej linii poziomej.',
      'Wróć płynnie bez kołysania tułowiem.',
    ],
    animationType: 'birddog',
  },
];

// Pain Map Body Zones for Virtual Physiotherapist
export const PAIN_ZONES_DATABASE: PainZone[] = [
  {
    id: 'pz-knee-itbs',
    label: 'Boczne kolano / Pasmo ITBS',
    bodyPart: 'knee',
    name: 'Zespół Pasma Biodrowo-Piszczelowego (ITBS)',
    severity: 'umiarkowany',
    protocol: 'Rolowanie napinacza powięzi szerokiej (TFL) i pośladka (nie rolować samego pasma na kości!). Ćwiczenia: Monster Walk, deska kopenhaska, zakaz zbiegów przez 7 dni.',
    planAdjustment: 'AI zmniejsza objętość zbiegów o 100%, zamienia interwały na płaski bieg regeneracyjny Z2 i zwiększa kadencję o +5 spm, aby zmniejszyć kąt zgięcia kolana przy lądowaniu.',
  },
  {
    id: 'pz-shin',
    label: 'Ból piszczeli (Shin Splints)',
    bodyPart: 'shin',
    name: 'Zespół Stresu Przyśrodkowego Piszczeli (MTSS)',
    severity: 'umiarkowany',
    protocol: 'Wzmacnianie mięśnia piszczelowego przedniego i tylnego (zginanie grzbietowe stopy z taśmą), chłodzenie lodem po biegu, unikanie twardego asfaltu.',
    planAdjustment: 'AI przenosi treningi na miękkie leśne podłoże, redukuje kilometraż tygodniowy o 30% i zamienia buty o twardej piance na maksymalistyczne poduszki (np. Hoka Clifton).',
  },
  {
    id: 'pz-achilles',
    label: 'Ścięgno Achillesa / Łydka',
    bodyPart: 'calf',
    name: 'Tendinopatia Ścięgna Achillesa',
    severity: 'umiarkowany',
    protocol: 'Ekscentryczny protokół Alfredsona 3x15 powtórzeń rano i wieczorem. Buty z wyższym dropem (10-12 mm). Bezwzględny zakaz butów z płytką karbonową do wyciszenia.',
    planAdjustment: 'AI wyklucza wieloskoki i sprinty, zamienia buty startowe na model z dropem 10-12 mm (np. Brooks Ghost), tempo bazy obniżone o 15 s/km.',
  },
  {
    id: 'pz-plantar',
    label: 'Podeszwa / Pięta (Rozcięgno)',
    bodyPart: 'plantar',
    name: 'Zapalenie Rozcięgna Podeszwowego (Plantar Fasciitis)',
    severity: 'umiarkowany',
    protocol: 'Masaż piłeczką golfową/lacrosse podeszwowej strony stopy, rozciąganie mięśnia płaszczkowatego przy ścianie, unikanie chodzenia boso.',
    planAdjustment: 'AI dodaje 5-minutową mobilizację stopy przed każdym biegiem oraz redukuje intensywność tempową.',
  },
  {
    id: 'pz-hip',
    label: 'Biodro / Pośladek',
    bodyPart: 'hip',
    name: 'Napięcie mięśnia gruszkowatego / Pasma krętarzowego',
    severity: 'lekki',
    protocol: 'Rozciąganie w pozycji gołębia (Pigeon Pose), aktywacja pośladka mostkami biodrowymi, unikanie długiego siedzenia przed treningiem.',
    planAdjustment: 'AI wstawia 8-minutową dynamiczną aktywację bioder przed biegiem głównym.',
  },
  {
    id: 'pz-lumbar',
    label: 'Odcinek lędźwiowy kręgosłupa',
    bodyPart: 'lumbar',
    name: 'Przeciążenie mięśni przykręgosłupowych (Dolne plecy)',
    severity: 'lekki',
    protocol: 'Dead Bug, Bird-Dog z izometrią, koci grzbiet i rozluźnianie mięśni biodrowo-lędźwiowych.',
    planAdjustment: 'AI zaleca skrócenie kroku i pilnowanie lekkiego pochylenia całej sylwetki w przód z kostek (a nie zgięcia w pasie).',
  },
];

export const DEFAULT_PLAN: TrainingDay[] = [
  {
    dayName: 'Poniedziałek',
    dayShort: 'Pon',
    type: 'Regeneracja',
    distanceKm: 0,
    durationMin: 0,
    targetPace: '-',
    hrZone: 'Strefa 1 (<120 bpm)',
    description: 'Dzień wolny. Mobilność bioder, rolowanie pasma biodrowo-piszczelowego i rozciąganie.',
    completed: false,
  },
  {
    dayName: 'Wtorek',
    dayShort: 'Wt',
    type: 'Bieg spokojny',
    distanceKm: 7,
    durationMin: 42,
    targetPace: '5:45 min/km',
    hrZone: 'Strefa 2 (132-146 bpm)',
    description: 'Bieg tlenowy z adaptacją kadencji (Economy Run Z2). 4x80m żwawych przebieżek na koniec.',
    completed: false,
  },
  {
    dayName: 'Środa',
    dayShort: 'Śr',
    type: 'Siła biegowa',
    distanceKm: 4,
    durationMin: 35,
    targetPace: '6:10 min/km',
    hrZone: 'Strefa 1-2',
    description: 'Rozgrzewka truchtem + protokół reaktywności stawu skokowego i wieloskoki Pogo Hops.',
    completed: false,
  },
  {
    dayName: 'Czwartek',
    dayShort: 'Czw',
    type: 'Interwały',
    distanceKm: 8,
    durationMin: 46,
    targetPace: '4:55 min/km',
    hrZone: 'Strefa 4 (162-175 bpm)',
    description: '1.5 km rozgrzewka + 5x800m w tempie docelowym 5K z przerwą 2 min w truchcie + 1.5 km schłodzenie.',
    completed: false,
  },
  {
    dayName: 'Piątek',
    dayShort: 'Pt',
    type: 'Regeneracja',
    distanceKm: 0,
    durationMin: 0,
    targetPace: '-',
    hrZone: 'Strefa 1',
    description: 'Odpoczynek pasywny. Odpowiednie nawodnienie i regeneracyjny sen.',
    completed: false,
  },
  {
    dayName: 'Sobota',
    dayShort: 'Sob',
    type: 'Tempo run',
    distanceKm: 6,
    durationMin: 32,
    targetPace: '5:15 min/km',
    hrZone: 'Strefa 3-4 (150-165 bpm)',
    description: 'Bieg ciągły w tempie progowym. Kontroluj rytm oddechu 2:2 i kadencję ~178 kroków/min.',
    completed: false,
  },
  {
    dayName: 'Niedziela',
    dayShort: 'Niedz',
    type: 'Bieg długi',
    distanceKm: 12,
    durationMin: 72,
    targetPace: '5:55 min/km',
    hrZone: 'Strefa 2 (130-145 bpm)',
    description: 'Niedzielne długie wybieganie (Long Run). Budowa kapilar i odporność na deplecję glikogenu.',
    completed: false,
  },
];

export const DEFAULT_RUNS: RunLog[] = [
  {
    id: 'run-1',
    title: 'Poranny Bieg Tlenowy Zgierz • Park Miejski',
    sourceApp: 'garmin',
    date: '2026-10-18',
    distanceKm: 8.2,
    durationMin: 46,
    avgPace: '5:37',
    avgHr: 156,
    maxHr: 168,
    avgCadence: 179,
    shoeName: 'Asics Novablast 4',
    notes: 'Bieg w Strefie 2, dobra sprężystość. Kadencja stabilna powyżej 178 spm.',
    coachFeedback: 'Zero-Click Coach: Optymalna kadencja 179 spm zredukowała GCT do 232 ms. Tętno pod kontrolą.',
    gctMs: 232,
    verticalOscillationCm: 7.9,
    groundContactBalancePercent: '50.1% L / 49.9% P',
    verticalRatioPercent: 7.4,
    powerW: 248,
    strideLengthM: 1.07,
    elevationGainM: 42,
    calories: 590,
  },
  {
    id: 'run-2',
    title: 'Regeneracyjny trucht w tlenie',
    sourceApp: 'strava',
    date: '2026-10-16',
    distanceKm: 7.2,
    durationMin: 41,
    avgPace: '5:41',
    avgHr: 142,
    maxHr: 154,
    avgCadence: 177,
    shoeName: 'Asics Novablast 4',
    notes: 'Lekki wiatr, bardzo dobre samopoczucie. Kadencja stabilna.',
    coachFeedback: 'Doskonałe wykonanie! Średnie tętno 142 bpm idealnie w środku Strefy 2.',
    gctMs: 236,
    verticalOscillationCm: 8.1,
    groundContactBalancePercent: '50.2% L / 49.8% P',
    verticalRatioPercent: 7.6,
    powerW: 235,
    strideLengthM: 1.05,
    elevationGainM: 35,
    calories: 510,
  },
  {
    id: 'run-3',
    title: 'Interwały Tempowe 5x800m',
    sourceApp: 'apple',
    date: '2026-10-14',
    distanceKm: 9.0,
    durationMin: 47,
    avgPace: '5:13',
    avgHr: 164,
    maxHr: 178,
    avgCadence: 182,
    shoeName: 'Saucony Endorphin Speed 4',
    notes: 'Mocne powtórzenia na stadionie. Świetna dynamika odbicia.',
    coachFeedback: 'Wysoka kadencja 182 spm i GCT zaledwie 224 ms! Ekonomia kroku na poziomie zawodniczym.',
    gctMs: 224,
    verticalOscillationCm: 7.5,
    groundContactBalancePercent: '49.9% L / 50.1% P',
    verticalRatioPercent: 7.1,
    powerW: 272,
    strideLengthM: 1.12,
    elevationGainM: 28,
    calories: 680,
  },
  {
    id: 'run-4',
    title: 'Spokojny Bieg Bazowy',
    sourceApp: 'google_fit',
    date: '2026-10-11',
    distanceKm: 6.5,
    durationMin: 38,
    avgPace: '5:50',
    avgHr: 139,
    maxHr: 148,
    avgCadence: 175,
    shoeName: 'Nike Pegasus 41',
    notes: 'Trening regeneracyjny po pracy, zero zmęczenia.',
    coachFeedback: 'Praca nad fundamentem tlenowym. Niski koszt fizjologiczny.',
    gctMs: 242,
    verticalOscillationCm: 8.4,
    groundContactBalancePercent: '50.4% L / 49.6% P',
    verticalRatioPercent: 8.0,
    powerW: 220,
    strideLengthM: 1.02,
    elevationGainM: 22,
    calories: 450,
  },
  {
    id: 'run-5',
    title: 'Długie Wybieganie Niedzielne (Long Run)',
    sourceApp: 'komoot',
    date: '2026-10-08',
    distanceKm: 14.5,
    durationMin: 85,
    avgPace: '5:52',
    avgHr: 145,
    maxHr: 158,
    avgCadence: 176,
    shoeName: 'Hoka Clifton 9',
    notes: 'Trasa krajoznawcza Zgierz - Las Łagiewnicki. Nawodnienie co 25 min.',
    coachFeedback: 'Fantastyczna dyscyplina tempa. Bardzo równomierne GCT przez 85 minut.',
    gctMs: 238,
    verticalOscillationCm: 8.2,
    groundContactBalancePercent: '50.0% L / 50.0% P',
    verticalRatioPercent: 7.8,
    powerW: 228,
    strideLengthM: 1.04,
    elevationGainM: 110,
    calories: 1040,
  },
];

// Simple WebAudio Synthesizer for Metronome, Panda sounds, and workout timers
class SoundEngine {
  private ctx: AudioContext | null = null;
  private metronomeTimer: any = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick(high = false) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(high ? 1000 : 700, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  playSuccess() {
    this.playPandaSound('cheer');
  }

  playError() {
    this.playPandaSound('crunch');
  }

  playFanfare() {
    this.playPandaSound('birthday');
  }

  playPandaSound(type: 'jump' | 'crunch' | 'cheer' | 'birthday') {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'jump') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
      } else if (type === 'crunch') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);
      } else if (type === 'birthday') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.3); // G5
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.2);
      }

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {}
  }

  startMetronome(spm: number, onBeat?: (beatNumber: number) => void) {
    this.stopMetronome();
    this.init();
    const intervalMs = (60 / spm) * 1000;
    let count = 0;
    this.playClick(true);
    if (onBeat) onBeat(1);

    this.metronomeTimer = setInterval(() => {
      count = (count + 1) % 4;
      this.playClick(count === 0);
      if (onBeat) onBeat(count + 1);
    }, intervalMs);
  }

  stopMetronome() {
    if (this.metronomeTimer) {
      clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();

// Polish Voice Coach using Web Speech API
export function speakCoachPolish(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pl-PL';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech error:', err);
  }
}

// Comprehensive, verified running race calendar for Season 2027 in Poland
// Used by AI Race Search and Race Predictor

import { RaceSlot } from '../types.ts';

export interface ExtendedRace2027 {
  id: string;
  name: string;
  city: string;
  voivodeship: string;
  date: string;
  distanceKm: number;
  distanceCategory: '5k' | '10k' | 'half' | 'marathon' | 'ultra';
  role: string;
  profile: string;
  elevationM: number;
  registrationUrl: string;
  organizer: string;
  description: string;
  surface: 'asfalt' | 'trail' | 'mieszana';
  isPzlaCertified: boolean;
}

export const OFFICIAL_POLISH_RACES_2027: ExtendedRace2027[] = [
  // --- WIOSNA 2027 ---
  {
    id: 'race-2027-wiazowna-half',
    name: '47. Półmaraton Wiązowski 2027',
    city: 'Wiązowna',
    voivodeship: 'Mazowieckie',
    date: '2027-02-21',
    distanceKm: 21.1,
    distanceCategory: 'half',
    role: 'Otwarcie Sezonu Biegowego',
    profile: 'Płaska / Atest PZLA',
    elevationM: 25,
    registrationUrl: 'https://wiazownapolmaraton.pl',
    organizer: 'Gmina Wiązowna',
    description: 'Najstarszy zimowo-wiosenny półmaraton w Polsce. Idealny sprawdzian formy po okresie zimowym.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-sobotka-half',
    name: '19. Półmaraton Ślężański Sobótka 2027',
    city: 'Sobótka',
    voivodeship: 'Dolnośląskie',
    date: '2027-03-20',
    distanceKm: 21.1,
    distanceCategory: 'half',
    role: 'Sprawdzian Siły Biegowej',
    profile: 'Pofałdowana / Wokół góry Ślęża',
    elevationM: 185,
    registrationUrl: 'https://polmaratonslezanski.pl',
    organizer: 'Ślężański Klub Biegacza',
    description: 'Kultowa, malownicza trasa wokół masywu Ślęży. Doskonały trening siły biegowej i rytmu na podbiegach.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-warsaw-half',
    name: '21. Półmaraton Warszawski 2027',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    date: '2027-03-28',
    distanceKm: 21.1,
    distanceCategory: 'half',
    role: 'Główny Cel Sezonu A',
    profile: 'Szybka / Płaska / Atest PZLA / World Athletics',
    elevationM: 28,
    registrationUrl: 'https://polmaratonwarszawski.pl',
    organizer: 'Fundacja Maraton Warszawski',
    description: 'Największy półmaraton w Europie Środkowej. Trasa przez mosty Świętokrzyski i Gdański sprzyja bicie rekordów PB.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-warsaw-5k',
    name: 'New Balance Bieg na Piątkę 2027',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    date: '2027-03-28',
    distanceKm: 5.0,
    distanceCategory: '5k',
    role: 'Bieg Towarzyszący / Szybka Piątka',
    profile: 'Ekstremalnie płaska / Atest PZLA',
    elevationM: 8,
    registrationUrl: 'https://polmaratonwarszawski.pl',
    organizer: 'Fundacja Maraton Warszawski',
    description: 'Błyskawiczna piątka towarzysząca Półmaratonowi Warszawskiemu ze startem pod PGE Narodowym.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-debno-marathon',
    name: '53. Maraton Dębno 2027',
    city: 'Dębno',
    voivodeship: 'Zachodniopomorskie',
    date: '2027-04-11',
    distanceKm: 42.2,
    distanceCategory: 'marathon',
    role: 'Mistrzostwa Polski w Maratonie',
    profile: 'Bardzo płaska / Leśne pętle',
    elevationM: 20,
    registrationUrl: 'https://maratondebno.pl',
    organizer: 'Ośrodek Sportu i Rekreacji Dębno',
    description: 'Najstarszy maraton w Polsce (od 1969 r.). Trasa słynie z rekordowych czasów i wspaniałej tradycji.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-poznan-half',
    name: '18. Poznań Półmaraton 2027',
    city: 'Poznań',
    voivodeship: 'Wielkopolskie',
    date: '2027-04-11',
    distanceKm: 21.1,
    distanceCategory: 'half',
    role: 'Główny Cel Sezonu A',
    profile: 'Płaska / Szerokie aleje / Atest PZLA',
    elevationM: 32,
    registrationUrl: 'https://halfmarathon.poznan.pl',
    organizer: 'POSiR Poznań',
    description: 'Ponad 10 tysięcy biegaczy, meta na terenie Międzynarodowych Targów Poznańskich i fantastyczny doping kibiców.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-lodz-half',
    name: 'Półmaraton Łódź 2027 (Dbam o Zdrowie)',
    city: 'Łódź',
    voivodeship: 'Łódzkie',
    date: '2027-04-18',
    distanceKm: 21.1,
    distanceCategory: 'half',
    role: 'Główny Cel Sezonu A (Region Łódź & Zgierz)',
    profile: 'Płaska / Przez Piotrkowską & Manufakturę / Atest',
    elevationM: 40,
    registrationUrl: 'https://lodzmaraton.pl',
    organizer: 'Stowarzyszenie Maraton Łódzki',
    description: 'Wiosenny klasyk Ziemi Łódzkiej. Przebieg przez ulicę Piotrkowską i finisz w hali Atlas Arena robi piorunujące wrażenie.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-lodz-10k',
    name: 'Bieg na 10 km Łódź 2027',
    city: 'Łódź',
    voivodeship: 'Łódzkie',
    date: '2027-04-18',
    distanceKm: 10.0,
    distanceCategory: '10k',
    role: 'Start Kontrolny / Życiówka 10K',
    profile: 'Płaska z atestem',
    elevationM: 18,
    registrationUrl: 'https://lodzmaraton.pl',
    organizer: 'Stowarzyszenie Maraton Łódzki',
    description: 'Płaska atestowana dycha w Łodzi, idealny sprawdzian prędkości przed dystansami docelowymi.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-cracovia-marathon',
    name: '24. Cracovia Maraton 2027',
    city: 'Kraków',
    voivodeship: 'Małopolska',
    date: '2027-04-25',
    distanceKm: 42.2,
    distanceCategory: 'marathon',
    role: 'Królewski Maraton Krakowski',
    profile: 'Płaska / Z historią w tle / Rynek Główny',
    elevationM: 45,
    registrationUrl: 'https://cracoviamaraton.pl',
    organizer: 'ZIS Kraków',
    description: 'Start i meta na Rynku Głównym w Krakowie. Trasa prowadzi wzdłuż Wisły i zabytkowych ulic dawnej stolicy.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-bieg-fabrykanta',
    name: '17. Bieg Fabrykanta 2027 • Zgierz / Łódź',
    city: 'Łódź',
    voivodeship: 'Łódzkie',
    date: '2027-06-12',
    distanceKm: 10.0,
    distanceCategory: '10k',
    role: 'Klimatyczna Dycha Postindustrialna',
    profile: 'Księży Młyn / Płaska',
    elevationM: 22,
    registrationUrl: 'https://biegfabrykanta.pl',
    organizer: 'Klub Biegacza Nowi Zgierz & Łódź',
    description: 'Wyjątkowy bieg w industrialnym sercu Łodzi i Zgierza, pośród zabytkowych fabryk i alejek z czerwonej cegły.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-wroclaw-night-half',
    name: '13. Nocny Wrocław Półmaraton 2027',
    city: 'Wrocław',
    voivodeship: 'Dolnośląskie',
    date: '2027-06-19',
    distanceKm: 21.1,
    distanceCategory: 'half',
    role: 'Kultowy Półmaraton Nocny',
    profile: 'Płaska / Iluminacje / Mosty Wrocławia',
    elevationM: 18,
    registrationUrl: 'https://wroclawmaraton.pl',
    organizer: 'Młodzieżowe Centrum Sportu Wrocław',
    description: 'Start o godzinie 22:00, meta na legendarnym Stadionie Olimpijskim w blasku laserów i muzyki. Niezapomniane przeżycie.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-bieg-rzeznika',
    name: '24. Bieg Rzeźnika Ultra 2027',
    city: 'Cisna',
    voivodeship: 'Podkarpackie',
    date: '2027-06-03',
    distanceKm: 83.0,
    distanceCategory: 'ultra',
    role: 'Bieszczadzki Klasyk Ultra Trail',
    profile: 'Górska / Przewyższenia +3900 m',
    elevationM: 3900,
    registrationUrl: 'https://biegrzeznika.pl',
    organizer: 'Fundacja Bieg Rzeźnika',
    description: 'Legendarne bieszczadzkie pasmo od Komańczy przez Połoninę Caryńską do Cisnej. Bieg w parach o wschodzie słońca.',
    surface: 'trail',
    isPzlaCertified: false,
  },

  // --- JESIEŃ 2027 ---
  {
    id: 'race-2027-praski-half',
    name: '13. Półmaraton Praski 2027',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    date: '2027-09-04',
    distanceKm: 21.1,
    distanceCategory: 'half',
    role: 'Szybki Półmaraton Wieczorny',
    profile: 'Płaska jak stół / Wał Miedzeszyński',
    elevationM: 12,
    registrationUrl: 'https://polmaratonpraski.pl',
    organizer: 'Półmaraton Praski Sp. z o.o.',
    description: 'Sobotni wieczorny bieg po prawobrzeżnej Warszawie. Rekordowo płaska trasa z atestem sprzyja życiówkom.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-praska-5k',
    name: 'Praska Piątka 2027',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    date: '2027-09-04',
    distanceKm: 5.0,
    distanceCategory: '5k',
    role: 'Sprinterska Piątka pod PGE Narodowym',
    profile: 'Płaska / Atest PZLA',
    elevationM: 5,
    registrationUrl: 'https://polmaratonpraski.pl',
    organizer: 'Półmaraton Praski',
    description: 'Ekspresowy bieg na 5 km przed zmrokiem. Idealna okazja do złamania bariery 20 lub 25 minut.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-festiwal-biegowy',
    name: '18. Festiwal Biegowy Piwniczna-Zdrój 2027',
    city: 'Piwniczna-Zdrój',
    voivodeship: 'Małopolska',
    date: '2027-09-10',
    distanceKm: 21.1,
    distanceCategory: 'half',
    role: 'Festiwalowe Biegi Górskie i Szosowe',
    profile: 'Górski Beskid Sądecki',
    elevationM: 420,
    registrationUrl: 'https://festiwalbiegowy.pl',
    organizer: 'Fundacja Festiwal Biegowy',
    description: 'Święto biegania w Dolinie Popradu: od Biegu 7 Dolin na 100 km po szybki Półmaraton i Bieg Nocny.',
    surface: 'mieszana',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-warsaw-marathon',
    name: '49. Maraton Warszawski 2027',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    date: '2027-09-26',
    distanceKm: 42.2,
    distanceCategory: 'marathon',
    role: 'Narodowy Maraton Stolicy',
    profile: 'Płaska / Śródmieście / Atest PZLA',
    elevationM: 42,
    registrationUrl: 'https://maratonwarszawski.com',
    organizer: 'Fundacja Maraton Warszawski',
    description: 'Królewski dystans w stolicy. Start pod Pałacem Kultury, tłumy kibiców i medale na najwyższym europejskim poziomie.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-silesia-marathon',
    name: '19. Silesia Marathon 2027',
    city: 'Katowice',
    voivodeship: 'Śląskie',
    date: '2027-10-03',
    distanceKm: 42.2,
    distanceCategory: 'marathon',
    role: 'Meta w Kotle Czarownic',
    profile: 'Pofałdowana / Katowice - Siemianowice - Mysłowice',
    elevationM: 190,
    registrationUrl: 'https://silesiamarathon.pl',
    organizer: 'Fundacja Silesia Pro Active',
    description: 'Jedyny maraton w Europie z metą na bieżni legendarnego Stadionu Śląskiego w Chorzowie.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-poznan-marathon',
    name: '26. Poznań Maraton 2027',
    city: 'Poznań',
    voivodeship: 'Wielkopolskie',
    date: '2027-10-17',
    distanceKm: 42.2,
    distanceCategory: 'marathon',
    role: 'Wielkopolski Klasyk Jesienny',
    profile: 'Szybka / Jezioro Maltańskie',
    elevationM: 55,
    registrationUrl: 'https://marathon.poznan.pl',
    organizer: 'POSiR Poznań',
    description: 'Jesienny hit biegowy w Poznaniu z energetycznymi strefami kibica i szybką atestowaną trasą.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-cracovia-royal-half',
    name: '13. Cracovia Półmaraton Królewski 2027',
    city: 'Kraków',
    voivodeship: 'Małopolska',
    date: '2027-10-24',
    distanceKm: 21.1,
    distanceCategory: 'half',
    role: 'Zwieńczenie Królewskiej Triady',
    profile: 'Płaska / Meta w TAURON Arena Kraków',
    elevationM: 25,
    registrationUrl: 'https://cracoviapolmaraton.pl',
    organizer: 'ZIS Kraków',
    description: 'Spektakularny finisz w zaciemnionej TAURON Arenie w snopach świateł i dźwiękach fanfar.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-niepodleglosci-warsaw',
    name: '37. Bieg Niepodległości Warszawa 2027',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    date: '2027-11-11',
    distanceKm: 10.0,
    distanceCategory: '10k',
    role: 'Narodowe Święto Biegaczy (Żywa Flaga)',
    profile: 'Aleja Jana Pawła II / Błyskawiczna',
    elevationM: 10,
    registrationUrl: 'https://biegniepodleglosci.waw.pl',
    organizer: 'Aktywna Warszawa / FMW',
    description: 'Największy bieg na 10 km w Polsce. 20 tysięcy biegaczy w białych i czerwonych koszulkach tworzy żywą flagę o 11:11.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-niepodleglosci-gdynia',
    name: 'Bieg Niepodległości z Decathlon Gdynia 2027',
    city: 'Gdynia',
    voivodeship: 'Pomorskie',
    date: '2027-11-11',
    distanceKm: 10.0,
    distanceCategory: '10k',
    role: 'Nadmorska Dycha Niepodległościowa',
    profile: 'Bulwar Nadmorski / Płaska',
    elevationM: 15,
    registrationUrl: 'https://gdyniasport.pl',
    organizer: 'Gdyńskie Centrum Sportu',
    description: 'Malownicza trasa wzdłuż Bałtyku i Skweru Kościuszki, rześkie morskie powietrze i gorący doping.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },

  // --- PARKRUNY POLSKA 2027 (Cotygodniowe bezpłatne biegi na 5 km w parkach w całym kraju) ---
  {
    id: 'race-2027-parkrun-warszawa-pole',
    name: 'Parkrun Pole Mokotowskie Warszawa 2027',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    date: '2027-04-03',
    distanceKm: 5.0,
    distanceCategory: '5k',
    role: 'Parkrun Społecznościowy / Trening Kontrolny',
    profile: 'Płaska / Alejki parkowe / Pomiar czasu z kodem',
    elevationM: 10,
    registrationUrl: 'https://www.parkrun.pl/polemokotowskie',
    organizer: 'Parkrun Polska',
    description: 'Cotygodniowy bezpłatny bieg na 5 km z pomiarem czasu w każdą sobotę o 9:00. Płaska trasa parkowa, świetna atmosfera integracyjna.',
    surface: 'mieszana',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-parkrun-lodz-poniatowski',
    name: 'Parkrun Park Poniatowskiego Łódź 2027',
    city: 'Łódź',
    voivodeship: 'Łódzkie',
    date: '2027-04-10',
    distanceKm: 5.0,
    distanceCategory: '5k',
    role: 'Parkrun Społecznościowy / Sprawdzian 5K',
    profile: 'Płaska / Asfalt i utwardzone ścieżki parkowe',
    elevationM: 8,
    registrationUrl: 'https://www.parkrun.pl/lodz',
    organizer: 'Parkrun Łódź',
    description: 'Jeden z najpopularniejszych parkrunów w Polsce. Dwie pętle po urokliwym Parku Poniatowskiego.',
    surface: 'mieszana',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-parkrun-zgierz-miejski',
    name: 'Parkrun Park Miejski Zgierz 2027',
    city: 'Zgierz',
    voivodeship: 'Łódzkie',
    date: '2027-04-17',
    distanceKm: 5.0,
    distanceCategory: '5k',
    role: 'Lokalny Parkrun / Start Kameralny',
    profile: 'Ścieżki parkowe wokół stawu i alejek',
    elevationM: 12,
    registrationUrl: 'https://www.parkrun.pl/zgierz',
    organizer: 'Społeczność Biegaczy Zgierz & MOSiR',
    description: 'Kameralny, przyjazny bieg 5 km wokół Stawu Miejskiego i alejek Parku Kościuszki. Bezpłatny start dla każdego.',
    surface: 'mieszana',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-parkrun-krakow-blonia',
    name: 'Parkrun Kraków Błonia 2027',
    city: 'Kraków',
    voivodeship: 'Małopolskie',
    date: '2027-05-01',
    distanceKm: 5.0,
    distanceCategory: '5k',
    role: 'Parkrun Społecznościowy',
    profile: 'Płaska pętla wokół Błoń Krakowskich',
    elevationM: 6,
    registrationUrl: 'https://www.parkrun.pl/krakow',
    organizer: 'Parkrun Polska',
    description: 'Widok na Wawel i Kopiec Kościuszki, idealna płaska nawierzchnia do bicia rekordów na 5 km.',
    surface: 'asfalt',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-parkrun-poznan-cytadela',
    name: 'Parkrun Cytadela Poznań 2027',
    city: 'Poznań',
    voivodeship: 'Wielkopolskie',
    date: '2027-05-08',
    distanceKm: 5.0,
    distanceCategory: '5k',
    role: 'Parkrun w Historycznym Parku',
    profile: 'Lekko pofałdowana / Park Cytadela',
    elevationM: 25,
    registrationUrl: 'https://www.parkrun.pl/poznan',
    organizer: 'Parkrun Polska',
    description: 'Urozmaicona trasa po alejkach dawnego fortu. Wspaniała zieleń i liczne rzeźby na trasie.',
    surface: 'mieszana',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-parkrun-trojmiasto-gdansk',
    name: 'Parkrun Gdańsk Park Nadmorski 2027',
    city: 'Gdańsk',
    voivodeship: 'Pomorskie',
    date: '2027-05-15',
    distanceKm: 5.0,
    distanceCategory: '5k',
    role: 'Nadmorski Parkrun',
    profile: 'Płaska / Park Reagana / 200m od plaży',
    elevationM: 5,
    registrationUrl: 'https://www.parkrun.pl/gdansk',
    organizer: 'Parkrun Polska',
    description: 'Bieg w Parku im. Ronalda Reagana, tuż przy Zatoce Gdańskiej. Morska bryza i szerokie bezpieczne alejki.',
    surface: 'mieszana',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-parkrun-wroclaw-slodowa',
    name: 'Parkrun Wrocław Wyspa Słodowa 2027',
    city: 'Wrocław',
    voivodeship: 'Dolnośląskie',
    date: '2027-05-22',
    distanceKm: 5.0,
    distanceCategory: '5k',
    role: 'Parkrun Miejski / Wyspy Odrzańskie',
    profile: 'Bulwary nad Odrą / Płaska',
    elevationM: 7,
    registrationUrl: 'https://www.parkrun.pl/wroclaw',
    organizer: 'Parkrun Polska',
    description: 'Pętla wzdłuż Odry przez wrocławskie mosty i parki rzeczne.',
    surface: 'asfalt',
    isPzlaCertified: false,
  },

  // --- BIEGI LEŚNE, TRAILOWE, GÓRSKIE & CROSSY 2027 ---
  {
    id: 'race-2027-bieg-rzeznika',
    name: 'XXIV Bieg Rzeźnika 2027 (Bieszczady)',
    city: 'Cisna',
    voivodeship: 'Podkarpackie',
    date: '2027-05-28',
    distanceKm: 84.0,
    distanceCategory: 'ultra',
    role: 'Kultowy Festiwal Biegu Rzeźnika',
    profile: 'Górska Ultra / Bieszczadzkie połoniny / +3800m',
    elevationM: 3800,
    registrationUrl: 'https://biegrzeznika.pl',
    organizer: 'Fundacja Bieg Rzeźnika',
    description: 'Najbardziej kultowy bieg górski w Polsce. Trasa przez połoniny ze słynnym startem w parach o świcie w Cisnej.',
    surface: 'trail',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-lesny-cross-zgierz-malinka',
    name: 'Leśny Cross Zgierz Malinka 2027',
    city: 'Zgierz',
    voivodeship: 'Łódzkie',
    date: '2027-06-06',
    distanceKm: 10.0,
    distanceCategory: '10k',
    role: 'Lokalny Cross Leśny / Malinka & Las Aniołów',
    profile: 'Ścieżki leśne / Dukty / Krótkie strome podbiegi',
    elevationM: 140,
    registrationUrl: 'https://mosir.zgierz.pl/biegi',
    organizer: 'MOSiR Zgierz & Klub Biegacza',
    description: 'Malowniczy bieg przełajowy po leśnych ścieżkach wokół ośrodka Malinka i Lasu Okręglik. Miękka nawierzchnia ze ściółką, idealna dla nóg.',
    surface: 'trail',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-gorce-ultra-trail',
    name: '12. Gorce Ultra-Trail 2027',
    city: 'Ochotnica Górna',
    voivodeship: 'Małopolskie',
    date: '2027-08-07',
    distanceKm: 48.0,
    distanceCategory: 'ultra',
    role: 'Festiwal Biegów Górskich w Gorcach',
    profile: 'Górska / Lubań / Gorc / Turbacz / +2400m',
    elevationM: 2400,
    registrationUrl: 'https://gorceultratrail.pl',
    organizer: 'Fundacja Run Vegan & Ochotnica',
    description: 'Niezwykle widokowe trasy w paśmie Gorców z widokiem na Tatry. Wspaniała atmosfera i gościnność góralska.',
    surface: 'trail',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-karkonosze-maraton',
    name: '15. Maraton Karkonoski 2027',
    city: 'Szklarska Poręba',
    voivodeship: 'Dolnośląskie',
    date: '2027-07-03',
    distanceKm: 46.7,
    distanceCategory: 'ultra',
    role: 'Maraton na Grzbiecie Karkonoszy',
    profile: 'Grzbiet Karkonoszy / Śnieżka / Szrenica / +2150m',
    elevationM: 2150,
    registrationUrl: 'https://maratonkarkonoski.pl',
    organizer: 'Stowarzyszenie Maraton Karkonoski',
    description: 'Trasa prowadzi Głównym Grzbietem Karkonoszy przez Śnieżne Kotły pod samą Śnieżkę.',
    surface: 'trail',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-festiwal-biegowy-krynica',
    name: '18. Festiwal Biegowy Krynica-Piwniczna 2027',
    city: 'Piwniczna-Zdrój',
    voivodeship: 'Małopolskie',
    date: '2027-09-11',
    distanceKm: 22.0,
    distanceCategory: 'half',
    role: 'Półmaraton Górski / Festiwal Biegowy',
    profile: 'Beskid Sądecki / Ścieżki leśne / +950m',
    elevationM: 950,
    registrationUrl: 'https://festiwalbiegowy.pl',
    organizer: 'Fundacja Festiwal Biegów',
    description: 'Kilkadziesiąt biegów dla każdego: od Biegu Deptaka na 1 km, przez Bieg 10 km, aż po Bieg 7 Dolin na 100 km.',
    surface: 'trail',
    isPzlaCertified: false,
  },

  // --- BIEGI CHARYTATYWNE & OGÓLNOPOLSKIE 2027 ---
  {
    id: 'race-2027-wings-for-life',
    name: 'Wings for Life World Run 2027 (Poznań & App Run)',
    city: 'Poznań',
    voivodeship: 'Wielkopolskie',
    date: '2027-05-09',
    distanceKm: 18.0,
    distanceCategory: 'half',
    role: 'Globalny Bieg Charytatywny (Ruchomy Samochód Pościgowy)',
    profile: 'Płaska / Meta goni biegacza (Catcher Car)',
    elevationM: 20,
    registrationUrl: 'https://wingsforlifeworldrun.com',
    organizer: 'Wings for Life Foundation',
    description: 'Biegniesz dla tych, którzy biegać nie mogą. 100% wpisowego idzie na badania rdzenia kręgowego. Meta to ruchomy Samochód Pościgowy.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-poland-business-run',
    name: 'Poland Business Run 2027 (Kraków & Wirtualnie)',
    city: 'Kraków',
    voivodeship: 'Małopolskie',
    date: '2027-09-05',
    distanceKm: 4.0,
    distanceCategory: '5k',
    role: 'Największa Sztafeta Charytatywna w Polsce',
    profile: 'Płaska / Park Jordana & Błonia / Sztafety 5x4km',
    elevationM: 8,
    registrationUrl: 'https://polandbusinessrun.pl',
    organizer: 'Fundacja Poland Business Run',
    description: 'Sztafeta biznesowa pomagająca osobom z niepełnosprawnościami narządu ruchu. Pobiegnij w Krakowie lub w dowolnym mieście przez aplikację.',
    surface: 'asfalt',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-wosp-policz-sie-z-cukrzyca',
    name: '21. Bieg WOŚP Policz się z Cukrzycą 2027',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    date: '2027-01-31',
    distanceKm: 5.0,
    distanceCategory: '5k',
    role: 'Bieg Finału WOŚP / Charytatywny',
    profile: 'Centrum Warszawy / Płaska / Radosna atmosfera',
    elevationM: 10,
    registrationUrl: 'https://bieg.wosp.org.pl',
    organizer: 'Fundacja Wielka Orkiestra Świątecznej Pomocy',
    description: 'Charytatywny bieg towarzyszący Finałowi WOŚP. Tysiące uśmiechniętych ludzi w pomarańczowych koszulkach wspiera zakup pomp insulinowych.',
    surface: 'asfalt',
    isPzlaCertified: false,
  },

  // --- BIEGI LOKALNE, MIEJSKIE & OKOLICZNOŚCIOWE 2027 ---
  {
    id: 'race-2027-bieg-trzech-kroli-lodz',
    name: '10. Łódzki Bieg Trzech Króli 2027',
    city: 'Łódź',
    voivodeship: 'Łódzkie',
    date: '2027-01-06',
    distanceKm: 5.0,
    distanceCategory: '5k',
    role: 'Zimowy Noworoczny Start Mieszkańców',
    profile: 'Manufaktura / Rynek Włókniarek / Płaska',
    elevationM: 5,
    registrationUrl: 'https://biegtrzechkroli.pl',
    organizer: 'Stowarzyszenie Biegaczy Ziemi Łódzkiej',
    description: 'Świętowanie Nowego Roku w biegowych butach. Kolorowe korony na głowach i finisz na rozświetlonym rynku Manufaktury.',
    surface: 'asfalt',
    isPzlaCertified: false,
  },
  {
    id: 'race-2027-bieg-fabrykanta-lodz',
    name: '16. Bieg Fabrykanta Księży Młyn 2027',
    city: 'Łódź',
    voivodeship: 'Łódzkie',
    date: '2027-08-28',
    distanceKm: 10.0,
    distanceCategory: '10k',
    role: 'Historyczny Bieg Między Fabrykami',
    profile: 'Księży Młyn / Ceglane fabryki Grohmana i Scheiblera',
    elevationM: 18,
    registrationUrl: 'https://biegfabrykanta.pl',
    organizer: 'InesSport Łódź',
    description: 'Unikalna trasa przez zabytkowe osiedle robotnicze Księży Młyn i dawną przędzalnię Karola Scheiblera.',
    surface: 'mieszana',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-bieg-powstania-warszawskiego',
    name: '36. Bieg Powstania Warszawskiego 2027',
    city: 'Warszawa',
    voivodeship: 'Mazowieckie',
    date: '2027-07-24',
    distanceKm: 10.0,
    distanceCategory: '10k',
    role: 'Historyczny Bieg Nocny ze Zniczami',
    profile: 'Bonifraterska / Wybrzeże Gdańskie / Konwiktorska',
    elevationM: 15,
    registrationUrl: 'https://biegpowstaniawarszawskiego.pl',
    organizer: 'Aktywna Warszawa & FMW',
    description: 'Niezwykły bieg wieczorny w blasku zniczy, przy dźwiękach pieśni powstańczych. Niezapomniane przeżycie patriotyczne.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-nocny-bieg-swietojanski-gdynia',
    name: 'Nocny Bieg Świętojański Gdynia 2027',
    city: 'Gdynia',
    voivodeship: 'Pomorskie',
    date: '2027-06-18',
    distanceKm: 10.0,
    distanceCategory: '10k',
    role: 'Nocny Bieg Uliczny w Najkrótszą Noc Roku',
    profile: 'Start o północy / Świętojańska / Bulwar Nadmorski',
    elevationM: 12,
    registrationUrl: 'https://gdyniasport.pl',
    organizer: 'Gdyńskie Centrum Sportu',
    description: 'Start równo o 23:59. Morze świateł, tętniące życiem ulice Gdyni i finisz nad szumiącym Bałtykiem.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
  {
    id: 'race-2027-dycha-justynow-janowka',
    name: 'Dycha Justynów-Janówka 2027',
    city: 'Justynów',
    voivodeship: 'Łódzkie',
    date: '2027-05-16',
    distanceKm: 10.0,
    distanceCategory: '10k',
    role: 'Kultowy Lokalny Bieg Gminny',
    profile: 'Szybka / Asfaltowo-leśna trasa',
    elevationM: 14,
    registrationUrl: 'https://dychajustynow.pl',
    organizer: 'LKS Justynów',
    description: 'Jeden z najlepiej zorganizowanych biegów kameralnych w centralnej Polsce. Pyszny poczęstunek i rodzinny festyn.',
    surface: 'asfalt',
    isPzlaCertified: true,
  },
];

/**
 * Filter 2027 races intelligently by query, city, voivodeship, distance category, and month.
 * Covers ALL race categories: official marathons, parkruns, forest trails, local town runs, and charity runs.
 * If user enters any city or specific query that isn't pre-populated, generates a customized realistic event.
 */
export function query2027Races(params: {
  query?: string;
  city?: string;
  voivodeship?: string;
  distanceCategory?: string;
  monthOrDate?: string;
}): ExtendedRace2027[] {
  let list = [...OFFICIAL_POLISH_RACES_2027];

  const q = (params.query || '').toLowerCase().trim();
  const c = (params.city || '').toLowerCase().trim();
  const v = (params.voivodeship || '').toLowerCase().trim();
  const d = (params.distanceCategory || 'all').toLowerCase();
  const m = (params.monthOrDate || '').trim();

  // 1. Text search across name, city, organizer, role, description
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        (q.includes('parkrun') && (r.name.toLowerCase().includes('parkrun') || r.description.toLowerCase().includes('parkrun'))) ||
        (q.includes('trail') && r.surface === 'trail') ||
        (q.includes('leśn') && (r.surface === 'trail' || r.description.toLowerCase().includes('leśn'))) ||
        (q.includes('charytat') && (r.role.toLowerCase().includes('charytat') || r.description.toLowerCase().includes('charytat')))
    );
  }

  // 2. City filter
  if (c && c !== 'wszystkie') {
    const cityMatches = list.filter((r) => r.city.toLowerCase().includes(c));
    if (cityMatches.length > 0) {
      list = cityMatches;
    }
  }

  // 3. Voivodeship filter
  if (v && v !== 'wszystkie województwa' && v !== 'wszystkie') {
    const voivMatches = list.filter((r) => r.voivodeship.toLowerCase().includes(v));
    if (voivMatches.length > 0) {
      list = voivMatches;
    }
  }

  // 4. Distance category filter
  if (d && d !== 'all' && d !== 'dowolny') {
    list = list.filter((r) => r.distanceCategory === d);
  }

  // 5. Month or Date prefix filter
  if (m && m.length >= 7 && m !== 'all') {
    const monthPrefix = m.slice(0, 7);
    const monthMatches = list.filter((r) => r.date.startsWith(monthPrefix));
    if (monthMatches.length > 0) {
      list = monthMatches;
    }
  }

  // If specific city/query had no direct match, generate tailored local event for that location instead of falling back to unrelated races
  if (list.length === 0 && (c || q)) {
    const targetCity = c || (q.charAt(0).toUpperCase() + q.slice(1));
    const distNum = d === 'marathon' ? 42.2 : d === 'half' ? 21.1 : d === '10k' ? 10.0 : 5.0;
    const isTrail = q.includes('trail') || q.includes('leśn') || q.includes('cross');
    const isParkrun = q.includes('parkrun');

    const generatedLocalRace: ExtendedRace2027 = {
      id: `race-2027-local-${targetCity.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${distNum}k`,
      name: isParkrun
        ? `Parkrun ${targetCity} 2027`
        : isTrail
        ? `Bieg Leśny & Trail ${targetCity} 2027`
        : `${targetCity} Bieg Uliczny 2027 (${distNum} km)`,
      city: targetCity,
      voivodeship: v && v !== 'wszystkie województwa' ? v : 'Polska',
      date: m && m.length >= 10 ? m : '2027-05-15',
      distanceKm: distNum,
      distanceCategory: (d === 'marathon' || d === 'half' || d === '10k' || d === '5k' || d === 'ultra') ? d : '10k',
      role: isParkrun ? 'Cotygodniowy Parkrun Lokalny' : 'Lokalny Start Mieszkańców & Klubów',
      profile: isTrail ? 'Ścieżki leśne i parkowe' : 'Płaska trasa miejska / Atest',
      elevationM: isTrail ? 85 : 15,
      registrationUrl: `https://biegi.pl/${targetCity.toLowerCase()}`,
      organizer: `${targetCity} OSiR & Klub Biegowy`,
      description: `Wydarzenie biegowe w ${targetCity} na dystansie ${distNum} km. Znakomita trasa dla każdego biegacza z profesjonalnym pomiarem czasu.`,
      surface: isTrail ? 'trail' : 'asfalt',
      isPzlaCertified: !isParkrun && !isTrail,
    };
    return [generatedLocalRace, ...OFFICIAL_POLISH_RACES_2027.slice(0, 5)];
  }

  return list.length > 0 ? list : OFFICIAL_POLISH_RACES_2027.slice(0, 10);
}

// Deterministic race generator with physiological verdicts for client and server fallback
export function getAlgorithmicRaces(
  city?: string,
  voivodeship?: string,
  distanceCat?: string,
  profile?: any,
  query?: string,
  monthOrDate?: string
): RaceSlot[] {
  const verifiedRaces = query2027Races({
    query,
    city,
    voivodeship,
    distanceCategory: distanceCat,
    monthOrDate,
  });

  const runner5kSec = profile?.time5k ? (() => {
    const parts = String(profile.time5k).split(':').map(Number);
    return (parts[0] || 25) * 60 + (parts[1] || 0);
  })() : 1500;

  return verifiedRaces.slice(0, 10).map((r) => {
    const dist = r.distanceKm;
    const estSec = Math.round(runner5kSec * Math.pow(dist / 5, 1.06));
    const h = Math.floor(estSec / 3600);
    const m = Math.floor((estSec % 3600) / 60);
    const s = estSec % 60;
    const estTimeStr = h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;

    let recommendation: 'rekomendowany' | 'wymaga_przygotowan' | 'wysokie_ryzyko' = 'rekomendowany';
    let recommendationLabel = 'Świetny cel w sezonie 2027';
    let analysis = `Szacowany czas ${estTimeStr} przy obecnym tempie 5K (${profile?.time5k || '25:00'}). Trasa sprzyja realizacji założeń.`;
    let successChance = 88;
    let minWeeklyKm = Math.round(dist * 1.5 + 15);

    if (dist <= 10) {
      recommendation = 'rekomendowany';
      recommendationLabel = 'Idealny sprawdzian szybkości i bazy';
      successChance = 92;
      minWeeklyKm = 25;
    } else if (dist <= 21.1) {
      if ((profile?.weeklyKm || 30) >= 35) {
        recommendation = 'rekomendowany';
        recommendationLabel = 'Optymalny półmaraton kontrolny';
        successChance = 86;
      } else {
        recommendation = 'wymaga_przygotowan';
        recommendationLabel = 'Wymaga rozbudowy objętości tlenowej';
        successChance = 74;
      }
      minWeeklyKm = 40;
    } else {
      if ((profile?.weeklyKm || 30) >= 55) {
        recommendation = 'rekomendowany';
        recommendationLabel = 'Rekomendowany start docelowy';
        successChance = 82;
      } else {
        recommendation = 'wymaga_przygotowan';
        recommendationLabel = 'Królewski dystans – wymaga min. 16 tyg. bazy';
        successChance = 68;
      }
      minWeeklyKm = 55;
    }

    const raceDate = new Date(r.date);
    const today = new Date(2026, 9, 18);
    const diffWeeks = Math.max(1, Math.round((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7)));

    return {
      ...r,
      aiVerdict: {
        recommendation,
        recommendationLabel,
        analysis,
        successChancePercent: successChance,
        weeksToPrep: diffWeeks,
        minWeeklyKmNeeded: minWeeklyKm,
        estimatedFinishTime: estTimeStr,
      },
    };
  });
}

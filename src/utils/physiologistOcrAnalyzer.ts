import { OcrExtractedParameter, RunnerProfile, RunLog, Shoe } from '../types.ts';

export interface PhysiologistOcrAnalysisResult {
  documentCategory: 'medical' | 'training_plan' | 'general';
  categoryLabel: string;
  extractedText: string;
  confidence: number;
  detectedParameters: OcrExtractedParameter[];
  keyRecommendations: string[];
  reply: string;
}

interface LabMarkerRule {
  id: string;
  name: string;
  unit: string;
  patterns: RegExp[];
  minNormal: number;
  maxNormal: number;
  runnerOptimalMin?: number;
  runnerOptimalMax?: number;
  referenceRangeLabel: string;
  lowComment: (val: number) => string;
  highComment: (val: number) => string;
  okComment: (val: number) => string;
}

const LAB_MARKER_RULES: LabMarkerRule[] = [
  {
    id: 'ferritin',
    name: 'Ferrytyna (Magazyn żelaza)',
    unit: 'ng/ml',
    patterns: [
      /ferrytyn[a-ząćęłńóśźż]*[\s:.\-|()a-zA-Z]*?(\d{1,3}(?:[.,]\d{1,2})?)/i,
      /ferritin[\s:.\-|()a-zA-Z]*?(\d{1,3}(?:[.,]\d{1,2})?)/i,
    ],
    minNormal: 30,
    maxNormal: 300,
    runnerOptimalMin: 50,
    referenceRangeLabel: 'Norma biegacza: >50 ng/ml (opt. 60-150)',
    lowComment: (v) =>
      `Poziom ${v} ng/ml jest za niski dla biegacza wytrzymałościowego! Poniżej 40-50 ng/ml drastycznie spada efektywność transportu tlenu i VO2max, pojawia się zadyszka w Strefie 2 i tzw. "ciężkie nogi".`,
    highComment: (v) =>
      `Poziom ${v} ng/ml jest podwyższony – u biegaczy po ciężkich akcentach ferrytyna działa jako białko ostrej fazy (marker stanu zapalnego).`,
    okComment: (v) =>
      `Wartość ${v} ng/ml zapewnia optymalne zapasy żelaza do erytropoezy i budowy bazy tlenowej.`,
  },
  {
    id: 'hemoglobin',
    name: 'Hemoglobina (HGB)',
    unit: 'g/dl',
    patterns: [
      /(?:hemoglobina|hgb|\bhb\b)[\s:.\-|()a-zA-Z]*?(\d{1,2}[.,]\d{1,2}|\d{2})/i,
    ],
    minNormal: 13.0,
    maxNormal: 17.5,
    referenceRangeLabel: '13.0 - 17.5 g/dl (K: 12.0 - 16.0)',
    lowComment: (v) =>
      `Obniżona hemoglobina (${v} g/dl) wskazuje na niedokrwistość sportową lub pseudoanemię z rozcieńczenia osocza. Ogranicza pułap tlenowy VO2max.`,
    highComment: (v) =>
      `Wysoka hemoglobina (${v} g/dl) – często świadczy o odwodnieniu po treningu. Zwiększ podaż płynów z elektrolitami.`,
    okComment: (v) =>
      `Hemoglobina (${v} g/dl) w normie fizjologicznej – bardzo dobry potencjał przenoszenia tlenu do mięśni.`,
  },
  {
    id: 'hematocrit',
    name: 'Hematokryt (HCT)',
    unit: '%',
    patterns: [
      /(?:hematokryt|hct|\bht\b)[\s:.\-|()a-zA-Z]*?(\d{2}(?:[.,]\d{1,2})?)/i,
    ],
    minNormal: 38,
    maxNormal: 50,
    referenceRangeLabel: '38.0 - 50.0 %',
    lowComment: (v) =>
      `Hematokryt ${v}% obniżony – u biegaczy objętość osocza rośnie o 10-15%, co fizjologicznie obniża HCT, ale warto skontrolować żelazo i ferrytynę.`,
    highComment: (v) =>
      `Podwyższony hematokryt (${v}%) zwiększa lepkość krwi i obciąża serce – wyraźny sygnał niedostatecznego nawodnienia.`,
    okComment: (v) =>
      `Hematokryt (${v}%) zapewnia optymalną reologię krwi i niskie opory naczyniowe podczas biegu.`,
  },
  {
    id: 'rbc',
    name: 'Erytrocyty (RBC)',
    unit: 'mln/µl',
    patterns: [
      /(?:erytrocyty|krwinki czerwone|\brbc\b)[\s:.\-|()a-zA-Z]*?([3456][.,]\d{1,2})/i,
    ],
    minNormal: 4.1,
    maxNormal: 5.8,
    referenceRangeLabel: '4.10 - 5.80 mln/µl',
    lowComment: (v) =>
      `Obniżona liczba erytrocytów (${v} mln/µl) – możliwa hemoliza wysiłkowa (rozpad krwinek od uderzeń stóp o twardy asfalt). Biegaj więcej po miękkiej nawierzchni i zadbaj o wit. B12 oraz żelazo.`,
    highComment: (v) => `Wysoka liczba erytrocytów (${v} mln/µl) – zadbaj o odpowiednie nawodnienie przed pobraniem krwi.`,
    okComment: (v) => `Liczba krwinek czerwonych (${v} mln/µl) prawidłowa.`,
  },
  {
    id: 'wbc',
    name: 'Leukocyty (WBC)',
    unit: 'tys/µl',
    patterns: [
      /(?:leukocyty|krwinki bia[łl]e|\bwbc\b)[\s:.\-|()a-zA-Z]*?(\d{1,2}[.,]\d{1,2}|\d{1,2})/i,
    ],
    minNormal: 4.0,
    maxNormal: 10.0,
    referenceRangeLabel: '4.0 - 10.0 tys/µl',
    lowComment: (v) =>
      `Obniżone leukocyty (${v} tys/µl) – tzw. "okno immunologiczne" po dużym kilometrażu biegowym. Unikaj obecnie interwałów w Strefie 5 i wydłuż sen.`,
    highComment: (v) =>
      `Podwyższone leukocyty (${v} tys/µl) – możliwa infekcja lub leukocytoza powysiłkowa, jeśli badanie wykonano do 24h po mocnym biegu.`,
    okComment: (v) => `Odporność leukocytarna (${v} tys/µl) w pełnej równowadze.`,
  },
  {
    id: 'iron',
    name: 'Żelazo w surowicy (Fe)',
    unit: 'µg/dl',
    patterns: [
      /(?:[żz]elazo|\bfe\b|iron)[\s:.\-|()a-zA-Z]*?(\d{2,3}(?:[.,]\d{1,2})?)/i,
    ],
    minNormal: 60,
    maxNormal: 170,
    referenceRangeLabel: '60 - 170 µg/dl',
    lowComment: (v) =>
      `Niskie żelazo (${v} µg/dl) – zwiększ w diecie podaż żelaza hemowego oraz witaminy C przed posiłkiem (unikaj kawy/herbaty wokół posiłków).`,
    highComment: (v) => `Podwyższone żelazo (${v} µg/dl) – skonsultuj ewentualną suplementację.`,
    okComment: (v) => `Poziom żelaza w surowicy (${v} µg/dl) prawidłowy.`,
  },
  {
    id: 'vit_d',
    name: 'Witamina D3 (25-OH)',
    unit: 'ng/ml',
    patterns: [
      /(?:witamina\s*d\d*|25[\s-]*oh|kalcydi[oó]l)[\s:.\-|()a-zA-Z]*?(\d{1,3}(?:[.,]\d{1,2})?)/i,
    ],
    minNormal: 35,
    maxNormal: 80,
    referenceRangeLabel: 'Norma sportowa: 40 - 65 ng/ml',
    lowComment: (v) =>
      `Niedobór witaminy D3 (${v} ng/ml)! U biegaczy poziom <35 ng/ml zwiększa ryzyko złamań zmęczeniowych piszczeli (shin splints) i osłabia siłę skurczu włókien szybkokurczliwych.`,
    highComment: (v) => `Wysoki poziom witaminy D3 (${v} ng/ml) – skoryguj dawkę suplementacyjną.`,
    okComment: (v) => `Optymalne wysycenie witaminą D3 (${v} ng/ml) – mocna mineralizacja kości i sprawna regeneracja mięśni.`,
  },
  {
    id: 'ck',
    name: 'Kinaza kreatynowa (CK / CPK)',
    unit: 'U/l',
    patterns: [
      /(?:kinaza\s*kreatynowa|\bck\b|\bcpk\b)[\s:.\-|()a-zA-Z]*?(\d{2,4}(?:[.,]\d{1,2})?)/i,
    ],
    minNormal: 30,
    maxNormal: 280,
    referenceRangeLabel: 'Spoczynkowa < 200 U/l (Biegacze < 350 U/l)',
    lowComment: (v) => `Niskie CK (${v} U/l) – brak uszkodzeń sarkolemy mięśniowej, pełna regeneracja.`,
    highComment: (v) =>
      `Wysokie CK (${v} U/l)! Świadczy o istotnych mikrouszkodzeniach włókien mięśniowych (DOMS / zbiegach / interwałach). Przez najbliższe 48h zamień akcenty na rozbieganie w Strefie 1 lub rower/basen.`,
    okComment: (v) => `Kinaza kreatynowa (${v} U/l) w bezpiecznym przedziale adaptacyjnym dla biegacza.`,
  },
  {
    id: 'magnesium',
    name: 'Magnez (Mg)',
    unit: 'mg/dl',
    patterns: [
      /(?:magnez|\bmg\b)[\s:.\-|()a-zA-Z]*?([123][.,]\d{1,2})/i,
    ],
    minNormal: 1.8,
    maxNormal: 2.6,
    referenceRangeLabel: '1.80 - 2.60 mg/dl',
    lowComment: (v) =>
      `Obniżony magnez (${v} mg/dl) – zwiększa ryzyko bolesnych skurczów łydek na długich wybieganiach i zaburza przewodnictwo nerwowo-mięśniowe.`,
    highComment: (v) => `Magnez (${v} mg/dl) powyżej normy.`,
    okComment: (v) => `Poziom magnezu (${v} mg/dl) prawidłowy.`,
  },
  {
    id: 'potassium',
    name: 'Potas (K)',
    unit: 'mmol/l',
    patterns: [
      /(?:potas|\bk\+\b)[\s:.\-|()a-zA-Z]*?([345][.,]\d{1,2})/i,
    ],
    minNormal: 3.8,
    maxNormal: 5.1,
    referenceRangeLabel: '3.80 - 5.10 mmol/l',
    lowComment: (v) =>
      `Niski potas (${v} mmol/l) – utrata z potem podczas długich biegów. Włącz elektrolity i produkty bogate w potas (pomidory, banany, ziemniaki).`,
    highComment: (v) => `Podwyższony potas (${v} mmol/l) – często po intensywnym wysiłku lub odwodnieniu.`,
    okComment: (v) => `Gospodarka potasowa (${v} mmol/l) w normie.`,
  },
  {
    id: 'tsh',
    name: 'TSH (Tarczyca)',
    unit: 'µIU/ml',
    patterns: [
      /(?:\btsh\b|tyreotropina)[\s:.\-|()a-zA-Z]*?([0-9][.,]\d{1,3})/i,
    ],
    minNormal: 0.4,
    maxNormal: 2.8,
    referenceRangeLabel: '0.40 - 2.80 µIU/ml (optymalne sportowe)',
    lowComment: (v) => `Niskie TSH (${v} µIU/ml) – wskazana kontrola FT3/FT4 i tętna spoczynkowego RHR.`,
    highComment: (v) =>
      `Podwyższone TSH (${v} µIU/ml) – może spowalniać tempo metabolizmu, regenerację glikogenu oraz powodować przewlekłe zmęczenie treningowe (zespół RED-S).`,
    okComment: (v) => `Funkcja osi tarczycowej TSH (${v} µIU/ml) prawidłowa.`,
  },
  {
    id: 'crp',
    name: 'CRP (Stan zapalny)',
    unit: 'mg/l',
    patterns: [
      /(?:\bcrp\b|bia[łl]ko\s*c[\s-]*reaktywne)[\s:.\-|()a-zA-Z]*?(\d{1,2}[.,]\d{1,2}|\d{1,2})/i,
    ],
    minNormal: 0,
    maxNormal: 5.0,
    referenceRangeLabel: '< 5.0 mg/l',
    lowComment: (v) => `CRP (${v} mg/l) niskie – brak ogólnoustrojowego stanu zapalnego.`,
    highComment: (v) =>
      `Podwyższone CRP (${v} mg/l) wskazuje na aktywny stan zapalny lub przeciążenie tkanek. Wstrzymaj treningi o wysokiej intensywności (Interwały / Tempo).`,
    okComment: (v) => `Niski wskaźnik stanu zapalnego CRP (${v} mg/l) – zielone światło na realizację planu.`,
  },
  {
    id: 'glucose',
    name: 'Glukoza na czczo',
    unit: 'mg/dl',
    patterns: [
      /(?:glukoza|glucose|cukier)[\s:.\-|()a-zA-Z]*?(\d{2,3}(?:[.,]\d{1,2})?)/i,
    ],
    minNormal: 70,
    maxNormal: 99,
    referenceRangeLabel: '70 - 99 mg/dl',
    lowComment: (v) => `Niska glukoza (${v} mg/dl) – zadbaj o kolację węglowodanową w dni poprzedzające poranne biegi.`,
    highComment: (v) =>
      `Podwyższona glukoza (${v} mg/dl) – trening w Strefie 2 (tlenowej) poprawia wrażliwość insulinową GLUT-4 w mięśniach.`,
    okComment: (v) => `Glikemia na czczo (${v} mg/dl) prawidłowa.`,
  },
  {
    id: 'cortisol',
    name: 'Kortyzol (Hormon stresu)',
    unit: 'µg/dl',
    patterns: [
      /(?:kortyzol|cortisol)[\s:.\-|()a-zA-Z]*?(\d{1,2}[.,]\d{1,2}|\d{1,2})/i,
    ],
    minNormal: 5.0,
    maxNormal: 19.5,
    referenceRangeLabel: '5.0 - 19.5 µg/dl (rano)',
    lowComment: (v) => `Niski kortyzol (${v} µg/dl) – możliwa faza wyczerpania nadnerczy przy przetrenowaniu.`,
    highComment: (v) =>
      `Podwyższony kortyzol (${v} µg/dl) – sygnał nadmiernego stresu somatycznego i za małej ilości snu względem objętości treningowej.`,
    okComment: (v) => `Poziom kortyzolu (${v} µg/dl) w normie – prawidłowa adaptacja układu nerwowego.`,
  },
];

export function detectDocumentCategory(
  ocrText: string,
  userHint?: 'auto' | 'medical' | 'training_plan',
  userPrompt?: string
): 'medical' | 'training_plan' | 'general' {
  if (userHint === 'medical') return 'medical';
  if (userHint === 'training_plan') return 'training_plan';

  const combined = `${ocrText || ''} ${userPrompt || ''}`.toLowerCase();

  const medicalKeywords = [
    'morfologia',
    'hemoglobina',
    'hgb',
    'ferrytyna',
    'ferritin',
    'hematokryt',
    'hct',
    'erytrocyty',
    'rbc',
    'leukocyty',
    'wbc',
    'płytki',
    'plt',
    'żelazo',
    'witamina d',
    'magnez',
    'potas',
    'tsh',
    'crp',
    'glukoza',
    'kortyzol',
    'kinaza',
    'mmol',
    'mg/dl',
    'ng/ml',
    'g/dl',
    'zakres referencyjny',
    'wynik badania',
    'badania krwi',
    'diagnostyka',
    'synevo',
    'alab',
  ];

  const planKeywords = [
    'poniedziałek',
    'wtorek',
    'środa',
    'czwartek',
    'piątek',
    'sobota',
    'niedziela',
    'tydzień',
    'mikrocykl',
    'interwały',
    'rozbieganie',
    'wybieganie',
    'bieg długi',
    'tempo run',
    'owb1',
    'bc2',
    'rytmy',
    'przebieżki',
    'plan treningowy',
    'strefa 2',
    'strefa 3',
    'min/km',
    'odpoczynek',
    'regeneracja',
  ];

  let medScore = 0;
  let planScore = 0;

  for (const kw of medicalKeywords) {
    if (combined.includes(kw)) medScore += 2;
  }
  for (const kw of planKeywords) {
    if (combined.includes(kw)) planScore += 2;
  }

  // Also check interval patterns like 5x1000m, 8x400m
  if (/\d+\s*[x×]\s*\d+\s*(?:m|km)/i.test(combined)) {
    planScore += 4;
  }

  if (medScore >= 2 && medScore >= planScore) return 'medical';
  if (planScore >= 2) return 'training_plan';
  if (combined.includes('badani') || combined.includes('krwi') || combined.includes('wynik')) return 'medical';
  if (combined.includes('plan') || combined.includes('trening')) return 'training_plan';

  return 'general';
}

export function analyzeDocumentWithPhysiologistOcr(
  rawOcrText: string,
  userMessage: string,
  documentTypeHint: 'auto' | 'medical' | 'training_plan' | undefined,
  profile: RunnerProfile,
  lastRun?: RunLog | null,
  shoes?: Shoe[],
  ocrConfidence = 92
): PhysiologistOcrAnalysisResult {
  const cleanOcr = (rawOcrText || '').trim();
  const category = detectDocumentCategory(cleanOcr, documentTypeHint, userMessage);
  const runnerName = profile?.name || 'Biegaczu';
  const runnerVo2 = profile?.vo2max || 42;
  const runnerHrMax = profile?.hrMax || 185;
  const runnerWeight = profile?.weight || 70;
  const runnerTime5k = profile?.time5k || '25:00';
  const runnerWeeklyKm = profile?.weeklyKm || 30;

  if (category === 'medical') {
    const detectedParameters: OcrExtractedParameter[] = [];
    const abnormalityNotes: string[] = [];
    const okNotes: string[] = [];
    const keyRecommendations: string[] = [];

    for (const rule of LAB_MARKER_RULES) {
      for (const regex of rule.patterns) {
        const match = cleanOcr.match(regex);
        if (match && match[1]) {
          const val = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(val) && val > 0) {
            const effectiveMin = rule.runnerOptimalMin ?? rule.minNormal;
            let status: 'norma' | 'niski' | 'wysoki' = 'norma';
            let comment = '';

            if (val < effectiveMin) {
              status = 'niski';
              comment = rule.lowComment(val);
              abnormalityNotes.push(`⚠️ **${rule.name}: ${val} ${rule.unit} (Obniżony)** — ${comment}`);
            } else if (val > rule.maxNormal) {
              status = 'wysoki';
              comment = rule.highComment(val);
              abnormalityNotes.push(`⚠️ **${rule.name}: ${val} ${rule.unit} (Podwyższony)** — ${comment}`);
            } else {
              status = 'norma';
              comment = rule.okComment(val);
              okNotes.push(`✅ **${rule.name}: ${val} ${rule.unit}** (${rule.referenceRangeLabel})`);
            }

            detectedParameters.push({
              name: rule.name,
              value: String(val),
              unit: rule.unit,
              status,
              referenceRange: rule.referenceRangeLabel,
              comment,
            });
            break;
          }
        }
      }
    }

    // If generic lines with numbers and units exist that weren't in LAB_MARKER_RULES, extract up to 5 additional lines
    if (detectedParameters.length < 4 && cleanOcr.length > 10) {
      const lines = cleanOcr
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length >= 4 && /\d/.test(l));

      for (const line of lines) {
        const genericMatch = line.match(/^([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s()-]{3,28}?)[\s:.\-|]+(\d+(?:[.,]\d+)?)\s*([a-zA-Z%/µμ]+(?:\/[a-zA-ZµμlL]+)?)?/);
        if (genericMatch) {
          const rawName = genericMatch[1].trim();
          const rawVal = genericMatch[2].replace(',', '.');
          const rawUnit = genericMatch[3] || '';
          const alreadyExists = detectedParameters.some((p) =>
            p.name.toLowerCase().includes(rawName.toLowerCase()) ||
            rawName.toLowerCase().includes(p.name.split(' ')[0].toLowerCase())
          );
          if (!alreadyExists && rawName.length >= 2 && detectedParameters.length < 8) {
            detectedParameters.push({
              name: rawName,
              value: rawVal,
              unit: rawUnit,
              status: 'info',
              referenceRange: 'Wykryto przez OCR',
              comment: `Wartość odczytana z dokumentu: ${rawVal} ${rawUnit}`.trim(),
            });
          }
        }
      }
    }

    // Build tailored recommendations
    const hasLowIronOrFerritin = detectedParameters.some(
      (p) => (p.name.includes('Ferrytyna') || p.name.includes('Hemoglobina') || p.name.includes('Żelazo')) && p.status === 'niski'
    );
    const hasHighCkOrCrp = detectedParameters.some(
      (p) => (p.name.includes('Kinaza') || p.name.includes('CRP')) && p.status === 'wysoki'
    );

    if (hasLowIronOrFerritin) {
      keyRecommendations.push(
        'Zredukuj objętość interwałów w Strefie 4-5 na rzecz spokojnych biegów tlenowych Z2 do czasu odbudowy ferrytyny powyżej 50 ng/ml.'
      );
      keyRecommendations.push(
        'Włącz żelazo hemowe + 200 mg witaminy C do posiłku potreningowego (nie pij kawy i herbaty na 60 min przed/po posiłku z uwagi na fityniany i polifenole).'
      );
    }
    if (hasHighCkOrCrp) {
      keyRecommendations.push(
        'Wykryto podwyższone markery uszkodzenia mięśniowego/zapalnego – wprowadź 48h aktywnej regeneracji (spacer, rolowanie, sen min. 8h) i unikaj zbiegów po asfalcie.'
      );
    }
    keyRecommendations.push(
      `Przy Twoim VO2max (${runnerVo2} ml/kg/min) i wadze ${runnerWeight} kg powtarzaj kontrolę morfologii, ferrytyny i elektrolitów co 8–12 tygodni w trakcie sezonu.`
    );
    keyRecommendations.push(
      'Pamiętaj, aby badania krwi zawsze wykonywać rano na czczo po minimum 24–36h od ostatniego mocnego akcentu biegowego (unikniesz fałszywego zawyżenia CK, WBC i kortyzolu).'
    );

    const extractedSummaryText =
      cleanOcr.length > 0
        ? cleanOcr
        : 'Obraz przetworzony przez skaner optyczny OCR – przeanalizowano profil hematologiczny i biochemiczny biegacza.';

    const replyParts: string[] = [
      `🧑‍⚕️ **Analiza Fizjologiczna Wyników Badań (Moduł OCR):**`,
      `Cześć ${runnerName}! Przeanalizowałem przesłany obraz badań pod kątem fizjologii wysiłku wytrzymałościowego (Twój aktualny profil: waga **${runnerWeight} kg**, czas 5K **${runnerTime5k}**, VO2max **${runnerVo2}**, HRmax **${runnerHrMax} bpm**).`,
    ];

    if (abnormalityNotes.length > 0) {
      replyParts.push(
        `\n🔍 **Kluczowe odchylenia wymagające uwagi treningowej:**\n${abnormalityNotes.join('\n')}`
      );
    }

    if (okNotes.length > 0) {
      replyParts.push(
        `\n✅ **Parametry w normie sportowej:**\n${okNotes.join('\n')}`
      );
    }

    if (detectedParameters.length === 0) {
      replyParts.push(
        `\n📋 **Interpretacja tekstu z dokumentu OCR:**\nZ odczytanego tekstu (${cleanOcr ? `"${cleanOcr.slice(0, 220)}${cleanOcr.length > 220 ? '...' : ''}"` : 'skan dokumentu medycznego'}) wynika konieczność zwrócenia szczególnej uwagi na parametry układu czerwonokrwinkowego (HGB, HCT, RBC) oraz gospodarkę żelazową (Ferrytyna min. 50 ng/ml dla biegacza). W sporcie wytrzymałościowym normy laboratoryjne dla populacji ogólnej są często zbyt szerokie – dla utrzymania tempa pod cel "${profile?.targetGoal || 'poprawa formy'}" kluczowe jest utrzymanie ferrytyny w przedziale 60–120 ng/ml oraz prawidłowego nawodnienia zewnątrzkomórkowego.`
      );
    } else {
      replyParts.push(
        `\n🧬 **Wnioski Fizjologa dla Twojego Planu Treningowego:**\nU biegaczy pokonujących regularnie ~${runnerWeeklyKm} km/tydzień dochodzi do zwiększonego obrotu żelaza (hemoliza wysiłkowa w stopach) oraz przejściowego wzrostu objętości osocza. ${
          hasLowIronOrFerritin
            ? 'Z uwagi na obniżone parametry transportu tlenu Twój puls w Strefie 2 może być obecnie o 5–8 bpm wyższy przy tym samym tempie – kieruj się tętnem, a nie sztywnym tempem z zegarka.'
            : 'Twoje parametry hematologiczne pozwalają na bezpieczną realizację zaplanowanych jednostek tlenowych i tempowych.'
        }`
      );
    }

    replyParts.push(
      `\n💡 **Rekomendacje Fizjologiczne:**\n${keyRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    );

    return {
      documentCategory: 'medical',
      categoryLabel: 'Wyniki Badań Laboratoryjnych (OCR)',
      extractedText: extractedSummaryText,
      confidence: ocrConfidence,
      detectedParameters,
      keyRecommendations,
      reply: replyParts.join('\n'),
    };
  }

  if (category === 'training_plan') {
    const detectedParameters: OcrExtractedParameter[] = [];
    const keyRecommendations: string[] = [];

    // Extract distances (e.g. "10 km", "12.5 km", "5x1000m")
    const kmMatches = [...cleanOcr.matchAll(/(\d{1,2}(?:[.,]\d{1,2})?)\s*km\b/gi)];
    const intervalsMatches = [...cleanOcr.matchAll(/(\d{1,2}\s*[x×]\s*\d{2,4}\s*(?:m|km)?)/gi)];
    const paceMatches = [...cleanOcr.matchAll(/(\b[34567]:[0-5]\d)\s*(?:\/km|min\/km)?/gi)];

    let totalDetectedKm = 0;
    const kmValues: number[] = [];
    for (const m of kmMatches) {
      const v = parseFloat(m[1].replace(',', '.'));
      if (!isNaN(v) && v > 0 && v <= 45) {
        kmValues.push(v);
        totalDetectedKm += v;
      }
    }

    // Extract day lines if present
    const dayRegex = /(poniedzia[łl]ek|\bpon\b|wtorek|\bwt\b|[śs]roda|\b[śs]r\b|czwartek|\bczw\b|pi[ąa]tek|\bpt\b|sobota|\bsob\b|niedziela|\bniedz\b|dzie[ńn]\s*\d)[^\r\n]*/gi;
    const dayLines = [...cleanOcr.matchAll(dayRegex)].map((m) => m[0].trim());

    if (totalDetectedKm > 0) {
      const diffRatio = runnerWeeklyKm > 0 ? totalDetectedKm / runnerWeeklyKm : 1;
      const volumeStatus: 'norma' | 'niski' | 'wysoki' =
        diffRatio > 1.25 ? 'wysoki' : diffRatio < 0.6 ? 'niski' : 'norma';

      detectedParameters.push({
        name: 'Suma wykrytego kilometrażu (OCR)',
        value: `${totalDetectedKm.toFixed(1)}`,
        unit: 'km',
        status: volumeStatus,
        referenceRange: `Twój profil: ${runnerWeeklyKm} km/tydz.`,
        comment:
          volumeStatus === 'wysoki'
            ? `Kilometraż z planu (${totalDetectedKm.toFixed(1)} km) przekracza Twój obecny dystans bazowy (${runnerWeeklyKm} km) o ponad 25% – uwaga na regułę 10% i wskaźnik ACWR!`
            : `Objętość dobrze dopasowana do Twojej bazy tlenowej (${runnerWeeklyKm} km/tydz.).`,
      });
    }

    if (kmValues.length > 0) {
      const longestRun = Math.max(...kmValues);
      detectedParameters.push({
        name: 'Najdłuższa jednostka (Long Run)',
        value: `${longestRun}`,
        unit: 'km',
        status: longestRun > runnerWeeklyKm * 0.45 && runnerWeeklyKm > 15 ? 'wysoki' : 'norma',
        referenceRange: 'Optymalnie 25-35% objętości tyg.',
        comment: `Najdłuższy bieg stanowi ${totalDetectedKm > 0 ? Math.round((longestRun / totalDetectedKm) * 100) : 33}% wykrytego kilometrażu.`,
      });
    }

    if (intervalsMatches.length > 0) {
      const uniqueIntervals = Array.from(new Set(intervalsMatches.map((m) => m[1]))).slice(0, 3);
      detectedParameters.push({
        name: 'Akcenty interwałowe / rytmy',
        value: uniqueIntervals.join(', '),
        status: uniqueIntervals.length > 2 ? 'wysoki' : 'norma',
        referenceRange: 'Zalecane 1-2 akcenty / tydz.',
        comment: 'Jednostki kształtujące VO2max i ekonomię kroku biegowego.',
      });
    }

    if (paceMatches.length > 0) {
      const uniquePaces = Array.from(new Set(paceMatches.map((m) => m[1]))).slice(0, 4);
      detectedParameters.push({
        name: 'Wykryte tempa w planie',
        value: uniquePaces.join(', '),
        unit: 'min/km',
        status: 'info',
        referenceRange: `Twój wynik 5K: ${runnerTime5k}`,
        comment: 'Tempa docelowe odczytane ze zdjęcia planu.',
      });
    }

    dayLines.slice(0, 5).forEach((line, idx) => {
      detectedParameters.push({
        name: `Jednostka #${idx + 1}`,
        value: line.slice(0, 55),
        status: 'info',
        referenceRange: 'Wykryty dzień z rozpiski',
      });
    });

    // Calculate runner's recommended physiological zones from 5K time & HRmax
    const parts5k = runnerTime5k.split(':').map(Number);
    const pace5kSec = Math.round(((parts5k[0] || 25) * 60 + (parts5k[1] || 0)) / 5);
    const formatSec = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
    const easyPaceRange = `${formatSec(pace5kSec + 60)} - ${formatSec(pace5kSec + 85)} min/km`;
    const thresholdPace = `${formatSec(pace5kSec + 18)} min/km`;
    const z2HrRange = `${Math.round(runnerHrMax * 0.68)} - ${Math.round(runnerHrMax * 0.78)} bpm`;

    keyRecommendations.push(
      `Stosuj polaryzację 80/20: 80% biegów z tego planu realizuj w Strefie 2 (${z2HrRange}, tempo spokojne ${easyPaceRange}).`
    );
    keyRecommendations.push(
      `Biegi progowe (Tempo Run / BC2) biegaj w okolicach ${thresholdPace} (tętno ~${Math.round(runnerHrMax * 0.86)} bpm), zachowując min. 48h przerwy przed kolejnym mocnym akcentem.`
    );
    if (totalDetectedKm > runnerWeeklyKm * 1.15) {
      keyRecommendations.push(
        `Zredukuj objętość o 10–15% w pierwszym tygodniu wdrażania planu, aby utrzymać bezpieczny współczynnik obciążenia ACWR (0.8–1.3).`
      );
    } else {
      keyRecommendations.push(
        `Po każdym biegu spokojnym dodaj 4x80m luźnych przebieżek na poprawę kadencji (~178-182 spm) i skrócenie czasu kontaktu z podłożem (GCT).`
      );
    }

    const replyParts = [
      `📅 **Analiza Fizjologiczna Planu Treningowego (Moduł OCR):**`,
      `Cześć ${runnerName}! Odczytałem przesłane zdjęcie planu treningowego przez silnik OCR i zestawiłem je z Twoją fizjologią (VO2max **${runnerVo2} ml/kg/min**, czas 5K **${runnerTime5k}**, HRmax **${runnerHrMax} bpm**, cel: **${profile?.targetGoal || 'Poprawa formy'}**).`,
      `\n📊 **Podsumowanie odczytanego układu treningowego:**`,
      totalDetectedKm > 0
        ? `- Wykryty sumaryczny dystans w rozpisce: **${totalDetectedKm.toFixed(1)} km** (Twój obecny poziom bazowy w profilu: **${runnerWeeklyKm} km/tydz.**).`
        : `- Rozpoznano strukturę jednostek biegowych z przesłanego obrazu planu.`,
      intervalsMatches.length > 0
        ? `- Zidentyfikowane akcenty szybkościowe/interwałowe: **${Array.from(new Set(intervalsMatches.map((m) => m[1]))).join(', ')}**.`
        : `- Plan bazuje na jednostkach ciągłych i budowie wytrzymałości tlenowej.`,
      `\n🎯 **Kalibracja Stref Tętna i Tempa pod Twój Profil:**`,
      `- **Biegi Spokojne / Regeneracyjne (OWB1 / Z2):** Trzymaj tempo **${easyPaceRange}** oraz tętno w przedziale **${z2HrRange}**. Nie biegaj rozbiegań za szybko – to w tej strefie rośnie gęstość mitochondriów i naczyń włosowatych.`,
      `- **Bieg Progowy (Tempo / BC2):** Optymalne tempo dla Ciebie to **${thresholdPace}** (ok. 85-88% HRmax).`,
      `- **Bieg Długi (Long Run):** Pamiętaj o rotacji obuwia z większą amortyzacją (${shoes && shoes.length > 0 ? `np. ${shoes[0].name}` : 'buty Max Cushion'}) oraz przyjęciu 30-60g węglowodanów przy wysiłku > 70 minut.`,
      `\n💡 **Kluczowe rekomendacje Fizjologa AI:**\n${keyRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`,
    ];

    return {
      documentCategory: 'training_plan',
      categoryLabel: 'Plan Treningowy (OCR)',
      extractedText: cleanOcr || 'Odczytano harmonogram jednostek treningowych ze zdjęcia.',
      confidence: ocrConfidence,
      detectedParameters,
      keyRecommendations,
      reply: replyParts.join('\n'),
    };
  }

  // General OCR document / workout stats / coaching note
  const detectedParameters: OcrExtractedParameter[] = [];
  const kmMatch = cleanOcr.match(/(\d{1,2}[.,]\d{1,2}|\d{1,2})\s*km/i);
  const hrMatch = cleanOcr.match(/(\d{2,3})\s*bpm/i);
  const paceMatch = cleanOcr.match(/([34567]:[0-5]\d)/);

  if (kmMatch) {
    detectedParameters.push({
      name: 'Wykryty dystans',
      value: kmMatch[1].replace(',', '.'),
      unit: 'km',
      status: 'info',
    });
  }
  if (paceMatch) {
    detectedParameters.push({
      name: 'Wykryte tempo',
      value: paceMatch[1],
      unit: 'min/km',
      status: 'info',
    });
  }
  if (hrMatch) {
    const hr = parseInt(hrMatch[1], 10);
    detectedParameters.push({
      name: 'Wykryte tętno',
      value: String(hr),
      unit: 'bpm',
      status: hr > runnerHrMax * 0.85 ? 'wysoki' : 'norma',
      referenceRange: `Twoje HRmax: ${runnerHrMax} bpm`,
    });
  }

  const keyRecommendations = [
    `Utrzymuj 80% tygodniowego kilometrażu w Strefie 2 tlenowej (${Math.round(runnerHrMax * 0.68)}-${Math.round(runnerHrMax * 0.78)} bpm).`,
    `Dbaj o kadencję 175–182 spm oraz regenerację po mocniejszych jednostkach.`,
  ];

  const reply = [
    `🔍 **Analiza OCR przesłanego obrazu:**`,
    `Cześć ${runnerName}! Odczytałem zawartość tekstową z przesłanego zdjęcia${cleanOcr ? `:\n> *"${cleanOcr.slice(0, 260).replace(/\n+/g, ' ')}${cleanOcr.length > 260 ? '...' : ''}"*` : '.'}`,
    `\n🧬 **Komentarz Fizjologa AI (Waga: ${runnerWeight} kg, VO2max: ${runnerVo2}, 5K: ${runnerTime5k}):**`,
    `W odniesieniu do Twojego zapytania ${userMessage ? `("${userMessage}")` : ''} i danych z obrazu: kluczowe dla dalszej adaptacji tlenowej jest pilnowanie polaryzacji obciążeń. Przy HRmax ${runnerHrMax} bpm Twoje spokojne wybiegania nie powinny przekraczać ${Math.round(runnerHrMax * 0.78)} bpm, co chroni układ nerwowy i pozwala na pełną superkompensację przed startami docelowymi (${profile?.targetGoal || 'poprawa rekordów życiowych'}).`,
    `\n💡 **Wskazówki praktyczne:**\n1. ${keyRecommendations[0]}\n2. ${keyRecommendations[1]}`,
  ].join('\n');

  return {
    documentCategory: 'general',
    categoryLabel: 'Dokument Sportowy / Zrzut (OCR)',
    extractedText: cleanOcr || 'Przeprowadzono analizę optyczną przesłanego obrazu.',
    confidence: ocrConfidence,
    detectedParameters,
    keyRecommendations,
    reply,
  };
}

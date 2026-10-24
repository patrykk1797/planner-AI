import React, { useState, useEffect } from 'react';

interface ShoeBrandLogoProps {
  brand: string;
  shoeName?: string;
  brandLogoUrl?: string;
  brandLogoSvg?: string;
  primaryColor?: string;
  accentColor?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadgeLabel?: boolean;
}

export interface BrandVisualConfig {
  canonicalBrand: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  tagline: string;
  isMatchedOfficial: boolean;
}

const OFFICIAL_BRANDS: Array<{
  keywords: string[];
  canonicalBrand: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  tagline: string;
}> = [
  {
    keywords: ['nike', 'vaporfly', 'alphafly', 'pegasus', 'invincible', 'vomero', 'streakfly', 'winflo', 'zoomx', 'ultrafly', 'zegama', 'wildhorse', 'kiger'],
    canonicalBrand: 'Nike',
    logoUrl: '/assets/brands/nike.svg',
    primaryColor: '#ff5500',
    accentColor: '#111111',
    tagline: 'Nike Running • ZoomX Racing Lab',
  },
  {
    keywords: ['asics', 'novablast', 'superblast', 'metaspeed', 'nimbus', 'kayano', 'cumulus', 'magic speed', 'noosa', 'trabuco', 'gt-2000', 'gt 2000'],
    canonicalBrand: 'ASICS',
    logoUrl: '/assets/brands/asics.svg',
    primaryColor: '#38bdf8',
    accentColor: '#001e62',
    tagline: 'Sound Mind, Sound Body • FF Blast+',
  },
  {
    keywords: ['hoka', 'clifton', 'mach', 'bondi', 'speedgoat', 'cielo', 'rocket x', 'arahi', 'gaviota', 'rincon', 'challenger', 'tecton', 'torrent', 'mafate'],
    canonicalBrand: 'HOKA',
    logoUrl: '/assets/brands/hoka.svg',
    primaryColor: '#0077b8',
    accentColor: '#38bdf8',
    tagline: 'Fly Human Fly • MetaRocker™',
  },
  {
    keywords: ['adidas', 'adizero', 'adios', 'boston', 'ultraboost', 'takumi', 'supernova', 'sl2', 'prime x', 'terrex', 'duramo', 'solarglide'],
    canonicalBrand: 'adidas',
    logoUrl: '/assets/brands/adidas.svg',
    primaryColor: '#10b981',
    accentColor: '#111111',
    tagline: 'Adizero Lightstrike Pro & EnergyRods',
  },
  {
    keywords: ['saucony', 'endorphin', 'triumph', 'kinvara', 'peregrine', 'ride', 'guide', 'tempus', 'axon', 'xodus'],
    canonicalBrand: 'Saucony',
    logoUrl: '/assets/brands/saucony.svg',
    primaryColor: '#e11d48',
    accentColor: '#b50938',
    tagline: 'Speedroll & PWRRUN PB Lab',
  },
  {
    keywords: ['new balance', 'fuelcell', 'fresh foam', 'rebel', '1080', '880', '860', 'more v', 'sc elite', 'sc trainer', 'supercomp', 'hierro'],
    canonicalBrand: 'New Balance',
    logoUrl: '/assets/brands/newbalance.svg',
    primaryColor: '#ef4444',
    accentColor: '#cf0a2c',
    tagline: 'FuelCell & Fresh Foam X',
  },
  {
    keywords: ['brooks', 'glycerin', 'ghost', 'hyperion', 'adrenaline', 'cascadia', 'caldera', 'catamount', 'launch', 'trace'],
    canonicalBrand: 'Brooks',
    logoUrl: '/assets/brands/brooks.svg',
    primaryColor: '#3b82f6',
    accentColor: '#3275bf',
    tagline: 'Run Happy • DNA Tuned / Flash',
  },
  {
    keywords: ['on running', 'on cloud', 'cloudmonster', 'cloudsurfer', 'cloudboom', 'cloudstratus', 'cloudflow', 'cloudrunner', 'cloudultra', 'cloudvista', 'cloudeclipse'],
    canonicalBrand: 'On Running',
    logoUrl: '/assets/brands/on.svg',
    primaryColor: '#38bdf8',
    accentColor: '#111111',
    tagline: 'Swiss Engineering • CloudTec®',
  },
  {
    keywords: ['puma', 'deviate', 'velocity', 'fast-r', 'foreverrun', 'magnify', 'magmax', 'electrify'],
    canonicalBrand: 'PUMA',
    logoUrl: '/assets/brands/puma.svg',
    primaryColor: '#f97316',
    accentColor: '#111111',
    tagline: 'Forever Faster • NITRO™ Elite',
  },
  {
    keywords: ['salomon', 'speedcross', 'ultra glide', 'pulsar', 'genesis', 'sense ride', 's/lab', 'slab', 'aero glide', 'phantasm', 'thundercross'],
    canonicalBrand: 'Salomon',
    logoUrl: '/assets/brands/salomon.svg',
    primaryColor: '#f43f5e',
    accentColor: '#111111',
    tagline: 'Time To Play • Energy Foam & Contagrip',
  },
  {
    keywords: ['mizuno', 'wave rider', 'wave rebellion', 'wave sky', 'wave inspire', 'wave horizon', 'wave mujin', 'neo vista', 'neo zen'],
    canonicalBrand: 'Mizuno',
    logoUrl: '/assets/brands/mizuno.svg',
    primaryColor: '#3b82f6',
    accentColor: '#003399',
    tagline: 'Reach Beyond • Mizuno Enerzy & Wave',
  },
  {
    keywords: ['kiprun', 'decathlon', 'kalenji', 'kd900', 'ks900', 'kd500', 'mt2', 'evadict'],
    canonicalBrand: 'Decathlon / Kiprun',
    logoUrl: '/assets/brands/decathlon.svg',
    primaryColor: '#6366f1',
    accentColor: '#3643ba',
    tagline: 'Kiprun Performance Lab • VFOAM',
  },
  {
    keywords: ['under armour', 'ua ', 'hovr', 'velociti', 'infinite', 'machina'],
    canonicalBrand: 'Under Armour',
    logoUrl: '/assets/brands/underarmour.svg',
    primaryColor: '#ef4444',
    accentColor: '#111111',
    tagline: 'UA Flow & HOVR Performance',
  },
  {
    keywords: ['reebok', 'floatride', 'floatzig', 'symmetros', 'nano'],
    canonicalBrand: 'Reebok',
    logoUrl: '/assets/brands/reebok.svg',
    primaryColor: '#3b82f6',
    accentColor: '#111111',
    tagline: 'Floatride Energy Foam',
  },
  {
    keywords: ['altra', 'lone peak', 'torin', 'escalante', 'olympus', 'timp', 'mont blanc', 'via olympus', 'vanish'],
    canonicalBrand: 'Altra',
    logoUrl: '/assets/brands/altra.svg',
    primaryColor: '#ef4444',
    accentColor: '#d9232a',
    tagline: 'Zero Drop™ & FootShape™',
  },
  {
    keywords: ['la sportiva', 'prodigio', 'akasha', 'jackal', 'mutant', 'bushido', 'cyklon'],
    canonicalBrand: 'La Sportiva',
    logoUrl: '/assets/brands/lasportiva.svg',
    primaryColor: '#eab308',
    accentColor: '#111111',
    tagline: 'Mountain Running® Innovation',
  },
  {
    keywords: ['scarpa', 'ribelle', 'spin', 'golden gate'],
    canonicalBrand: 'SCARPA',
    logoUrl: '/assets/brands/scarpa.svg',
    primaryColor: '#38bdf8',
    accentColor: '#111111',
    tagline: 'No Place Too Far • Trail',
  },
  {
    keywords: ['joma', 'hispalis', 'storm viper', 'r.2000', 'r.4000', 'sierra'],
    canonicalBrand: 'Joma',
    logoUrl: '/assets/brands/joma.svg',
    primaryColor: '#3b82f6',
    accentColor: '#1d4ed8',
    tagline: 'Joma Running Fly Reactive',
  },
  {
    keywords: ['diadora', 'nucleo', 'mito', 'frequenza', 'gara'],
    canonicalBrand: 'Diadora',
    logoUrl: '/assets/brands/diadora.svg',
    primaryColor: '#10b981',
    accentColor: '#111111',
    tagline: 'Anima NTX Italian Craft',
  },
  {
    keywords: ['fila', 'racer carbon', 'float max'],
    canonicalBrand: 'FILA',
    logoUrl: '/assets/brands/fila.svg',
    primaryColor: '#ef4444',
    accentColor: '#0b2265',
    tagline: 'FILA Speed Tech',
  },
  {
    keywords: ['merrell', 'agility peak', 'mtl ', 'skyfire', 'long sky', 'trail glove'],
    canonicalBrand: 'Merrell',
    logoUrl: '/assets/brands/merrell.svg',
    primaryColor: '#f97316',
    accentColor: '#ea580c',
    tagline: 'Merrell Test Lab • FloatPro',
  },
  {
    keywords: ['columbia', 'montrail', 'caldorado', 'konós', 'konos'],
    canonicalBrand: 'Columbia',
    logoUrl: '/assets/brands/columbia.svg',
    primaryColor: '#0284c7',
    accentColor: '#0369a1',
    tagline: 'Columbia Montrail Techlite+',
  },
  {
    keywords: ['north face', 'vectiv', 'enduris', 'sky2', 'prodigy'],
    canonicalBrand: 'The North Face',
    logoUrl: '/assets/brands/thenorthface.svg',
    primaryColor: '#ef4444',
    accentColor: '#dc2626',
    tagline: 'VECTIV™ Trail Propulsion',
  },
  {
    keywords: ['vibram', 'fivefingers', 'v-run', 'v-trail'],
    canonicalBrand: 'Vibram',
    logoUrl: '/assets/brands/vibram.svg',
    primaryColor: '#eab308',
    accentColor: '#ca8a04',
    tagline: 'Vibram® Megagrip & Litebase',
  },
  {
    keywords: ['karhu', 'ikoni', 'mestari', 'synchron', 'fusion'],
    canonicalBrand: 'Karhu',
    logoUrl: '/assets/brands/karhu.png',
    primaryColor: '#3b82f6',
    accentColor: '#1d4ed8',
    tagline: 'Fulcrum® Finnish Running Tech',
  },
];

export function resolveShoeBrandConfig(brandInput: string, shoeNameInput?: string): BrandVisualConfig {
  const combined = `${brandInput || ''} ${shoeNameInput || ''}`.toLowerCase();

  for (const item of OFFICIAL_BRANDS) {
    if (item.keywords.some((k) => combined.includes(k))) {
      return {
        canonicalBrand: item.canonicalBrand,
        logoUrl: item.logoUrl,
        primaryColor: item.primaryColor,
        accentColor: item.accentColor,
        tagline: item.tagline,
        isMatchedOfficial: true,
      };
    }
  }

  // Exact check for "On" brand word boundary
  if (/\bon\b/i.test(brandInput || '')) {
    return {
      canonicalBrand: 'On Running',
      logoUrl: '/assets/brands/on.svg',
      primaryColor: '#38bdf8',
      accentColor: '#111111',
      tagline: 'Swiss Engineering • CloudTec®',
      isMatchedOfficial: true,
    };
  }

  const cleanBrand =
    brandInput && brandInput !== 'Biegowe Pro'
      ? brandInput.trim()
      : shoeNameInput?.trim().split(' ')[0] || 'Running';

  return {
    canonicalBrand: cleanBrand,
    logoUrl: null,
    primaryColor: '#10b981',
    accentColor: '#0f172a',
    tagline: cleanBrand,
    isMatchedOfficial: false,
  };
}

const fetchedLogoCache = new Map<string, string>();

export const ShoeBrandLogo: React.FC<ShoeBrandLogoProps> = ({
  brand,
  shoeName,
  brandLogoUrl,
  primaryColor,
  size = 'md',
  showBadgeLabel = false,
}) => {
  const cfg = resolveShoeBrandConfig(brand, shoeName);
  const [dynamicLogoUrl, setDynamicLogoUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const effectiveLogoUrl = cfg.logoUrl || brandLogoUrl || dynamicLogoUrl;

  useEffect(() => {
    setImgError(false);
    if (cfg.logoUrl || brandLogoUrl) return;

    const queryKey = `${brand || ''}|${shoeName || ''}`.toLowerCase();
    if (fetchedLogoCache.has(queryKey)) {
      setDynamicLogoUrl(fetchedLogoCache.get(queryKey)!);
      return;
    }

    let cancelled = false;
    fetch(`/api/brand-logo?brand=${encodeURIComponent(brand || '')}&shoeName=${encodeURIComponent(shoeName || '')}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.logoUrl) {
          fetchedLogoCache.set(queryKey, data.logoUrl);
          setDynamicLogoUrl(data.logoUrl);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [brand, shoeName, brandLogoUrl, cfg.logoUrl]);

  const borderColor = primaryColor || cfg.primaryColor;

  const sizeClasses =
    size === 'lg'
      ? 'w-24 h-14 rounded-2xl px-2.5 py-1.5'
      : size === 'sm'
      ? 'w-12 h-8 rounded-xl px-1.5 py-1'
      : 'w-16 h-10 rounded-xl px-2 py-1.5';

  return (
    <div className="inline-flex items-center gap-2.5">
      <div
        className={`${sizeClasses} bg-white border-2 flex items-center justify-center shadow-md relative overflow-hidden shrink-0 transition-transform`}
        style={{ borderColor: `${borderColor}88` }}
        title={cfg.canonicalBrand}
      >
        {effectiveLogoUrl && !imgError ? (
          <img
            src={effectiveLogoUrl}
            alt={cfg.canonicalBrand}
            className="w-full h-full object-contain select-none"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-[10px] font-black uppercase tracking-tight text-slate-900 text-center leading-none truncate px-0.5">
            {cfg.canonicalBrand.slice(0, 10)}
          </span>
        )}
      </div>

      {showBadgeLabel && (
        <div className="min-w-0">
          <div className="text-xs font-black text-white truncate">{cfg.canonicalBrand}</div>
          <div className="text-[10px] txt-muted truncate">{cfg.tagline}</div>
        </div>
      )}
    </div>
  );
};

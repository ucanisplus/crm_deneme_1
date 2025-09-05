/**
 * Unified Product Calculator - Brain System
 * Connects all product calculation formulas from analyzed components
 * Provides standardized calculation interface for all product types
 */

export interface ProductSpecifications {
  // Galvanizli Tel
  galvanizli_tel?: {
    cap: number;
    kod_2: 'NIT' | 'PAD';
    kaplama: number;
    min_mukavemet: number;
    max_mukavemet: number;
    kg: number;
    ic_cap: number;
    dis_cap: number;
    tolerans_plus: number;
    tolerans_minus: number;
    shrink?: boolean;
    paletli?: boolean;
  };

  // Panel Çit
  panel_cit?: {
    panel_tipi: 'Single' | 'Double' | 'Guvenlik' | 'Ozel';
    boy: number;
    en: number;
    dikey_tel_capi: number;
    yatay_tel_capi: number;
    dikey_goz_araligi: number;
    yatay_goz_araligi: number;
    bukum_sayisi: number;
    bukumdeki_cubuk_sayisi: number;
    boyali?: boolean;
    renk?: string;
  };

  // Çelik Hasır
  celik_hasir?: {
    hasir_tipi: string;
    boy: number;
    en: number;
    boyCap: number;
    enCap: number;
    boyAraligi: number;
    enAraligi: number;
    adet: number;
  };

  // Çivi
  civi?: {
    civi_tipi: 'Dökme' | 'Tele Dizgi' | 'Plastik Dizgi';
    cap: number;
    uzunluk: number;
    paket_tipi?: string;
    galvanizli?: boolean;
  };

  // Profil
  profil?: {
    profil_en1: number;
    profil_en2: number;
    et_kalinligi: number;
    yukseklik: number;
    galvanizli?: boolean;
    flansli?: boolean;
    vida_adet?: number;
    klips_adet?: number;
    dubel_adet?: number;
    kapak_adet?: number;
  };
}

export interface CalculationResult {
  product_type: string;
  weight?: number;
  surface_area?: number;
  raw_materials: Record<string, number>;
  production_time: number;
  unit_cost?: number;
  stok_kodu: string;
  stok_adi: string;
  specifications: Record<string, any>;
}

export interface ProductionParameters {
  filmasin_mapping: Record<number, Array<{ filmasin: number; quality: string }>>;
  setup_times: Record<string, number>;
  capacity_rates: Record<string, number>;
  material_costs: Record<string, number>;
}

export class ProductCalculator {
  private parameters: ProductionParameters;

  constructor(parameters: ProductionParameters) {
    this.parameters = parameters;
  }

  // Galvanizli Tel Calculations (based on GalvanizliTelNetsis.jsx analysis)
  calculateGalvanizliTel(specs: ProductSpecifications['galvanizli_tel']): CalculationResult {
    if (!specs) throw new Error('Galvanizli tel specifications required');

    const { cap, kod_2, kaplama, kg, ic_cap, dis_cap } = specs;

    // Surface area calculation: (1000 * 4000 / π / cap² / 7.85 * cap * π / 1000)
    const yuzeyAlani = (1000 * 4000 / Math.PI / cap / cap / 7.85 * cap * Math.PI / 1000);

    // Zinc consumption: ((1000 * 4000 / π / 7.85 / cap² * cap * π / 1000 * kaplama / 1000) + ash + lapa) / 1000
    const zincConsumption = parseFloat((
      ((1000 * 4000 / Math.PI / 7.85 / cap / cap * cap * Math.PI / 1000 * kaplama / 1000) + 
      (5.54 * 0.6) + (2.73 * 0.7)) / 1000
    ).toFixed(5));

    // Acid consumption: (surface_area * consumed_acid) / 1000
    const acidConsumption = parseFloat(((yuzeyAlani * 30000) / 1000).toFixed(5));

    // Raw materials consumption
    const rawMaterials: Record<string, number> = {
      'FLM': this.calculateFilmasinConsumption(cap, kg),
      '150 03': zincConsumption, // Çinko
      'SM.HIDROLİK.ASİT': acidConsumption,
      'AMB.SHRİNK': specs.shrink ? this.calculateShrinkConsumption(kg) : 0,
      'AMB.APEX CEMBER': 1.2 * (1000 / kg) / 1000, // Steel band
      'AMB.TOKA.SIGNODE': 4.0 * (1000 / kg) / 1000  // Buckles
    };

    // Generate stock code: GT.{kod_2}.{cap_formatted}.{sequence}
    const capFormatted = String(Math.round(cap * 100)).padStart(4, '0');
    const stokKodu = `GT.${kod_2}.${capFormatted}.00`;

    // Generate stock name
    const toleranceText = `${-Math.abs(specs.tolerans_minus).toFixed(2)}/+${Math.abs(specs.tolerans_plus).toFixed(2)}`;
    const stokAdi = `Galvanizli Tel ${cap.toFixed(2)} mm ${toleranceText} ${kaplama} gr/m² ${specs.min_mukavemet}-${specs.max_mukavemet} MPa ID:${ic_cap} cm OD:${dis_cap} cm ${kg} kg`;

    return {
      product_type: 'galvanizli_tel',
      weight: kg,
      surface_area: yuzeyAlani,
      raw_materials: rawMaterials,
      production_time: this.calculateGLVProductionTime(cap, kg),
      stok_kodu: stokKodu,
      stok_adi: stokAdi,
      specifications: specs
    };
  }

  // Panel Çit Calculations (based on PanelCitHesaplama.jsx analysis)
  calculatePanelCit(specs: ProductSpecifications['panel_cit']): CalculationResult {
    if (!specs) throw new Error('Panel çit specifications required');

    const { panel_tipi, boy, en, dikey_tel_capi, yatay_tel_capi } = specs;

    // Panel surface area calculation
    const surfaceArea = (boy * en) / 10000; // m²

    // Weight calculation based on panel type and dimensions
    let baseWeight = this.calculatePanelWeight(panel_tipi, boy, en, dikey_tel_capi, yatay_tel_capi);

    // Paint weight if painted
    let paintWeight = 0;
    if (specs.boyali) {
      const paintConsumption = this.getPaintConsumption(panel_tipi); // gr/m²
      paintWeight = (surfaceArea * paintConsumption) / 1000; // kg
    }

    const totalWeight = baseWeight + paintWeight;

    // Raw materials
    const rawMaterials: Record<string, number> = {
      'galvanizli_tel': baseWeight, // Galvanized wire consumption
      'boya': paintWeight,
      'flans': 0.385, // Flange weight
      'vida': this.getHardwareCount(boy, 'vida') * 0.01, // Screws
      'klips': this.getHardwareCount(boy, 'klips') * 0.005 // Clips
    };

    // Generate stock code
    const capStr = `${dikey_tel_capi} * ${yatay_tel_capi}`;
    const ebatStr = `${boy} * ${en}`;
    const gozStr = `${specs.yatay_goz_araligi} * ${specs.dikey_goz_araligi}`;
    const bukumStr = `${specs.bukum_sayisi ?? 0}-${specs.bukumdeki_cubuk_sayisi ?? 0}`;
    const prefix = panel_tipi === "Single" ? 'SP' : (panel_tipi === "Guvenlik" ? 'GP' : 'DP');
    
    const stokKodu = `${prefix}_Cap:${capStr}_Eb:${ebatStr}_Gz:${gozStr}_Buk:${bukumStr}`;
    const stokAdi = `Panel Çit ${panel_tipi} ${boy}x${en}cm Ø${dikey_tel_capi}x${yatay_tel_capi}mm${specs.boyali ? ' Boyalı' : ''}`;

    return {
      product_type: 'panel_cit',
      weight: totalWeight,
      surface_area: surfaceArea,
      raw_materials: rawMaterials,
      production_time: this.calculatePanelProductionTime(panel_tipi, surfaceArea, specs.boyali || false),
      stok_kodu: stokKodu,
      stok_adi: stokAdi,
      specifications: specs
    };
  }

  // Çelik Hasır Calculations (based on CelikHasirNetsis.jsx analysis)
  calculateCelikHasir(specs: ProductSpecifications['celik_hasir']): CalculationResult {
    if (!specs) throw new Error('Çelik hasır specifications required');

    const { boy, en, boyCap, enCap, adet } = specs;

    // Calculate bar counts
    const cubukSayisiBoy = Math.ceil(boy / specs.boyAraligi) + 1;
    const cubukSayisiEn = Math.ceil(en / specs.enAraligi) + 1;

    // Weight calculations per piece
    const boyLength = cubukSayisiBoy * 500; // cm - standard length
    const enLength = cubukSayisiEn * 215; // cm - standard length
    const totalLength = boyLength + enLength;

    // Weight formula: (diameter² × π × 7.85 × length) / 4000000
    const unitWeight = (boyCap * boyCap * Math.PI * 7.85 * totalLength / 4000000) * adet;

    // Raw materials (NCBK - Nervürlü Çubuk consumption)
    const rawMaterials: Record<string, number> = {
      [`NCBK.${String(Math.round(boyCap * 100)).padStart(4, '0')}.500`]: cubukSayisiBoy * adet,
      [`NCBK.${String(Math.round(enCap * 100)).padStart(4, '0')}.215`]: cubukSayisiEn * adet,
      'FLM.0600.1008': (totalLength * boyCap * boyCap * Math.PI * 7.85 / 4000000) * adet // Filmaşin consumption
    };

    // Generate stock code
    const isStandard = (boy === 500 && en === 215);
    const stokKodu = isStandard 
      ? `CHSTD${String(Math.round(boyCap * 100)).padStart(4, '0')}`
      : `CHOZL${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

    const stokAdi = `Çelik Hasır ${specs.hasir_tipi} ${boy}x${en}cm Ø${boyCap}mm ${adet} adet`;

    return {
      product_type: 'celik_hasir',
      weight: unitWeight,
      surface_area: (boy * en * adet) / 10000,
      raw_materials: rawMaterials,
      production_time: this.calculateHasirProductionTime(adet, boy * en),
      stok_kodu: stokKodu,
      stok_adi: stokAdi,
      specifications: { ...specs, cubukSayisiBoy, cubukSayisiEn }
    };
  }

  // Çivi Calculations
  calculateCivi(specs: ProductSpecifications['civi']): CalculationResult {
    if (!specs) throw new Error('Çivi specifications required');

    const { civi_tipi, cap, uzunluk } = specs;

    // Weight per 1000 pieces: (diameter² × π × length × 7.85) / 4000
    const weightPer1000 = (cap * cap * Math.PI * uzunluk * 7.85) / 4000;

    // Production speed based on machine type (nails per minute)
    const productionSpeed = this.getCiviProductionSpeed(civi_tipi, cap);

    const rawMaterials: Record<string, number> = {
      'tel_hammadde': weightPer1000 / 1000, // kg per piece
      'galvaniz_kaplama': specs.galvanizli ? 0.01 : 0 // Galvanizing if required
    };

    const stokKodu = `CIVI.${civi_tipi.toUpperCase()}.${String(Math.round(cap * 100)).padStart(3, '0')}.${uzunluk}`;
    const stokAdi = `Çivi ${civi_tipi} Ø${cap}mm x ${uzunluk}mm${specs.galvanizli ? ' Galvanizli' : ''}`;

    return {
      product_type: 'civi',
      weight: weightPer1000,
      raw_materials: rawMaterials,
      production_time: this.calculateCiviProductionTime(civi_tipi, productionSpeed),
      stok_kodu: stokKodu,
      stok_adi: stokAdi,
      specifications: specs
    };
  }

  // Profil Calculations (based on ProfilHesaplama.jsx analysis)
  calculateProfil(specs: ProductSpecifications['profil']): CalculationResult {
    if (!specs) throw new Error('Profil specifications required');

    const { profil_en1, profil_en2, et_kalinligi, yukseklik } = specs;

    // Cross-sectional area calculation (hollow rectangle)
    const outerArea = profil_en1 * profil_en2;
    const innerWidth = profil_en1 - 2 * et_kalinligi;
    const innerHeight = profil_en2 - 2 * et_kalinligi;
    const innerArea = innerWidth * innerHeight;
    const crossSectionalArea = outerArea - innerArea;

    // Corner radius correction (1.2% reduction)
    const correctedArea = crossSectionalArea * 0.988;
    const lengthInMm = yukseklik * 10;

    // Base weight: Area × Length × Density (7.85 g/cm³)
    let profilWeight = (correctedArea * lengthInMm * 0.00785) / 1000;

    // Galvanized coating weight (400 g/m²)
    if (specs.galvanizli) {
      const perimeter = 2 * (profil_en1 + profil_en2);
      const surfaceAreaM2 = (perimeter * lengthInMm) / 1000000;
      const galvanizCoatingWeight = surfaceAreaM2 * 0.400;
      profilWeight += galvanizCoatingWeight;
    }

    // Flange weight (385g each)
    if (specs.flansli) {
      profilWeight += 0.385;
    }

    const rawMaterials: Record<string, number> = {
      'profil_material': profilWeight,
      'galvaniz_kaplama': specs.galvanizli ? 0.1 : 0,
      'flans': specs.flansli ? 1 : 0,
      'vida': specs.vida_adet || 0,
      'klips': specs.klips_adet || 0,
      'dubel': specs.dubel_adet || 0,
      'kapak': specs.kapak_adet || 0
    };

    const stokKodu = `PROFIL.${profil_en1}x${profil_en2}x${et_kalinligi}x${yukseklik}${specs.galvanizli ? '.GAL' : ''}${specs.flansli ? '.FLN' : ''}`;
    const stokAdi = `Profil ${profil_en1}x${profil_en2}x${et_kalinligi}mm x ${yukseklik}cm${specs.galvanizli ? ' Galvanizli' : ''}${specs.flansli ? ' Flanşlı' : ''}`;

    return {
      product_type: 'profil',
      weight: profilWeight,
      raw_materials: rawMaterials,
      production_time: this.calculateProfilProductionTime(yukseklik, specs.galvanizli || false),
      stok_kodu: stokKodu,
      stok_adi: stokAdi,
      specifications: specs
    };
  }

  // Helper calculation methods
  private calculateFilmasinConsumption(cap: number, kg: number): number {
    // Based on analysis: use filmaşin mapping for specific diameters
    const mapping = this.parameters.filmasin_mapping[cap];
    if (mapping && mapping.length > 0) {
      return kg * 1.05; // 5% consumption overhead
    }
    return kg * 1.1; // 10% overhead for non-standard diameters
  }

  private calculateGLVProductionTime(cap: number, kg: number): number {
    // GLV time formula: (1000 * 4000 / cap² / π / 7.85 / dvValue * cap) / 1000
    const dvValue = 5000; // Default drawing speed
    const glvTimeRaw = (1000 * 4000 / cap / cap / Math.PI / 7.85 / dvValue * cap);
    return parseFloat((glvTimeRaw / 1000).toFixed(5));
  }

  private calculatePanelWeight(panel_tipi: string, boy: number, en: number, dikey_cap: number, yatay_cap: number): number {
    // Simplified weight calculation based on dimensions and wire diameters
    const area = (boy * en) / 10000; // m²
    const wireLength = this.calculateWireLength(boy, en, dikey_cap, yatay_cap);
    return (dikey_cap * dikey_cap + yatay_cap * yatay_cap) * Math.PI * 7.85 * wireLength / 4000000;
  }

  private calculateWireLength(boy: number, en: number, dikey_cap: number, yatay_cap: number): number {
    // Estimate wire length based on mesh dimensions
    const dikeyCount = Math.ceil(boy / 5); // Assume 5cm spacing
    const yatayCount = Math.ceil(en / 20); // Assume 20cm spacing
    return (dikeyCount * en + yatayCount * boy);
  }

  private getPaintConsumption(panel_tipi: string): number {
    // Paint consumption in gr/m² based on panel type
    switch (panel_tipi) {
      case 'Single': return 350;
      case 'Double': return 400;
      case 'Guvenlik': return 450;
      default: return 350;
    }
  }

  private getHardwareCount(boy: number, type: 'vida' | 'klips'): number {
    if (boy <= 100) return 2;
    if (boy <= 150) return 3;
    return 4;
  }

  private calculatePanelProductionTime(panel_tipi: string, area: number, painted: boolean): number {
    let baseTime = area * 2; // 2 hours per m²
    if (painted) baseTime += area * 1; // Additional 1 hour per m² for painting
    return baseTime;
  }

  private calculateHasirProductionTime(adet: number, area: number): number {
    return (adet * area) / 10000 * 0.5; // 0.5 hours per m²
  }

  private getCiviProductionSpeed(civi_tipi: string, cap: number): number {
    // Production speed in nails per minute
    switch (civi_tipi) {
      case 'Dökme': return cap < 3 ? 1250 : 800;
      case 'Tele Dizgi': return 2500;
      case 'Plastik Dizgi': return 2500;
      default: return 1000;
    }
  }

  private calculateCiviProductionTime(civi_tipi: string, speed: number): number {
    return 60 / speed; // Hours to produce 1000 pieces
  }

  private calculateProfilProductionTime(length: number, galvanized: boolean): number {
    let time = length / 100; // Base: 1 hour per meter
    if (galvanized) time += 0.5; // Additional 30 minutes for galvanizing
    return time;
  }

  private calculateShrinkConsumption(kg: number): number {
    // Shrink consumption based on coil weight
    if (kg <= 500) return 2.5;
    if (kg <= 1000) return 4.0;
    if (kg <= 1500) return 5.5;
    return 7.0;
  }
}

// Default production parameters
export const DEFAULT_PRODUCTION_PARAMETERS: ProductionParameters = {
  filmasin_mapping: {
    2.50: [{ filmasin: 3.0, quality: '1006' }, { filmasin: 3.0, quality: '1008' }],
    3.20: [{ filmasin: 4.0, quality: '1006' }, { filmasin: 4.0, quality: '1008' }],
    4.20: [{ filmasin: 5.0, quality: '1006' }, { filmasin: 5.0, quality: '1008' }],
    5.00: [{ filmasin: 6.0, quality: '1006' }, { filmasin: 6.0, quality: '1008' }]
  },
  setup_times: {
    'galvanizli_tel': 45, // minutes
    'panel_cit': 30,
    'celik_hasir': 60,
    'civi': 15,
    'profil': 20
  },
  capacity_rates: {
    'galvanizli_tel': 5.354, // kg/hour
    'panel_cit': 125, // pieces/hour
    'celik_hasir': 50, // pieces/hour
    'civi': 1000, // kg/hour
    'profil': 200 // pieces/hour
  },
  material_costs: {
    'FLM': 25.50, // USD per kg
    '150 03': 2.80, // USD per kg
    'SM.HIDROLİK.ASİT': 1.20, // USD per kg
    'galvanizli_tel': 42.80, // USD per kg
    'boya': 15.00, // USD per kg
    'profil_material': 35.00 // USD per kg
  }
};

// Export singleton instance
export const productCalculator = new ProductCalculator(DEFAULT_PRODUCTION_PARAMETERS);
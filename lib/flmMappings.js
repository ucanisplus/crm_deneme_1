// FLM (Filmaşin) mappings for rod diameters
// Based on production data analysis

export const flmMappings = {
  // Rod diameter ranges to FLM specifications
  ranges: [
    { minDiameter: 4.2, maxDiameter: 5.0, flmDiameter: 6, quality: '1008' },
    { minDiameter: 5.2, maxDiameter: 5.6, flmDiameter: 6.5, quality: '1008' },
    { minDiameter: 5.8, maxDiameter: 6.0, flmDiameter: 7, quality: '1008' },
    { minDiameter: 6.2, maxDiameter: 6.5, flmDiameter: 8, quality: '1008' },
    { minDiameter: 6.8, maxDiameter: 7.0, flmDiameter: 8, quality: '1010' },
    { minDiameter: 7.2, maxDiameter: 8.0, flmDiameter: 9, quality: '1010' },
    { minDiameter: 8.2, maxDiameter: 9.0, flmDiameter: 10, quality: '1010' },
    { minDiameter: 9.2, maxDiameter: 10.0, flmDiameter: 11, quality: '1010' },
    { minDiameter: 10.2, maxDiameter: 11.0, flmDiameter: 12, quality: '1010' },
    { minDiameter: 11.2, maxDiameter: 12.0, flmDiameter: 13, quality: '1010' },
    { minDiameter: 12.2, maxDiameter: 14.0, flmDiameter: 16, quality: '1010' }
  ],
  
  // Available FLM diameters
  availableDiameters: [6, 6.5, 7, 8, 9, 10, 11, 12, 13, 16],
  
  // Available FLM qualities
  availableQualities: ['1008', '1010'],
  
  // Get suggested FLM for a given rod diameter
  getSuggestedFLM: (rodDiameter) => {
    const range = flmMappings.ranges.find(
      r => rodDiameter >= r.minDiameter && rodDiameter <= r.maxDiameter
    );
    
    if (range) {
      return {
        diameter: range.flmDiameter,
        quality: range.quality
      };
    }
    
    // Default for out of range
    if (rodDiameter < 4.2) {
      return { diameter: 6, quality: '1008' };
    }
    return { diameter: 16, quality: '1010' };
  }
};
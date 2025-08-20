// Mesh Configuration Service - Database Version
// This replaces the hardcoded hasirReferenceData and qTypeReferenceMap in CelikHasirHesaplama.jsx

import { API_URLS } from '@/api-config';

class MeshConfigService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = 0;
  }

  // Load all mesh configurations from database
  async loadMeshConfigs() {
    try {
      const now = Date.now();
      if (this.cache.size > 0 && now - this.lastCacheUpdate < this.cacheTimeout) {
        return this.cache;
      }

      const response = await fetch(API_URLS.meshTypeConfigs);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const configs = await response.json();
      
      // Clear and repopulate cache
      this.cache.clear();
      configs.forEach(config => {
        this.cache.set(config.hasir_tipi, {
          boyCap: parseFloat(config.boy_cap),
          enCap: parseFloat(config.en_cap),
          boyAralik: parseFloat(config.boy_aralik),
          enAralik: parseFloat(config.en_aralik),
          type: config.type,
          description: config.description
        });
      });

      this.lastCacheUpdate = now;
      console.log(`Loaded ${configs.length} mesh configurations from database`);
      return this.cache;
    } catch (error) {
      console.error('Error loading mesh configurations:', error);
      
      // Return cached data if available, even if stale
      if (this.cache.size > 0) {
        console.warn('Using stale cached mesh configurations');
        return this.cache;
      }
      
      // Fallback to empty cache
      return new Map();
    }
  }

  // Get specific mesh configuration
  async getMeshConfig(hasirTipi) {
    const configs = await this.loadMeshConfigs();
    return configs.get(hasirTipi) || null;
  }

  // Get mesh configurations by type
  async getMeshConfigsByType(type) {
    const configs = await this.loadMeshConfigs();
    const typeConfigs = new Map();
    
    configs.forEach((config, hasirTipi) => {
      if (config.type === type.toUpperCase()) {
        typeConfigs.set(hasirTipi, config);
      }
    });
    
    return typeConfigs;
  }

  // Save new mesh configuration
  async saveMeshConfig(meshConfig) {
    try {
      const response = await fetch(API_URLS.meshTypeConfigs, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hasirTipi: meshConfig.hasirTipi,
          boyCap: meshConfig.boyCap,
          enCap: meshConfig.enCap,
          boyAralik: meshConfig.boyAralik,
          enAralik: meshConfig.enAralik,
          type: meshConfig.type,
          description: meshConfig.description
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save mesh configuration');
      }

      const result = await response.json();
      
      // Update cache
      this.cache.set(meshConfig.hasirTipi, {
        boyCap: meshConfig.boyCap,
        enCap: meshConfig.enCap,
        boyAralik: meshConfig.boyAralik,
        enAralik: meshConfig.enAralik,
        type: meshConfig.type,
        description: meshConfig.description
      });

      console.log(`Saved mesh configuration: ${meshConfig.hasirTipi}`);
      return result.data;
    } catch (error) {
      console.error('Error saving mesh configuration:', error);
      throw error;
    }
  }

  // Check if mesh type exists
  async meshTypeExists(hasirTipi) {
    const config = await this.getMeshConfig(hasirTipi);
    return config !== null;
  }

  // Get similar mesh types (for fallback)
  async getSimilarMeshTypes(hasirTipi) {
    const configs = await this.loadMeshConfigs();
    const type = hasirTipi.replace(/\d+/g, '').toUpperCase();
    const number = parseInt(hasirTipi.replace(/\D/g, '')) || 0;
    
    const similar = [];
    configs.forEach((config, key) => {
      if (config.type === type && key !== hasirTipi) {
        const keyNumber = parseInt(key.replace(/\D/g, '')) || 0;
        const diff = Math.abs(keyNumber - number);
        similar.push({ hasirTipi: key, config, diff });
      }
    });

    return similar.sort((a, b) => a.diff - b.diff).slice(0, 5);
  }

  // Create Q type reference map (for backward compatibility)
  async getQTypeReferenceMap() {
    const qConfigs = await this.getMeshConfigsByType('Q');
    const qTypeMap = {};
    
    qConfigs.forEach((config, hasirTipi) => {
      // Remove the /XXX suffix if present for single Q types
      const singleType = hasirTipi.replace(/\/\d+$/, '');
      if (!qTypeMap[singleType]) {
        qTypeMap[singleType] = config.boyCap;
      }
    });
    
    return qTypeMap;
  }

  // Create hasir reference data map (for backward compatibility)
  async getHasirReferenceData() {
    const configs = await this.loadMeshConfigs();
    const referenceData = {};
    
    configs.forEach((config, hasirTipi) => {
      referenceData[hasirTipi] = {
        boyCap: config.boyCap,
        enCap: config.enCap,
        boyAralik: config.boyAralik,
        enAralik: config.enAralik,
        type: config.type
      };
    });
    
    return referenceData;
  }

  // Clear cache (useful for testing or forcing refresh)
  clearCache() {
    this.cache.clear();
    this.lastCacheUpdate = 0;
  }

  // Get cache info
  getCacheInfo() {
    return {
      size: this.cache.size,
      lastUpdate: new Date(this.lastCacheUpdate).toISOString(),
      isStale: Date.now() - this.lastCacheUpdate > this.cacheTimeout
    };
  }
}

// Export singleton instance
const meshConfigService = new MeshConfigService();
export default meshConfigService;

// Also export utility functions for direct use
export const getMeshConfig = (hasirTipi) => meshConfigService.getMeshConfig(hasirTipi);
export const saveMeshConfig = (meshConfig) => meshConfigService.saveMeshConfig(meshConfig);
export const meshTypeExists = (hasirTipi) => meshConfigService.meshTypeExists(hasirTipi);
export const loadMeshConfigs = () => meshConfigService.loadMeshConfigs();
export const getHasirReferenceData = () => meshConfigService.getHasirReferenceData();
export const getQTypeReferenceMap = () => meshConfigService.getQTypeReferenceMap();
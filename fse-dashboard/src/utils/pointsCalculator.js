/**
 * Dynamic Points Calculator
 * Fetches points configuration from API and calculates points for products
 */

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

// Cache for points configuration (refreshed every 5 minutes)
let pointsConfigCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch points configuration from API
 * Uses cache to avoid excessive API calls
 */
export async function fetchPointsConfig() {
  const now = Date.now();
  
  // Return cached config if still valid
  if (pointsConfigCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return pointsConfigCache;
  }
  
  try {
    const res = await fetch(`${EMP_API}/points-config`);
    if (!res.ok) {
      console.warn('Failed to fetch points config, using fallback');
      return getFallbackPointsMap();
    }
    
    const data = await res.json();
    
    // Convert to simple map for easy lookup
    const pointsMap = {};
    
    data.configs.forEach(config => {
      const productKey = config.productName.toLowerCase().trim();
      
      const configData = {
        type: config.productType,
        fieldMapping: config.fieldMapping || {},
      };
      
      if (config.productType === 'simple') {
        configData.points = config.simplePoints;
      } else if (config.productType === 'complex') {
        configData.plans = {};
        
        config.plans.forEach(plan => {
          const planKey = plan.planName.toLowerCase();
          configData.plans[planKey] = {};
          
          plan.tiers.forEach(tier => {
            const tierKey = tier.name.toLowerCase();
            configData.plans[planKey][tierKey] = {
              points: tier.points,
              price: tier.price
            };
          });
        });
      } else if (config.productType === 'mapped') {
        configData.valueMapping = config.valueMapping || [];
      }
      
      pointsMap[productKey] = configData;
    });
    
    pointsConfigCache = pointsMap;
    cacheTimestamp = now;
    
    console.log('✅ Points configuration loaded:', pointsMap);
    return pointsMap;
    
  } catch (error) {
    console.error('Error fetching points config:', error);
    return getFallbackPointsMap();
  }
}

/**
 * Get points for a product (Legacy function, use calculateFormPoints instead)
 */
export async function getProductPoints(productName, planName = null, tierName = null, price = null, pointsMap = null) {
  // Stub for backward compatibility
  return 0;
}

/**
 * Get simple points map (for backward compatibility)
 */
export async function getSimplePointsMap() {
  const pointsMap = await fetchPointsConfig();
  const simpleMap = {};
  
  Object.entries(pointsMap).forEach(([product, config]) => {
    if (config.type === 'simple') {
      simpleMap[product] = config.points;
    } else {
      simpleMap[product] = 0;
    }
  });
  
  return simpleMap;
}

/**
 * Fallback points map when API is unavailable
 */
function getFallbackPointsMap() {
  console.warn('⚠️ Using fallback points map');
  return {
    'tide': 2,
    'tide msme': 0.3,
    'msme': 0.3,
    'tide insurance': 1,
    'tide credit card': 1,
    'tide bt': 1
  };
}

/**
 * Clear cache (useful when points config is updated)
 */
export function clearPointsCache() {
  pointsConfigCache = null;
  cacheTimestamp = 0;
  console.log('🔄 Points cache cleared');
}

/**
 * Calculate points for a form dynamically based on database configurations and field mappings
 * @param {object} form - Form object with product info
 * @param {object} pointsMap - Pre-loaded points map
 * @returns {number} Points for the form
 */
export async function calculateFormPoints(form, pointsMap = null) {
  // Extract month from form (could be _month, month, or derived from createdAt)
  let formMonth = form._month || form.month;
  
  if (!formMonth && form.createdAt) {
    const date = new Date(form.createdAt);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    formMonth = `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // Fallback for May 2026 or earlier
  if (formMonth) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const parts = formMonth.split(' ');
    if (parts.length >= 1) {
      const m = parts[0];
      const y = parts.length > 1 ? parseInt(parts[1]) : new Date().getFullYear();
      
      const mIdx = months.indexOf(m);
      if ((y === 2026 && mIdx <= 4) || y < 2026) {
        const fallbackProductName = form.formFillingFor || form.tideProduct || form.brand || '';
        const fallbackMap = getFallbackPointsMap();
        return fallbackMap[fallbackProductName.toLowerCase().trim()] || 0;
      }
    }
  }

  // For June 2026 onwards, use dynamic points mapping!
  if (!pointsMap) {
    pointsMap = await fetchPointsConfig();
  }

  // Iterate over all database configurations to find a match
  for (const [configProductName, config] of Object.entries(pointsMap)) {
    // 1. What column maps to the "Product Name"? (Default to formFillingFor if not mapped)
    const productField = config.fieldMapping?.productField || 'formFillingFor';
    
    // Extract the actual product name from the form using that mapping
    const actualProductName = String(form[productField] || form.tideProduct || form.brand || '').toLowerCase().trim();

    // 2. Does this form match this configuration?
    if (actualProductName === configProductName) {
      
      // If it's a Simple Product, just return the flat points!
      if (config.type === 'simple') {
        return config.points || 0;
      }

      // If it's a Mapped Product, return points from value mapping
      if (config.type === 'mapped') {
        const mappedColumn = config.fieldMapping?.mappedColumn;
        if (!mappedColumn) return 0;
        
        const actualValue = String(form[mappedColumn] || '').toLowerCase().trim();
        const mapping = config.valueMapping?.find(m => String(m.value).toLowerCase().trim() === actualValue);
        
        if (mapping) return mapping.points;
        return 0; // Value not mapped
      }
      
      // If it's a Complex Product, we need to match the Plan and Tier
      if (config.type === 'complex') {
        
        // Find which column has the Plan Name
        const planField = config.fieldMapping?.planField || 'planName';
        const actualPlanName = String(form[planField] || '').toLowerCase().trim();
        
        if (!actualPlanName || !config.plans[actualPlanName]) {
          continue; // Try next config if plan doesn't match
        }
        
        const plan = config.plans[actualPlanName];
        
        // Find which columns have Tier and Price
        const tierField = config.fieldMapping?.tierField || 'tierName';
        const priceField = config.fieldMapping?.priceField || 'price';
        
        const actualTierName = String(form[tierField] || form.variant || '').toLowerCase().trim();
        const actualPrice = parseFloat(form[priceField] || form.amount || 0);
        
        // Try exact Tier match first
        if (actualTierName && plan[actualTierName]) {
          return plan[actualTierName].points;
        }
        
        // If no Tier match, try matching by closest Price
        if (actualPrice > 0) {
          let closestTier = null;
          let minDiff = Infinity;
          
          Object.values(plan).forEach(tier => {
            if (tier.price) {
              const diff = Math.abs(tier.price - actualPrice);
              if (diff < minDiff) {
                minDiff = diff;
                closestTier = tier;
              }
            }
          });
          
          if (closestTier) {
            return closestTier.points;
          }
        }
        
        // If nothing matched in the complex product, try next config or return 0
        return 0;
      }
    }
  }

  // No configuration matched this form
  return 0;
}


export function calculateFormPointsSync(form, pointsMap = null) {
  let formMonth = form._month || form.month;
  
  if (!formMonth && form.createdAt) {
    const date = new Date(form.createdAt);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    formMonth = `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  const fallbackProductName = (form.formFillingFor || form.tideProduct || form.brand || '').toLowerCase().trim();
  const fallbackMap = getFallbackPointsMap();

  if (formMonth) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const parts = formMonth.split(' ');
    if (parts.length >= 1) {
      const m = parts[0];
      const y = parts.length > 1 ? parseInt(parts[1]) : new Date().getFullYear();
      
      const mIdx = months.indexOf(m);
      if ((y === 2026 && mIdx <= 4) || y < 2026 || !pointsMap) {
        return fallbackMap[fallbackProductName] || 0;
      }
    }
  }

  if (!pointsMap) return fallbackMap[fallbackProductName] || 0;

  for (const [configProductName, config] of Object.entries(pointsMap)) {
    const productField = config.fieldMapping?.productField || 'formFillingFor';
    const actualProductName = String(form[productField] || form.tideProduct || form.brand || '').toLowerCase().trim();

    if (actualProductName === configProductName) {
      if (config.type === 'simple') return config.points || 0;
      
      if (config.type === 'mapped') {
        const mappedColumn = config.fieldMapping?.mappedColumn;
        if (!mappedColumn) return 0;
        const actualValue = String(form[mappedColumn] || '').toLowerCase().trim();
        const mapping = config.valueMapping?.find(m => String(m.value).toLowerCase().trim() === actualValue);
        if (mapping) return mapping.points;
        return 0;
      }
      
      if (config.type === 'complex') {
        const planField = config.fieldMapping?.planField || 'planName';
        const actualPlanName = String(form[planField] || '').toLowerCase().trim();
        if (!actualPlanName || !config.plans[actualPlanName]) continue;
        const plan = config.plans[actualPlanName];
        
        const tierField = config.fieldMapping?.tierField || 'tierName';
        const priceField = config.fieldMapping?.priceField || 'price';
        const actualTierName = String(form[tierField] || form.variant || '').toLowerCase().trim();
        const actualPrice = parseFloat(form[priceField] || form.amount || 0);
        
        if (actualTierName && plan[actualTierName]) return plan[actualTierName].points;
        
        if (actualPrice > 0) {
          let closestTier = null;
          let minDiff = Infinity;
          Object.values(plan).forEach(tier => {
            if (tier.price) {
              const diff = Math.abs(tier.price - actualPrice);
              if (diff < minDiff) { minDiff = diff; closestTier = tier; }
            }
          });
          if (closestTier) return closestTier.points;
        }
        return 0;
      }
    }
  }
  return 0;
}

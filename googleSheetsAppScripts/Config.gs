/* Configuration Settings 
  Defines your Sheet Names and Business Rules
*/

const Config = {
  SHEET_NAMES: {
    prospects: "Prospects",
    outreach: "Outreach",
    currentPrices: "Current Pricing", // Or "K&L Recycling CRM - Current Pricing" if unedited
    settings: "Settings"
  },
  
  INDUSTRY_VALUES: {
    'Metal': 3000,
    'Welding': 2500,
    'Roofing': 2000,
    'Auto': 1500,
    'HVAC': 1800,
    'Plumbing': 1500
  },
  
  THRESHOLDS: {
    hotLeadCoolingDays: 10,
    wonAccountRiskDays: 45
  }
};
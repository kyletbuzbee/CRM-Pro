import { Prospect, ContactStatus, Price, Outcome } from '../types';

export const BRAND_COLORS = {
  navy: '#001F3F',
  navyLight: '#003D7A',
  success: '#28A745',
  warning: '#FFC107',
  danger: '#DC3545',
  info: '#17A2B8',
  gray: '#F3F4F6'
};

export const HOME_BASE = {
  name: 'K-L Recycling Headquarters',
  address: '4134 Chandler Hwy, Tyler, TX 75702',
  lat: 32.3513,
  lng: -95.3011
};

export const INITIAL_PROSPECT_DATA: Prospect[] = [
  {
    cid: 'CID-001',
    company: 'Tyler Metal Fab',
    address: '1200 N NW Loop 323, Tyler, TX 75702',
    industry: 'Metal',
    lat: 32.3845,
    lng: -95.3321,
    priorityScore: 85,
    tags: ['High Value', 'Quick Win'],
    lastOutcome: Outcome.INTERESTED,
    lastOutreachDate: '2023-10-20',
    daysSinceContact: 5,
    nextStepDue: '2023-11-04',
    contactStatus: ContactStatus.HOT,
    urgencyBand: 'High',
    closeProbability: 75,
    competitorMentioned: 'None',
    email: 'contact@tylermetal.com',
    zip: '75702'
  }
];

export const SCRAP_PRICES: Price[] = [
  { category: 'Copper', item: 'Bare Bright', min: 4.38, max: 4.48 },
  { category: 'Aluminum', item: 'Cans', min: 0.75, max: 0.77 }
];
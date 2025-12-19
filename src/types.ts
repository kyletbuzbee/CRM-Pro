export enum ContactStatus {
  HOT = 'Hot',
  WARM = 'Warm',
  COLD = 'Cold',
  NEVER = 'Never Contacted',
  WON = 'Won',
  LOST = 'Lost'
}

export enum Outcome {
  INTERESTED = 'Interested',
  HAS_VENDOR = 'Has Vendor',
  NOT_INTERESTED = 'Not Interested',
  WON = 'Won',
  NO_SCRAP = 'No Scrap',
  SEND_INFO = 'Send Info',
  LEFT_MESSAGE = 'Left Message',
  BAD_TIMING = 'Bad Timing',
  FOLLOW_UP = 'Follow Up'
}

export interface Prospect {
  cid: string;
  company: string;
  address: string;
  industry: string;
  lat: number;
  lng: number;
  priorityScore: number;
  tags: string[];
  lastOutcome: string;
  lastOutreachDate: string;
  daysSinceContact: number;
  nextStepDue: string;
  contactStatus: ContactStatus;
  urgencyBand: 'Critical' | 'High' | 'Medium' | 'Low';
  closeProbability: number;
  competitorMentioned?: string;
  email: string;
  zip: string;
}

export interface Price {
  category: string;
  item: string;
  min: number;
  max: number;
}
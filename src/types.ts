export type MemberType = 'leader' | 'participant';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 3 = Wednesday, 6 = Saturday

export interface UnavailableDay {
  dayOfWeek: DayOfWeek;
  role: string;
}

export interface UnavailableDate {
  date: string; // ISO string
  role: string;
}

export interface Member {
  id: string;
  name: string;
  type: MemberType;
  unavailableDays: UnavailableDay[];
  unavailableDates?: UnavailableDate[];
  color?: string;
}

export interface Team {
  id: string;
  members: Member[];
}

export interface Assignment {
  date: Date;
  team: Team;
  hasConflict?: boolean;
  conflictReason?: string;
}

export interface MonthlySchedule {
  month: number;
  year: number;
  assignments: Assignment[];
}

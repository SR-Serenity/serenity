export type SeedUserKey =
  | 'alice'
  | 'bob'
  | 'david'
  | 'mary'
  | 'sarah'
  | 'alex'
  | 'john'
  | 'emily';

export type SeedDepartmentKey = 'engineering' | 'marketing' | 'design';

export const seedDepartments: Array<{ key: SeedDepartmentKey; name: string }> = [
  { key: 'engineering', name: 'Engineering' },
  { key: 'marketing', name: 'Marketing' },
  { key: 'design', name: 'Design' },
];

export const seedUsers: Array<{
  key: SeedUserKey;
  email: string | ((orgSlug: string) => string);
  displayName: string;
  title: string;
  department: SeedDepartmentKey;
  phone?: string;
  notes?: string;
}> = [
  {
    key: 'alice',
    email: (orgSlug) => `alice.nguyen-${orgSlug}@example.com`,
    displayName: 'Alice Nguyen',
    title: 'Marketing Manager',
    department: 'marketing',
    phone: '+1-555-0121',
  },
  {
    key: 'bob',
    email: (orgSlug) => `bob.chen-${orgSlug}@example.com`,
    displayName: 'Bob Chen',
    title: 'Senior Software Engineer',
    department: 'engineering',
    phone: '+1-555-0134',
  },
  {
    key: 'david',
    email: 'david.miller@workspace.com',
    displayName: 'David Miller',
    title: 'Backend Engineer',
    department: 'engineering',
    phone: '+1-555-0148',
  },
  {
    key: 'mary',
    email: 'mary.watson@workspace.com',
    displayName: 'Mary Watson',
    title: 'QA Engineer',
    department: 'engineering',
    phone: '+1-555-0156',
  },
  {
    key: 'sarah',
    email: 'sarah.connor@workspace.com',
    displayName: 'Sarah Connor',
    title: 'Head of Marketing',
    department: 'marketing',
    phone: '+1-555-0162',
  },
  {
    key: 'alex',
    email: 'alex.vance@workspace.com',
    displayName: 'Alex Vance',
    title: 'Engineering Lead',
    department: 'engineering',
    phone: '+1-555-0175',
    notes: 'Lead owner of the platform. Point of contact for architecture decisions and sprint planning.',
  },
  {
    key: 'john',
    email: 'john.park@workspace.com',
    displayName: 'John Park',
    title: 'Frontend Engineer',
    department: 'engineering',
    phone: '+1-555-0183',
  },
  {
    key: 'emily',
    email: 'emily.rose@workspace.com',
    displayName: 'Emily Rose',
    title: 'UI/UX Designer',
    department: 'design',
    phone: '+1-555-0197',
    notes: 'Owns the design system and brand guidelines. Contact for all visual design decisions.',
  },
];

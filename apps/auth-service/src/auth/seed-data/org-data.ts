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
  notes?: string;
}> = [
  {
    key: 'alice',
    email: (orgSlug) => `alice-${orgSlug}@example.com`,
    displayName: 'Alice (Marketing)',
    title: 'Marketing Specialist',
    department: 'marketing',
  },
  {
    key: 'bob',
    email: (orgSlug) => `bob-${orgSlug}@example.com`,
    displayName: 'Bob (Engineering)',
    title: 'Software Engineer',
    department: 'engineering',
  },
  {
    key: 'david',
    email: 'david.miller@workspace.com',
    displayName: 'David',
    title: 'Senior Dev',
    department: 'engineering',
  },
  {
    key: 'mary',
    email: 'mary@example.com',
    displayName: 'Mary',
    title: 'QA',
    department: 'engineering',
  },
  {
    key: 'sarah',
    email: 'sarah.connor@workspace.com',
    displayName: 'Sarah Connor',
    title: 'Head of Marketing',
    department: 'marketing',
  },
  {
    key: 'alex',
    email: 'alex.vance@workspace.com',
    displayName: 'Alex Vance',
    title: 'Project Lead',
    department: 'engineering',
    notes: 'Lead owner of Serenity',
  },
  {
    key: 'john',
    email: 'john@example.com',
    displayName: 'John',
    title: 'Software Engineer',
    department: 'engineering',
  },
  {
    key: 'emily',
    email: 'emily@example.com',
    displayName: 'Emily',
    title: 'Designer',
    department: 'design',
  },
];

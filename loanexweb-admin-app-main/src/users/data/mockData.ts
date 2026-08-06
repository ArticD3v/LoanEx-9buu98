import { AppUser, UserActivityEntry, UserLoginEntry } from '../../types/user';

export const MOCK_USERS: AppUser[] = [
  {
    id: 'USR-10001',
    name: 'Anil Sharma',
    role: 'Super Admin',
    status: 'active',
    blocked: false,
    email: 'anil.sharma@loanex.in',
    mobile: '+91 98000 11111',
    branches: ['Mumbai Andheri', 'Mumbai Borivali', 'Pune Kothrud'],
    pincodes: ['400053', '400092', '411038'],
  },
  {
    id: 'USR-10002',
    name: 'Neha Kapoor',
    role: 'Credit Officer',
    status: 'active',
    blocked: false,
    email: 'neha.kapoor@loanex.in',
    mobile: '+91 98000 22222',
    branches: ['Mumbai Andheri'],
    pincodes: ['400053', '400069'],
  },
  {
    id: 'USR-10003',
    name: 'Arun Mehta',
    role: 'FI Executive',
    status: 'active',
    blocked: false,
    email: 'arun.mehta@loanex.in',
    mobile: '+91 98000 33333',
    branches: ['Mumbai Borivali'],
    pincodes: ['400092'],
  },
  {
    id: 'USR-10004',
    name: 'Priya Nair',
    role: 'Branch Manager',
    status: 'active',
    blocked: false,
    email: 'priya.nair@loanex.in',
    mobile: '+91 98000 44444',
    branches: ['Bengaluru Koramangala'],
    pincodes: ['560034', '560001'],
  },
  {
    id: 'USR-10005',
    name: 'Vikram Singh',
    role: 'FI Executive',
    status: 'inactive',
    blocked: true,
    email: 'vikram.singh@loanex.in',
    mobile: '+91 98000 55555',
    branches: ['Delhi Connaught Place'],
    pincodes: ['110001'],
  },
  {
    id: 'USR-10006',
    name: 'Sneha Iyer',
    role: 'Sales Executive',
    status: 'active',
    blocked: false,
    email: 'sneha.iyer@loanex.in',
    mobile: '+91 98000 66666',
    branches: ['Chennai T Nagar'],
    pincodes: ['600017'],
  },
  {
    id: 'USR-10007',
    name: 'Rahul Mehta',
    role: 'Credit Officer',
    status: 'active',
    blocked: false,
    email: 'rahul.mehta@loanex.in',
    mobile: '+91 98000 77777',
    branches: ['Hyderabad Banjara Hills', 'Pune Kothrud'],
    pincodes: ['500034', '411038'],
  },
  {
    id: 'USR-10008',
    name: 'Kavita Desai',
    role: 'Sales Executive',
    status: 'inactive',
    blocked: false,
    email: 'kavita.desai@loanex.in',
    mobile: '+91 98000 88888',
    branches: ['Ahmedabad CG Road'],
    pincodes: ['380009'],
  },
];

export const MOCK_LOGIN_HISTORY: Record<string, UserLoginEntry[]> = {
  'USR-10001': [
    {
      id: 'LH-1',
      timestamp: '2026-08-03T09:15:00',
      device: 'Chrome · Windows',
      ipAddress: '103.21.244.12',
      location: 'Mumbai, IN',
      status: 'Success',
    },
    {
      id: 'LH-2',
      timestamp: '2026-08-02T18:40:00',
      device: 'Safari · iPhone',
      ipAddress: '103.21.244.12',
      location: 'Mumbai, IN',
      status: 'Success',
    },
    {
      id: 'LH-3',
      timestamp: '2026-08-01T11:05:00',
      device: 'Chrome · Windows',
      ipAddress: '49.37.112.88',
      location: 'Pune, IN',
      status: 'Failed',
    },
  ],
  'USR-10002': [
    {
      id: 'LH-4',
      timestamp: '2026-08-03T10:22:00',
      device: 'Edge · Windows',
      ipAddress: '122.168.44.10',
      location: 'Mumbai, IN',
      status: 'Success',
    },
    {
      id: 'LH-5',
      timestamp: '2026-08-02T14:10:00',
      device: 'Chrome · Android',
      ipAddress: '122.168.44.10',
      location: 'Mumbai, IN',
      status: 'Success',
    },
  ],
};

export const MOCK_ACTIVITY_LOG: Record<string, UserActivityEntry[]> = {
  'USR-10001': [
    {
      id: 'ACT-1',
      timestamp: '2026-08-03T09:30:00',
      action: 'Updated Settings',
      module: 'Settings',
      details: 'Updated company profile',
    },
    {
      id: 'ACT-2',
      timestamp: '2026-08-03T09:20:00',
      action: 'Viewed Users',
      module: 'Users',
      details: 'Opened user list',
    },
    {
      id: 'ACT-3',
      timestamp: '2026-08-02T17:55:00',
      action: 'Approved Credit Review',
      module: 'EMI',
      details: 'Application EMI-APP-10001',
    },
  ],
  'USR-10002': [
    {
      id: 'ACT-4',
      timestamp: '2026-08-03T10:40:00',
      action: 'Held Application',
      module: 'Credit Review',
      details: 'Application EMI-APP-10004',
    },
    {
      id: 'ACT-5',
      timestamp: '2026-08-02T16:05:00',
      action: 'Requested Documents',
      module: 'Credit Review',
      details: 'Application EMI-APP-10003',
    },
  ],
};

export function getLoginHistory(userId: string): UserLoginEntry[] {
  return MOCK_LOGIN_HISTORY[userId] ?? [
    {
      id: `LH-${userId}-1`,
      timestamp: '2026-08-01T10:00:00',
      device: 'Chrome · Windows',
      ipAddress: '103.21.244.12',
      location: 'India',
      status: 'Success',
    },
  ];
}

export function getActivityLog(userId: string): UserActivityEntry[] {
  return MOCK_ACTIVITY_LOG[userId] ?? [
    {
      id: `ACT-${userId}-1`,
      timestamp: '2026-08-01T10:05:00',
      action: 'Logged In',
      module: 'Auth',
      details: 'Successful login',
    },
  ];
}

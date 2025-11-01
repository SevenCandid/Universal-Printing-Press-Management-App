import {
  HomeIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline'

export const roleNav: Record<
  string,
  { name: string; href: string; icon: any }[]
> = {
  ceo: [
    { name: 'Dashboard', href: '/ceo/dashboard', icon: HomeIcon },
    { name: 'Orders', href: '/ceo/orders', icon: DocumentTextIcon },
    { name: 'Tasks', href: '/ceo/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Sales Reports', href: '/ceo/sales-reports', icon: DocumentChartBarIcon },
    { name: 'Users', href: '/ceo/staff', icon: UsersIcon },
    { name: 'Reports', href: '/ceo/reports', icon: ChartBarIcon },
  ],
  manager: [
    { name: 'Dashboard', href: '/manager/dashboard', icon: HomeIcon },
    { name: 'Orders', href: '/manager/orders', icon: DocumentTextIcon },
    { name: 'Tasks', href: '/manager/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Users', href: '/manager/staff', icon: UsersIcon },
    { name: 'Reports', href: '/manager/reports', icon: ChartBarIcon },
  ],
  executive_assistant: [
    { name: 'Dashboard', href: '/executive_assistant/dashboard', icon: HomeIcon },
    { name: 'Orders', href: '/executive_assistant/orders', icon: DocumentTextIcon },
    { name: 'Tasks', href: '/executive_assistant/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Users', href: '/executive_assistant/staff', icon: UsersIcon },
    { name: 'Reports', href: '/executive_assistant/reports', icon: ChartBarIcon },
  ],
  staff: [
    { name: 'Dashboard', href: '/staff/dashboard', icon: HomeIcon },
    { name: 'Orders', href: '/staff/orders', icon: DocumentTextIcon },
    { name: 'Tasks', href: '/staff/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Users', href: '/staff/staff', icon: UsersIcon },
    { name: 'Reports', href: '/staff/reports', icon: ChartBarIcon },
  ],
  intern: [
    { name: 'Dashboard', href: '/intern/dashboard', icon: HomeIcon },
    { name: 'Orders', href: '/intern/orders', icon: DocumentTextIcon },
    { name: 'Tasks', href: '/intern/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Users', href: '/intern/staff', icon: UsersIcon },
    { name: 'Reports', href: '/intern/reports', icon: ChartBarIcon },
  ],
  sales_representative: [
    { name: 'Dashboard', href: '/sales_representative/dashboard', icon: HomeIcon },
    { name: 'Orders', href: '/sales_representative/orders', icon: DocumentTextIcon },
    { name: 'Tasks', href: '/sales_representative/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Daily Reports', href: '/sales_representative/daily-reports', icon: DocumentChartBarIcon },
    { name: 'Users', href: '/sales_representative/staff', icon: UsersIcon },
    { name: 'Reports', href: '/sales_representative/reports', icon: ChartBarIcon },
  ],
  board: [
    { name: 'Dashboard', href: '/board/dashboard', icon: HomeIcon },
    { name: 'Orders', href: '/board/orders', icon: DocumentTextIcon },
    { name: 'Tasks', href: '/board/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Users', href: '/board/staff', icon: UsersIcon },
    { name: 'Reports', href: '/board/reports', icon: ChartBarIcon },
  ],
}

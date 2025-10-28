import {
  HomeIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

export const roleNav: Record<
  string,
  { name: string; href: string; icon: any }[]
> = {
  ceo: [
    { name: 'Dashboard', href: '/ceo/dashboard', icon: HomeIcon },
    { name: 'Orders', href: '/ceo/orders', icon: DocumentTextIcon },
    { name: 'Tasks', href: '/ceo/tasks', icon: ClipboardDocumentListIcon },
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
  board: [
    { name: 'Dashboard', href: '/board/dashboard', icon: HomeIcon },
    { name: 'Orders', href: '/board/orders', icon: DocumentTextIcon },
    { name: 'Tasks', href: '/board/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Users', href: '/board/staff', icon: UsersIcon },
    { name: 'Reports', href: '/board/reports', icon: ChartBarIcon },
  ],
}

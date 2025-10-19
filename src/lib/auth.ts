// Mock authentication system - in a real app, this would integrate with Supabase Auth
export interface User {
  id: string
  name: string
  email: string
  role: 'ceo' | 'manager' | 'staff'
  department?: string
}

// Mock current user - in a real app, this would come from Supabase Auth
export const getCurrentUser = (): User => {
  // This would typically come from Supabase Auth context
  return {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@universalprinting.com',
    role: 'ceo', // Change this to test different roles: 'ceo', 'manager', 'staff'
    department: 'Management'
  }
}

export const hasPermission = (user: User, permission: string): boolean => {
  const permissions = {
    ceo: ['view_all_orders', 'view_all_tasks', 'assign_tasks', 'manage_staff', 'view_reports'],
    manager: ['view_all_orders', 'view_all_tasks', 'assign_tasks', 'view_reports'],
    staff: ['view_my_tasks', 'update_my_tasks']
  }

  return permissions[user.role]?.includes(permission) || false
}

export const canViewAllTasks = (user: User): boolean => {
  return hasPermission(user, 'view_all_tasks')
}

export const canAssignTasks = (user: User): boolean => {
  return hasPermission(user, 'assign_tasks')
}

export const canViewAllOrders = (user: User): boolean => {
  return hasPermission(user, 'view_all_orders')
}















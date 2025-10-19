'use client'

import { useState, useEffect } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'

export function DatabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'needs-setup' | 'error'>('checking')
  const [message, setMessage] = useState('')
  const [dataCounts, setDataCounts] = useState({
    orders: 0,
    tasks: 0,
    staff: 0
  })

  useEffect(() => {
    checkDatabaseStatus()
  }, [])

  const checkDatabaseStatus = async () => {
    try {
      setStatus('checking')
      
      // Check if tables exist and have data
      const [ordersResult, tasksResult, staffResult] = await Promise.allSettled([
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('staff').select('id', { count: 'exact', head: true })
      ])

      const ordersCount = ordersResult.status === 'fulfilled' ? ordersResult.value.count || 0 : 0
      const tasksCount = tasksResult.status === 'fulfilled' ? tasksResult.value.count || 0 : 0
      const staffCount = staffResult.status === 'fulfilled' ? staffResult.value.count || 0 : 0

      setDataCounts({ orders: ordersCount, tasks: tasksCount, staff: staffCount })

      if (ordersCount > 0 || tasksCount > 0 || staffCount > 0) {
        setStatus('ready')
        setMessage('Database is set up and contains data!')
      } else {
        setStatus('needs-setup')
        setMessage('Database tables exist but are empty. You may want to add some sample data.')
      }
    } catch (error) {
      console.error('Error checking database status:', error)
      setStatus('error')
      setMessage('Error checking database status. Please check your connection.')
    }
  }

  if (status === 'checking') {
    return (
      <div className="p-6 bg-card rounded-lg border border-border">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-xl font-bold text-foreground">Checking Database Status</h2>
        </div>
        <p className="text-muted-foreground">Verifying database connection and data...</p>
      </div>
    )
  }

  if (status === 'ready') {
    return (
      <div className="p-6 bg-card rounded-lg border border-border">
        <div className="flex items-center space-x-2 mb-4">
          <CheckCircleIcon className="h-6 w-6 text-green-500" />
          <h2 className="text-xl font-bold text-foreground">Database Ready!</h2>
        </div>
        
        <p className="text-muted-foreground mb-4">{message}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-800">Orders</span>
            </div>
            <p className="text-sm text-green-600">{dataCounts.orders} records</p>
          </div>
          
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-800">Tasks</span>
            </div>
            <p className="text-sm text-green-600">{dataCounts.tasks} records</p>
          </div>
          
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-800">Staff</span>
            </div>
            <p className="text-sm text-green-600">{dataCounts.staff} records</p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">🎉 You're all set!</h4>
          <p className="text-sm text-blue-700">
            Your database is ready and contains data. You can now use all the features of the application.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'needs-setup') {
    return (
      <div className="p-6 bg-card rounded-lg border border-border">
        <div className="flex items-center space-x-2 mb-4">
          <InformationCircleIcon className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-bold text-foreground">Database Tables Exist</h2>
        </div>
        
        <p className="text-muted-foreground mb-4">{message}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <InformationCircleIcon className="h-5 w-5 text-yellow-500" />
              <span className="font-medium text-yellow-800">Orders</span>
            </div>
            <p className="text-sm text-yellow-600">{dataCounts.orders} records</p>
          </div>
          
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <InformationCircleIcon className="h-5 w-5 text-yellow-500" />
              <span className="font-medium text-yellow-800">Tasks</span>
            </div>
            <p className="text-sm text-yellow-600">{dataCounts.tasks} records</p>
          </div>
          
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <InformationCircleIcon className="h-5 w-5 text-yellow-500" />
              <span className="font-medium text-yellow-800">Staff</span>
            </div>
            <p className="text-sm text-yellow-600">{dataCounts.staff} records</p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">💡 Add Sample Data</h4>
          <p className="text-sm text-blue-700 mb-3">
            Your database tables are set up but empty. You can add sample data to test the application:
          </p>
          <div className="space-y-2">
            <button
              onClick={checkDatabaseStatus}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-2"
            >
              Refresh Status
            </button>
            <a
              href="/add-sample-data.sql"
              download
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-block"
            >
              Download Sample Data SQL
            </a>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Download the SQL file and run it in your Supabase SQL Editor to add sample data.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="p-6 bg-card rounded-lg border border-border">
        <div className="flex items-center space-x-2 mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-foreground">Database Error</h2>
        </div>
        
        <p className="text-red-600 mb-4">{message}</p>
        
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">🔧 Troubleshooting</h4>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• Check your Supabase connection settings</li>
            <li>• Verify your API keys are correct</li>
            <li>• Ensure your Supabase project is active</li>
            <li>• Check the browser console for detailed error messages</li>
          </ul>
        </div>
      </div>
    )
  }

  return null
}

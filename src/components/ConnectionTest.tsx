'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export function ConnectionTest() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<{
    connection: boolean
    orders: boolean
    tasks: boolean
    staff: boolean
    errors: string[]
  } | null>(null)

  const testConnection = async () => {
    setTesting(true)
    setResults(null)
    
    const errors: string[] = []
    let connection = false
    let orders = false
    let tasks = false
    let staff = false

    try {
      // Test basic connection
      console.log('🔍 Testing Supabase connection...')
      const { data: connectionData, error: connectionError } = await supabase
        .from('orders')
        .select('id')
        .limit(1)
      
      if (connectionError) {
        console.error('Connection error:', connectionError)
        errors.push(`Connection: ${connectionError.message}`)
      } else {
        connection = true
        console.log('✅ Basic connection successful')
      }

      // Test orders table
      console.log('🔍 Testing orders table...')
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .limit(5)
      
      if (ordersError) {
        console.error('Orders error:', ordersError)
        errors.push(`Orders: ${ordersError.message}`)
      } else {
        orders = true
        console.log('✅ Orders table accessible:', ordersData?.length || 0, 'records')
      }

      // Test tasks table
      console.log('🔍 Testing tasks table...')
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .limit(5)
      
      if (tasksError) {
        console.error('Tasks error:', tasksError)
        errors.push(`Tasks: ${tasksError.message}`)
      } else {
        tasks = true
        console.log('✅ Tasks table accessible:', tasksData?.length || 0, 'records')
      }

      // Test staff table
      console.log('🔍 Testing staff table...')
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .limit(5)
      
      if (staffError) {
        console.error('Staff error:', staffError)
        errors.push(`Staff: ${staffError.message}`)
      } else {
        staff = true
        console.log('✅ Staff table accessible:', staffData?.length || 0, 'records')
      }

    } catch (error) {
      console.error('❌ Connection test failed:', error)
      errors.push(`General error: ${error}`)
    }

    setResults({
      connection,
      orders,
      tasks,
      staff,
      errors
    })
    setTesting(false)
  }

  return (
    <div className="p-6 bg-card rounded-lg border border-border">
      <h2 className="text-2xl font-bold text-foreground mb-4">Connection Test</h2>
      
      <button
        onClick={testConnection}
        disabled={testing}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Test Connection'}
      </button>

      {results && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border ${
              results.connection ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {results.connection ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
                <span className={`font-medium ${
                  results.connection ? 'text-green-800' : 'text-red-800'
                }`}>
                  Basic Connection
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${
              results.orders ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {results.orders ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
                <span className={`font-medium ${
                  results.orders ? 'text-green-800' : 'text-red-800'
                }`}>
                  Orders Table
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${
              results.tasks ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {results.tasks ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
                <span className={`font-medium ${
                  results.tasks ? 'text-green-800' : 'text-red-800'
                }`}>
                  Tasks Table
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${
              results.staff ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {results.staff ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
                <span className={`font-medium ${
                  results.staff ? 'text-green-800' : 'text-red-800'
                }`}>
                  Staff Table
                </span>
              </div>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {results.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Next Steps</h4>
            <p className="text-sm text-blue-700">
              Check the browser console for detailed error information. 
              If tables don't exist, use the database setup guide. 
              If connection fails, verify your Supabase credentials.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}















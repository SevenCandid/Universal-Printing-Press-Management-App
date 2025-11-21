// =============================================================================
// TRACKING START DATE - October 26, 2025 (when orders started)
// =============================================================================
// All orders from this date onwards should be included in reports and dashboards
// This is the actual start date when tracking began
// =============================================================================

export const TRACKING_START_DATE = new Date('2025-10-26T00:00:00.000Z')

// Helper function to filter orders to only include those from tracking start date
export const getTrackingStartDateFilter = () => TRACKING_START_DATE.toISOString()

// Helper function to check if a date is after tracking start
export const isAfterTrackingStart = (date: Date | string): boolean => {
  const dateToCheck = typeof date === 'string' ? new Date(date) : date
  return dateToCheck >= TRACKING_START_DATE
}


'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// 📍 Set your office coordinates
const OFFICE_LOCATION = {
  latitude: 7.3333, // Example: Sunyani coords
  longitude: -2.3333,
  radius: 100, // meters allowed from office
};

// Utility: calculate distance between two coordinates (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

export default function AttendanceBase() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch user
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      fetchAttendance(user?.id);
    })();
  }, []);

  const fetchAttendance = async (user_id) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (!error) setAttendance(data);
  };

  const handleCheckIn = async () => {
    if (!currentUser) return alert('No user logged in');
    setLoading(true);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const distance = getDistance(
        latitude,
        longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );

      if (distance > OFFICE_LOCATION.radius) {
        setLoading(false);
        alert('You must be at the office to check in.');
        return;
      }

      const { data, error } = await supabase
        .from('attendance')
        .insert([
          {
            user_id: currentUser.id,
            check_in: new Date(),
            latitude,
            longitude,
            status: 'checked_in',
          },
        ]);

      setLoading(false);
      if (error) console.error(error);
      else fetchAttendance(currentUser.id);
    });
  };

  const handleCheckOut = async () => {
    if (!currentUser) return alert('No user logged in');
    setLoading(true);

    const { data: lastRecord } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('status', 'checked_in')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastRecord) {
      setLoading(false);
      return alert('No active check-in found.');
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const distance = getDistance(
        latitude,
        longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );

      if (distance > OFFICE_LOCATION.radius) {
        setLoading(false);
        alert('You must be at the office to check out.');
        return;
      }

      const { error } = await supabase
        .from('attendance')
        .update({
          check_out: new Date(),
          latitude,
          longitude,
          status: 'checked_out',
        })
        .eq('id', lastRecord.id);

      setLoading(false);
      if (error) console.error(error);
      else fetchAttendance(currentUser.id);
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-3">Smart Attendance System</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleCheckIn}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Check In
        </button>
        <button
          onClick={handleCheckOut}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Check Out
        </button>
      </div>

      <h3 className="font-medium mb-2">Attendance Records</h3>
      <table className="w-full text-sm border-collapse border">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Check-In</th>
            <th className="p-2 border">Check-Out</th>
            <th className="p-2 border">Status</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((a) => (
            <tr key={a.id}>
              <td className="p-2 border">
                {new Date(a.created_at).toLocaleDateString()}
              </td>
              <td className="p-2 border">
                {a.check_in ? new Date(a.check_in).toLocaleTimeString() : '-'}
              </td>
              <td className="p-2 border">
                {a.check_out ? new Date(a.check_out).toLocaleTimeString() : '-'}
              </td>
              <td className="p-2 border">{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

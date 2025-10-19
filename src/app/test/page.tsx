'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TestPage() {
  const [status, setStatus] = useState('Checking...');

  useEffect(() => {
    async function check() {
      const { data, error } = await supabase.from('test').select('*').limit(1);
      if (error) setStatus('? Connection failed: ' + error.message);
      else setStatus('? Supabase connected successfully!');
    }
    check();
  }, []);

  return <div style={{ padding: 40, fontSize: 20 }}>{status}</div>;
}

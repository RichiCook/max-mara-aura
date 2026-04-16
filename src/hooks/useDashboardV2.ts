import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardV2() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSetting = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'dashboard_v2_enabled')
        .single();
      if (data?.value) {
        const val = data.value as { enabled?: boolean };
        setEnabled(val.enabled ?? false);
      }
    } catch {
      // Setting doesn't exist yet, default to false
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetting();
  }, []);

  const toggle = async (value: boolean) => {
    setEnabled(value);
    await supabase.from('app_settings').upsert({
      id: 'dashboard_v2_enabled',
      value: { enabled: value } as any,
      updated_at: new Date().toISOString(),
    });
  };

  return { enabled, loading, toggle };
}

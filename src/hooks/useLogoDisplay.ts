import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LogoDisplay {
  height: number;
  position: 'left' | 'center';
}

const DEFAULT: LogoDisplay = { height: 32, position: 'left' };

export const useLogoDisplay = () => {
  const [logoDisplay, setLogoDisplay] = useState<LogoDisplay>(DEFAULT);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'logo_display')
      .single()
      .then(({ data }) => {
        if (data?.value) {
          const val = data.value as { height?: number; position?: string };
          setLogoDisplay({
            height: val.height ?? 32,
            position: (val.position as 'left' | 'center') ?? 'left',
          });
        }
      });
  }, []);

  return logoDisplay;
};

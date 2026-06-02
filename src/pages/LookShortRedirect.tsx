import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function LookShortRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (!code) { navigate('/', { replace: true }); return; }
      const { data, error } = await supabase
        .from('look_shares')
        .select('name, description, image_url, product_codes')
        .eq('short_code', code)
        .maybeSingle();

      if (error || !data) { navigate('/', { replace: true }); return; }

      const params = new URLSearchParams();
      params.set('name', data.name || '');
      if (data.description) params.set('desc', data.description);
      if (data.image_url) params.set('img', data.image_url);
      const codes = (data.product_codes || []).join(',');
      if (codes) params.set('codes', codes);
      navigate(`/look/share?${params.toString()}`, { replace: true });
    })();
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF8F5' }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#8b7355' }} />
    </div>
  );
}

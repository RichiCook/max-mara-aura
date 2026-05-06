import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductPage from './ProductPage';
import ProductPageEditorial from './ProductPageEditorial';

const ProductPageRouter = () => {
  const [version, setVersion] = useState<'classic' | 'editorial' | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.from('app_settings').select('value').eq('id', 'product_page_version').single()
      .then(({ data }) => {
        if (!mounted) return;
        const v = (data?.value as { version?: string } | null)?.version;
        setVersion(v === 'editorial' ? 'editorial' : 'classic');
      });
    return () => { mounted = false; };
  }, []);

  if (version === null) {
    return <div style={{ minHeight: '100vh', background: '#FAF8F5' }} />;
  }
  return version === 'editorial' ? <ProductPageEditorial /> : <ProductPage />;
};

export default ProductPageRouter;

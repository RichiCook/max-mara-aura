import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { ScrapeForm, ScrapeResult } from '@/components/ScrapeForm';
import { BulkResultsDisplay } from '@/components/BulkResultsDisplay';
import { SavedProductsPanel } from '@/components/SavedProductsPanel';
import { useSavedProducts } from '@/hooks/useSavedProducts';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ExcelImportModal } from '@/components/ExcelImportModal';

const ImportPage = () => {
  const [isApiKeySet, setIsApiKeySet] = useState(true);
  const [usePremiumMode, setUsePremiumMode] = useState(false);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const {
    savedProducts,
    loading: productsLoading,
    saveProducts,
    deleteProduct,
    clearAllSaved,
    deleteDuplicates,
    toggleAvailability,
    bulkToggleAvailability,
    checkAvailability,
    classifyShoes,
    refetch,
  } = useSavedProducts();
  const { toast } = useToast();

  const handleSaveResults = async () => {
    const count = await saveProducts(results);
    toast({
      title: 'Saved',
      description: `${count} product${count !== 1 ? 's' : ''} saved to database`,
    });
  };

  const successfulResults = results.filter((r) => r.status === 'success');

  return (
    <div className="px-8 py-10 max-w-[1200px] mx-auto">
      <header className="mb-10">
        <div className="admin-subtitle mb-2">Aitemz Studio</div>
        <h1 className="admin-page-title mb-1">Product Import</h1>
        <div className="admin-body-secondary">
          Extract product data from fashion websites or upload via Excel.
        </div>
      </header>

      <main className="space-y-10">
        <section className="flex justify-end">
          <ExcelImportModal onImportComplete={refetch} />
        </section>

        <section>
          <ApiKeyInput
            onKeySet={setIsApiKeySet}
            onModeChange={setUsePremiumMode}
            usePremiumMode={usePremiumMode}
          />
        </section>

        <section
          className="p-6"
          style={{
            background: '#ffffff',
            border: '1px solid var(--admin-ghost-border)',
            borderRadius: 'var(--admin-radius-lg)',
            boxShadow: 'var(--admin-shadow-sm)',
          }}
        >
          <ScrapeForm
            onResults={setResults}
            isApiKeySet={isApiKeySet}
            usePremiumMode={usePremiumMode}
          />
        </section>

        <SavedProductsPanel
          savedProducts={savedProducts}
          loading={productsLoading}
          onDelete={deleteProduct}
          onClearAll={clearAllSaved}
          onDeleteDuplicates={deleteDuplicates}
          onToggleAvailability={toggleAvailability}
          onBulkToggleAvailability={bulkToggleAvailability}
          onCheckAvailability={checkAvailability}
          onClassifyShoes={classifyShoes}
        />

        {results.length > 0 && (
          <section className="animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="admin-section-heading">Results ({results.length})</h2>
              {successfulResults.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleSaveResults}>
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save All ({successfulResults.length})
                </Button>
              )}
            </div>
            <BulkResultsDisplay results={results} />
          </section>
        )}
      </main>
    </div>
  );
};

export default ImportPage;

import { useState } from 'react';
import { toast } from 'sonner';

const HeritageSection = () => (
  <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
    <div
      className="rounded-lg p-6 sm:p-8"
      style={{
        background: '#faf8f5',
        borderLeft: '4px solid var(--aura-gold, #C4A265)',
      }}
    >
      <h2 className="font-serif text-xl sm:text-2xl font-medium text-foreground mb-1">
        Maison Christian Louboutin
      </h2>
      <p className="font-sans text-xs tracking-widest uppercase text-accent font-medium mb-4">
        Since 1991
      </p>
      <p className="font-sans text-sm leading-relaxed text-muted-foreground max-w-[600px]">
        Founded in Paris in 1991, Christian Louboutin has become synonymous with luxury footwear.
        The iconic red sole — born from a stroke of red nail polish — transformed the world of fashion
        and became the most recognizable signature in shoe design.
      </p>
    </div>
  </section>
);

const NewsletterSection = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success('Thank you for subscribing!');
    setEmail('');
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center max-w-md mx-auto">
        <h2 className="font-serif text-xl sm:text-2xl font-medium text-foreground mb-2">
          Stay in the Know
        </h2>
        <p className="font-sans text-sm text-muted-foreground mb-6">
          Receive updates on new collections and exclusive Atelier compositions
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 min-w-0 h-11 rounded-lg border border-border bg-card px-4 font-sans text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="h-11 px-5 rounded-lg font-sans text-sm font-semibold text-white shrink-0"
            style={{ background: 'var(--louboutin-red, #E12B38)' }}
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
};

export { HeritageSection, NewsletterSection };

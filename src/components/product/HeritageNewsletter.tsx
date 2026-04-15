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
      <h2
        className="text-xl sm:text-2xl font-medium mb-1"
        style={{ fontFamily: "var(--font-serif)", color: '#1a1a1a' }}
      >
        Maison Christian Louboutin
      </h2>
      <p
        className="text-xs tracking-widest uppercase mb-4"
        style={{ color: '#C4A265', fontWeight: 500 }}
      >
        Since 1991
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{ fontFamily: "var(--font-sans)", color: '#666', maxWidth: 600 }}
      >
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
        <h2
          className="text-xl sm:text-2xl font-medium mb-2"
          style={{ fontFamily: "var(--font-serif)", color: '#1a1a1a' }}
        >
          Stay in the Know
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Receive updates on new collections and exclusive Atelier compositions
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 h-11 rounded-lg border px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
            style={{ borderColor: '#e4e0db', background: '#fff' }}
          />
          <button
            type="submit"
            className="h-11 px-6 rounded-lg text-sm font-semibold text-white"
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

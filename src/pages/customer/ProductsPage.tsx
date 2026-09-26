import { useState } from 'react';
import { products, categories } from '../../data/mockData';

interface Props {
  onAddToCart: (productId: string) => void;
}

export function ProductsPage({ onAddToCart }: Props) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.nameKh.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--gold-mid)]/50"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-[var(--gold-mid)] text-[var(--background)]' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)]'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-[var(--card)] rounded-xl overflow-hidden border border-[var(--border)] card-glow group transition-all">
            <div className="relative h-44 bg-[var(--secondary)] overflow-hidden">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {p.bonusMultiplier > 1 && (
                <span className="absolute top-2 right-2 bg-[var(--gold-mid)] text-[var(--background)] text-xs font-bold px-2 py-0.5 rounded-full">{p.bonusMultiplier}× pts</span>
              )}
              <span className={`absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${p.stock < 20 ? 'bg-red-500/80 text-white' : 'bg-[var(--secondary)]/80 text-[var(--muted-foreground)]'}`}>
                {p.stock < 20 ? `Only ${p.stock} left` : `${p.stock} in stock`}
              </span>
            </div>
            <div className="p-4">
              <div className="text-xs text-[var(--muted-foreground)] mb-0.5">{p.category}</div>
              <div className="font-medium leading-snug">{p.name}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{p.nameKh}</div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1.5 leading-relaxed line-clamp-2">{p.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="font-semibold text-lg text-[var(--gold-mid)]">${p.price}</span>
                <span className="text-xs text-[var(--muted-foreground)] bg-[var(--secondary)] px-2 py-0.5 rounded-full">+{p.normalPoints} pts</span>
              </div>
              <button
                onClick={() => onAddToCart(p.id)}
                className="w-full mt-3 py-2 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] text-sm font-semibold hover:bg-[var(--gold-light)] transition-colors"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-[var(--muted-foreground)]">
          <div className="text-4xl mb-3">🔍</div>
          <div>No products match your search</div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { products as initialProducts, categories } from '../../data/mockData';

export function AdminProductsPage() {
  const [products, setProducts] = useState(initialProducts);
  const [catFilter, setCatFilter] = useState('All');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCat, setNewCat] = useState('Coffee & Tea');

  const filtered = products.filter(p => catFilter === 'All' || p.category === catFilter);

  const handleDelete = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));

  const handleAdd = () => {
    if (!newName || !newPrice) return;
    setProducts(prev => [...prev, {
      id: `p-new-${Date.now()}`,
      name: newName,
      nameKh: '',
      category: newCat,
      price: parseFloat(newPrice),
      stock: 10,
      image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&h=300&fit=crop&auto=format',
      description: '',
      normalPoints: Math.floor(parseFloat(newPrice)),
      bonusMultiplier: 1,
      featured: false,
    }]);
    setNewName('');
    setNewPrice('');
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        <div className="flex gap-2 flex-wrap items-center">
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${catFilter === c ? 'bg-[var(--gold-mid)] text-[var(--background)]' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'}`}>{c}</button>
          ))}
          <button onClick={() => setAdding(true)} className="px-3 py-1.5 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] text-xs font-semibold hover:bg-[var(--gold-light)] transition-colors">+ Add Product</button>
        </div>
      </div>

      {adding && (
        <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--gold-mid)]/30">
          <h3 className="font-semibold mb-3 text-sm">New Product</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Product name" className="px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--gold-mid)]/50" />
            <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Price ($)" type="number" className="px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--gold-mid)]/50" />
            <select value={newCat} onChange={e => setNewCat(e.target.value)} className="px-3 py-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-sm focus:outline-none text-[var(--foreground)]">
              {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-[var(--gold-mid)] text-[var(--background)] text-sm font-semibold hover:bg-[var(--gold-light)] transition-colors">Save</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg bg-[var(--secondary)] text-[var(--muted-foreground)] text-sm transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <tr className="text-[var(--muted-foreground)] text-xs">
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-right px-4 py-3 font-medium">Price</th>
                <th className="text-right px-4 py-3 font-medium">Stock</th>
                <th className="text-right px-4 py-3 font-medium">Base Pts</th>
                <th className="text-right px-4 py-3 font-medium">Multiplier</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-[var(--secondary)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                      <div>
                        <div className="font-medium text-xs">{p.name}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">{p.nameKh}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{p.category}</td>
                  <td className="px-4 py-3 text-right font-mono-data text-xs text-[var(--gold-mid)]">${p.price}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    <span className={p.stock < 20 ? 'text-red-400' : ''}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">{p.normalPoints}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    {p.bonusMultiplier > 1 ? <span className="text-[var(--gold-mid)] font-semibold">{p.bonusMultiplier}×</span> : <span className="text-[var(--muted-foreground)]">1×</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

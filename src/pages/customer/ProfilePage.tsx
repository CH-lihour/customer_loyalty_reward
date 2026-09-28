import { useState, type FormEvent } from 'react';
import { useShop } from '../../data/shop';
import { useFeedback } from '../../components/FeedbackProvider';
import { TierBadge } from '../../components/TierBadge';
import { Icon } from '../../components/Icon';

const provinces = ['Phnom Penh', 'Siem Reap', 'Battambang', 'Kampong Cham', 'Kampot', 'Sihanoukville', 'Kandal', 'Takeo'];
const field = 'w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-mid)]';

export function ProfilePage() {
  const shop = useShop();
  const { notify } = useFeedback();
  const user = shop.currentUser;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [province, setProvince] = useState(user.province);
  const [error, setError] = useState('');

  const openEditor = () => {
    setName(user.name);
    setPhone(user.phone);
    setProvince(user.province);
    setError('');
    setEditing(true);
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !/^\+?\d[\d\s-]{7,14}$/.test(phone)) {
      setError('Enter a name and valid phone number.');
      notify('Enter a name and valid phone number.', 'error');
      return;
    }
    shop.updateProfile({ name: name.trim(), phone: phone.trim(), province });
    setEditing(false);
    setError('');
    notify('Profile updated.', 'success');
  };

  return <div className="mx-auto max-w-3xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-semibold">My Profile</h1>
      <button type="button" onClick={editing ? () => setEditing(false) : openEditor} className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 text-sm font-semibold text-[var(--background)]">{editing ? 'Cancel' : 'Edit Profile'}</button>
    </div>
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="mb-5 flex items-center gap-4">
        <img src={user.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
        <div><strong className="text-lg">{user.name}</strong><p className="text-sm text-[var(--muted-foreground)]">{user.nameKh}</p><TierBadge tier={user.tier} /></div>
      </div>
      {editing ? <form onSubmit={save} className="space-y-3">
        <label className="block text-sm">Name<input required autoComplete="name" className={`mt-1 ${field}`} value={name} onChange={event => setName(event.target.value)} /></label>
        <label className="block text-sm">Phone<input required autoComplete="tel" className={`mt-1 ${field}`} value={phone} onChange={event => setPhone(event.target.value)} /></label>
        <label className="block text-sm">Province<select className={`mt-1 ${field}`} value={province} onChange={event => setProvince(event.target.value)}>{provinces.map(item => <option key={item}>{item}</option>)}</select></label>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="rounded-lg bg-[var(--gold-mid)] px-4 py-2 font-semibold text-[var(--background)]">Save Profile</button>
      </form> : <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['Email', user.email], ['Phone', user.phone], ['Province', user.province],
          ['Member Since', user.joinedAt], ['Points Balance', user.points.toLocaleString()],
          ['Total Spent', shop.money(user.totalSpent)], ['Referral Code', user.referralCode],
        ].map(([label, value]) => <div key={label} className="rounded-lg bg-[var(--secondary)] p-3 text-sm"><div className="text-xs text-[var(--muted-foreground)]">{label}</div>{value}</div>)}
      </div>}
    </div>
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="mb-3 font-semibold">Badges ({user.badges.length})</h2>
      <div className="flex flex-wrap gap-2">{shop.badges.filter(badge => user.badges.includes(badge.code)).map(badge => <span key={badge.id} className="inline-flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-3 py-2 text-sm"><Icon name={badge.icon} className="h-4 w-4 text-[var(--gold-mid)]" /> {badge.name}</span>)}</div>
    </div>
  </div>;
}

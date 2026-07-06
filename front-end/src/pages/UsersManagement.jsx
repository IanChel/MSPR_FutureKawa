import React, { useMemo, useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { usersApi, formatDate } from '../services/api';

const COUNTRY_TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'BRESIL', label: 'Brésil' },
  { id: 'EQUATEUR', label: 'Équateur' },
  { id: 'COLOMBIE', label: 'Colombie' },
];

const ROLE_FILTERS = [
  { id: 'all', label: 'Tous les rôles' },
  { id: 'ADMIN_PAYS', label: 'Admin pays' },
  { id: 'OPERATEUR', label: 'Opérateur' },
  { id: 'LECTEUR', label: 'Lecteur' },
];

const PAYS_OPTIONS = ['BRESIL', 'EQUATEUR', 'COLOMBIE'];
const PAYS_LABEL = { BRESIL: 'Brésil', EQUATEUR: 'Équateur', COLOMBIE: 'Colombie' };
const ROLE_OPTIONS = ['SUPER_ADMIN', 'ADMIN_PAYS', 'OPERATEUR', 'LECTEUR'];
const ROLE_LABEL = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_PAYS: 'Admin Pays',
  OPERATEUR: 'Opérateur',
  LECTEUR: 'Lecteur',
};

function initials(user) {
  const parts = [user.prenom, user.nom].filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return user.email?.[0]?.toUpperCase() || 'U';
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function RoleBadge({ role }) {
  const styles =
    role === 'SUPER_ADMIN' || role === 'Super Admin'
      ? 'bg-sky-50 text-sky-700 border border-sky-200'
      : role === 'ADMIN_PAYS' || role === 'Admin Pays'
      ? 'bg-slate-100 text-slate-700 border border-slate-200'
      : role === 'OPERATEUR' || role === 'Opérateur'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : 'bg-slate-100 text-slate-600 border border-slate-200';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {ROLE_LABEL[role] || role}
    </span>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function ModalField({ label, children, full = false }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

const EMPTY_FORM = { prenom: '', nom: '', email: '', role: 'OPERATEUR', pays: 'BRESIL', motDePasse: '' };
const EMPTY_EDIT = { prenom: '', nom: '', email: '', role: 'OPERATEUR', pays: 'BRESIL' };

export default function UsersManagement() {
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    usersApi.liste()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchCountry =
        selectedCountry === 'all' || user.pays === selectedCountry;
      const matchRole =
        selectedRole === 'all' || user.roles?.includes(selectedRole);
      const query = search.trim().toLowerCase();
      const matchSearch =
        !query ||
        user.nom?.toLowerCase().includes(query) ||
        user.prenom?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query);
      return matchCountry && matchRole && matchSearch;
    });
  }, [users, selectedCountry, selectedRole, search]);

  const handleToggleActive = async (user) => {
    try {
      if (user.actif) await usersApi.desactiver(user.id);
      else await usersApi.activer(user.id);
      fetchUsers();
    } catch (e) {
      window.alert(`Erreur : ${e.message}`);
    }
  };

  const handleSupprimer = async (user) => {
    if (!window.confirm(`Supprimer ${user.email} ?`)) return;
    try {
      await usersApi.supprimer(user.id);
      fetchUsers();
    } catch (e) {
      window.alert(`Erreur : ${e.message}`);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await usersApi.creer({
        email: formData.email,
        motDePasse: formData.motDePasse,
        nom: formData.nom,
        prenom: formData.prenom,
        pays: formData.pays,
        role: formData.role,
      });
      setIsCreateModalOpen(false);
      setFormData(EMPTY_FORM);
      fetchUsers();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({
      prenom: user.prenom || '',
      nom: user.nom || '',
      email: user.email || '',
      role: user.roles?.[0] || 'OPERATEUR',
      pays: user.pays || 'BRESIL',
    });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await usersApi.modifier(editUser.id, {
        nom: editForm.nom,
        prenom: editForm.prenom,
        email: editForm.email,
        pays: editForm.pays,
        role: editForm.role,
      });
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Administration"
      topTabs={COUNTRY_TABS}
      activeTab={selectedCountry}
      onTabChange={setSelectedCountry}
    >
      <div className="mb-8">
        <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-slate-900">Utilisateurs</h1>
        <p className="text-sm sm:text-base text-slate-500">
          Gérez les comptes et leurs accès selon votre périmètre.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center">
        <div className="relative w-full xl:max-w-md">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Rechercher un nom ou un e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((role) => (
            <FilterChip key={role.id} active={selectedRole === role.id} onClick={() => setSelectedRole(role.id)}>
              {role.label}
            </FilterChip>
          ))}
        </div>
        <div className="xl:ml-auto">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            + Nouvel utilisateur
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-700">
          Erreur : {error}
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Utilisateur</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Rôle</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Pays</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Dernière connexion</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Actif</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                          {initials(user)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {[user.prenom, user.nom].filter(Boolean).join(' ') || '—'}
                          </div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.roles?.[0] || '—'} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {PAYS_LABEL[user.pays] || user.pays || 'Tous'}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-500">
                      {user.derniereConnexion ? formatDate(user.derniereConnexion) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Toggle checked={user.actif} onChange={() => handleToggleActive(user)} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                          title="Modifier"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleSupprimer(user)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      Aucun utilisateur trouvé pour ce filtre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editUser && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h3 className="text-xl font-bold text-slate-900">Modifier l'utilisateur</h3>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-5 px-6 py-6">
                {editError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                    {editError}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <ModalField label="Prénom">
                    <input
                      value={editForm.prenom}
                      onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      required
                    />
                  </ModalField>
                  <ModalField label="Nom">
                    <input
                      value={editForm.nom}
                      onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      required
                    />
                  </ModalField>
                  <ModalField label="Adresse e-mail" full>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      required
                    />
                  </ModalField>
                  <ModalField label="Rôle">
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                  </ModalField>
                  <ModalField label="Pays">
                    <select
                      value={editForm.pays}
                      onChange={(e) => setEditForm({ ...editForm, pays: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    >
                      {PAYS_OPTIONS.map((p) => (
                        <option key={p} value={p}>{PAYS_LABEL[p]}</option>
                      ))}
                    </select>
                  </ModalField>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {editLoading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h3 className="text-xl font-bold text-slate-900">Nouvel utilisateur</h3>
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); setFormData(EMPTY_FORM); setFormError(''); }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="space-y-5 px-6 py-6">
                {formError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                    {formError}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <ModalField label="Prénom">
                    <input
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Maria"
                      required
                    />
                  </ModalField>
                  <ModalField label="Nom">
                    <input
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Vera"
                      required
                    />
                  </ModalField>
                  <ModalField label="Adresse e-mail" full>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      placeholder="prenom.nom@futurekawa.example"
                      required
                    />
                  </ModalField>
                  <ModalField label="Rôle">
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                  </ModalField>
                  <ModalField label="Pays">
                    <select
                      value={formData.pays}
                      onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    >
                      {PAYS_OPTIONS.map((p) => (
                        <option key={p} value={p}>{PAYS_LABEL[p]}</option>
                      ))}
                    </select>
                  </ModalField>
                  <ModalField label="Mot de passe provisoire" full>
                    <input
                      type="password"
                      value={formData.motDePasse}
                      onChange={(e) => setFormData({ ...formData, motDePasse: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      required
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      L'utilisateur devra le modifier à sa première connexion.
                    </p>
                  </ModalField>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setFormData(EMPTY_FORM); setFormError(''); }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {formLoading ? 'Création…' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

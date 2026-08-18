import { Plus, Search, Filter, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

const USERS = [
  {
    id: 1,
    initials: 'JD',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    plan: 'Pro',
    joined: 'Oct 12, 2023',
    avatar: null,
    color: 'bg-primary text-white'
  },
  {
    id: 2,
    initials: 'AS',
    name: 'Alex Smith',
    email: 'alex.smith@example.com',
    plan: 'Basic',
    joined: 'Nov 04, 2023',
    avatar: null,
    color: 'bg-secondary text-white'
  },
  {
    id: 3,
    initials: 'SJ',
    name: 'Sarah Jenkins',
    email: 's.jenkins@devcorp.net',
    plan: 'Pro',
    joined: 'Dec 01, 2023',
    avatar: null,
    color: 'bg-primary-container text-primary'
  },
  {
    id: 4,
    initials: 'MR',
    name: 'Michael Ross',
    email: 'mross@startup.io',
    plan: 'Basic',
    joined: 'Jan 15, 2024',
    avatar: null,
    color: 'bg-amber-700 text-white'
  }
];

export function UserDirectory() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-h1 text-[32px] text-on-surface mb-2">User Directory</h1>
          <p className="text-on-surface-variant font-body-md">
            Manage platform access and monitor user engagement metrics.
          </p>
        </div>
        <button className="bg-primary text-on-primary hover:bg-primary/90 flex items-center gap-2 px-6 py-3 rounded-lg font-label-sm text-sm transition-colors">
          <Plus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
             <input
               type="text"
               placeholder="Search by name or email..."
               className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
             />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <select className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-sm outline-none w-40">
              <option>All Statuses</option>
            </select>
            <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors">
              <Filter className="w-4 h-4 text-outline" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="py-4 px-6 font-label-sm text-sm font-medium text-on-surface">Name</th>
                <th className="py-4 px-6 font-label-sm text-sm font-medium text-on-surface">Email Account</th>
                <th className="py-4 px-6 font-label-sm text-sm font-medium text-on-surface">Plan Status</th>
                <th className="py-4 px-6 font-label-sm text-sm font-medium text-on-surface">Joined Date</th>
                <th className="py-4 px-6 font-label-sm text-sm font-medium text-on-surface text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {USERS.map((user) => (
                <tr key={user.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-4 px-6">
                    <Link to={`/admin/users/${user.id}`} className="flex items-center gap-3 group">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden font-bold text-sm ${user.color}`}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.initials
                        )}
                      </div>
                      <span className="font-medium text-on-surface font-label-sm border-b border-transparent group-hover:border-on-surface transition-colors">{user.name}</span>
                    </Link>
                  </td>
                  <td className="py-4 px-6 text-on-surface-variant text-sm">
                    {user.email}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full font-label-sm text-[12px] bg-surface-container-high border border-surface-dim ${user.plan === 'Pro' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-dim text-on-surface'}`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-on-surface-variant text-sm">
                    {user.joined}
                  </td>
                  <td className="py-4 px-6 text-right">
                     <button className="text-outline hover:text-on-surface p-1">
                       <MoreHorizontal className="w-5 h-5" />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-outline-variant flex items-center justify-between text-sm text-on-surface-variant font-body-md">
           <div>Showing 1 to 4 of 24 entries</div>
           <div className="flex bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden">
             <button className="px-3 py-1 border-r border-outline-variant hover:bg-surface-container-low transition-colors">Previous</button>
             <button className="px-3 py-1 bg-primary text-on-primary">1</button>
             <button className="px-3 py-1 border-x border-outline-variant hover:bg-surface-container-low transition-colors text-on-surface">2</button>
             <button className="px-3 py-1 border-r border-outline-variant hover:bg-surface-container-low transition-colors text-on-surface">3</button>
             <span className="px-3 py-1 border-r border-outline-variant text-outline">...</span>
             <button className="px-3 py-1 border-r border-outline-variant hover:bg-surface-container-low transition-colors text-on-surface">6</button>
             <button className="px-3 py-1 hover:bg-surface-container-low transition-colors text-on-surface">Next</button>
           </div>
        </div>
      </div>
    </div>
  );
}

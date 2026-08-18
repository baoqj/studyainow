import { ChevronRight, User, Shield, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export function UserDetails() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant font-body-md">
        <Link to="/admin/users" className="hover:text-on-surface hover:underline">User Management</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-on-surface">Sarah Jenkins</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-h1 text-[40px] text-on-surface leading-tight mb-2">User Details</h1>
          <p className="text-on-surface-variant font-body-md text-base">
            Manage profile, subscription, and account status.
          </p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-label-sm text-sm text-on-surface hover:bg-surface-container-low transition-colors">
            Cancel
          </button>
          <button className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-sm text-sm hover:bg-primary/90 transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Information */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-primary" />
            <h2 className="font-h3 text-2xl font-bold text-on-surface">Profile Information</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-24 h-24 bg-primary-container text-primary rounded-xl overflow-hidden flex items-center justify-center shrink-0 font-h2 text-4xl">
              SJ
            </div>
            
            <div className="flex-1 space-y-6">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Full Name</label>
                <input
                  type="text"
                  defaultValue="Sarah Jenkins"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Email Address</label>
                  <input
                    type="email"
                    defaultValue="s.jenkins@devcorp.net"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Username</label>
                  <input
                    type="text"
                    defaultValue="sjenkins_dev"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-md px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="font-h3 text-2xl font-bold text-on-surface">Account Status</h2>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-start gap-4 p-4 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors">
              <div className="pt-0.5">
                <input type="radio" name="status" defaultChecked className="w-4 h-4 text-primary focus:ring-primary" />
              </div>
              <div>
                <div className="font-medium text-on-surface text-base">Active</div>
                <div className="text-on-surface-variant text-sm mt-1">User has full access</div>
              </div>
            </label>
            <label className="flex items-start gap-4 p-4 border border-red-200 bg-red-50/30 rounded-lg cursor-pointer hover:bg-red-50/50 transition-colors">
              <div className="pt-0.5">
                <input type="radio" name="status" className="w-4 h-4 text-red-600 focus:ring-red-600 border-red-300" />
              </div>
              <div>
                <div className="font-medium text-red-700 text-base">Suspended</div>
                <div className="text-red-600 text-sm mt-1">Revoke access immediately</div>
              </div>
            </label>
          </div>
        </div>

        {/* Subscription Plan */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-primary" />
            <h2 className="font-h3 text-2xl font-bold text-on-surface">Subscription Plan</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border border-outline-variant rounded-lg p-5 cursor-pointer hover:border-primary transition-colors">
               <div className="font-medium text-on-surface mb-1">Basic</div>
               <div className="text-on-surface-variant text-sm">$0/mo</div>
            </div>
            <div className="border-2 border-primary bg-primary-container/10 rounded-lg p-5 cursor-pointer relative">
               <div className="absolute top-4 right-4">
                 <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                 </div>
               </div>
               <div className="font-bold text-on-surface mb-1 text-primary">Pro</div>
               <div className="text-on-surface-variant text-sm">$15/mo</div>
            </div>
            <div className="border border-outline-variant rounded-lg p-5 cursor-pointer hover:border-primary transition-colors">
               <div className="font-medium text-on-surface mb-1">Enterprise</div>
               <div className="text-on-surface-variant text-sm">Custom</div>
            </div>
          </div>
          
          <div className="bg-surface-container border border-outline-variant rounded-lg p-4 text-sm text-on-surface-variant">
            <span className="font-medium text-on-surface">Note:</span> Downgrading a plan takes effect at the end of the current billing cycle (Oct 12, 2024).
          </div>
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import React from 'react';
import { User, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Bin, DepositLog, UserProfile } from '../types';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  LogOut, 
  Activity, 
  Trash2, 
  Users, 
  CreditCard, 
  Smartphone, 
  MapPin, 
  Wifi, 
  AlertTriangle,
  FileText,
  User as UserIcon,
  CheckCircle,
  Receipt,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import PaymentModal from './PaymentModal';

// Fix leaflet icon issue
import L from 'leaflet';

let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function Dashboard({ user }: { user: User }) {
  const [bins, setBins] = useState<Bin[]>([]);
  const [logs, setLogs] = useState<DepositLog[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const isUserAdmin = user.email === 'travisjosh3335@gmail.com';
    setIsAdmin(isUserAdmin);

    const binsQuery = query(collection(db, 'bins'));
    const unsubscribeBins = onSnapshot(binsQuery, (snapshot) => {
      setBins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bin)));
    });

    const logsQuery = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositLog)));
    });

    let unsubscribeUsers = () => {};
    if (isUserAdmin) {
      const usersQuery = query(collection(db, 'users'));
      unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      }, (err) => {
        console.error("Permission error on users sync:", err);
      });
    }

    return () => {
      unsubscribeBins();
      unsubscribeLogs();
      unsubscribeUsers();
    };
  }, [user]);

  const userBin = bins.find(b => b.userId === user.uid);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Trash2 className="text-[#2ecc71] w-8 h-8" />
          <h1 className="text-xl font-bold tracking-tight text-[#2c3e50]">TECH TRASH <span className="text-gray-400 font-normal">| {isAdmin ? 'Authority' : 'Resident'} Portal</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="w-2 h-2 bg-[#2ecc71] rounded-full animate-pulse"></div>
            Live Database Linked
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="bg-[#e74c3c] hover:bg-[#c0392b] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        {isAdmin ? (
          <AdminView bins={bins} logs={logs} users={allUsers} />
        ) : (
          <ResidentView 
            user={user} 
            bin={userBin} 
            phoneInput={phoneInput} 
            setPhoneInput={setPhoneInput} 
            onPaymentClick={() => setIsPaymentModalOpen(true)} 
          />
        )}
      </main>

      {/* Payment Modal */}
      {userBin && (
        <PaymentModal 
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          phone={phoneInput}
          bin={userBin}
        />
      )}
    </div>
  );
}

function AdminView({ bins, logs, users }: { bins: Bin[], logs: DepositLog[], users: UserProfile[] }) {
  const totalRevenue = bins.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
  const totalDue = bins.reduce((sum, b) => sum + (b.subscriptionFee || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatCard label="Total Fleet" value={bins.length} icon={<Trash2 />} color="border-[#2ecc71]" />
        <AdminStatCard label="Active Subscriptions" value={bins.filter(b => b.subscriptionActive).length} icon={<CheckCircle />} color="border-[#3498db]" />
        <AdminStatCard label="Amount Collected" value={`UGX ${totalRevenue.toLocaleString()}`} icon={<Receipt />} color="border-[#2ecc71]" />
        <AdminStatCard label="Total Amount Owed" value={`UGX ${(totalDue - totalRevenue).toLocaleString()}`} icon={<AlertTriangle />} color="border-[#e74c3c]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Bin Registry Table */}
          <div className="tech-card">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><FileText size={20} className="text-gray-400" /> Bin Registry</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 uppercase text-[10px] font-bold text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Node ID</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Revenue Status</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bins.map(bin => (
                    <tr key={bin.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 font-bold">#{bin.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-4 text-gray-500 font-medium">{bin.locationName}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold">UGX {bin.amountPaid.toLocaleString()}</span>
                          <span className="text-[10px] text-gray-400 uppercase">of {bin.subscriptionFee.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          bin.subscriptionActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {bin.subscriptionActive ? 'Active' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tech-card border-primary/20 bg-primary/5">
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary"><ShieldCheck size={20} /> Identity Status</h2>
             <div className="space-y-4 text-xs">
                <div className="p-3 bg-white/50 rounded-xl border border-primary/10">
                  <p className="font-black uppercase tracking-widest text-primary mb-2">Google Sync: ENABLED</p>
                  <p className="text-dark/70 leading-relaxed">
                    Google authentication is active. Users can currently log in using their organization or personal Google accounts.
                  </p>
                </div>
                <div className="p-3 bg-white/50 rounded-xl border border-primary/10">
                  <p className="font-black uppercase tracking-widest text-primary mb-2">Restricted Access Warning</p>
                  <p className="text-dark/70 leading-relaxed italic">
                    If Email/Phone login is restricted in your project tier, please instruct residents to use the <b>Google Cloud Sync</b> option on the portal homepage.
                  </p>
                </div>
                <div className="flex gap-2">
                  <a href={`https://console.firebase.google.com/project/extended-signal-rcf5x/authentication/providers`} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-primary text-white text-center rounded-lg font-bold uppercase tracking-tighter">
                    Verify Project Permissions
                  </a>
                </div>
             </div>
          </div>

          <div className="tech-card">
             <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Users size={20} className="text-gray-400" /> User Directory</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map(u => (
                  <div key={u.uid} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-10 h-10 bg-[#2c3e50] text-white flex items-center justify-center rounded-lg font-bold">
                      {u.displayName?.slice(0,1) || 'U'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm truncate">{u.displayName || 'Anonymous'}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-tighter truncate">{u.role} • {u.email}</p>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-gray-400 italic">No users synchronized yet.</p>
                )}
             </div>
          </div>

          <div className="tech-card bg-gray-50/50 border-dashed">
             <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Activity size={20} className="text-gray-400" /> Connection Metadata</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-1">Project ID</p>
                  <p className="font-mono bg-white p-2 rounded-lg border border-black/5 select-all">extended-signal-rcf5x</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-1">Database ID</p>
                  <p className="font-mono bg-white p-2 rounded-lg border border-black/5 select-all">ai-studio-1354a4b0-a405-40ac-819b-44caeb9264f9</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-1">Applet ID</p>
                  <p className="font-mono bg-white p-2 rounded-lg border border-black/5 select-all">1354a4b0-a405-40ac-819b-44caeb9264f9</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-1">Municipal Status</p>
                  <p className="font-bold text-[#2ecc71] flex items-center gap-2">
                    <CheckCircle size={14} /> Synchronized with Global Network
                  </p>
                </div>
             </div>
             <p className="mt-6 text-[10px] text-red-500 font-bold uppercase border-t pt-4">
               Note: If login fails with 'operation-not-allowed', please enable Email and Phone sign-in methods in the Firebase Authentication Console for the Project ID above.
             </p>
          </div>
        </div>

        <div className="space-y-8">
           <div className="tech-card h-[400px] flex flex-col p-0 overflow-hidden">
              <div className="p-6 pb-2"><h2 className="text-lg font-bold">Live Asset Map</h2></div>
              <div className="flex-1 bg-gray-100">
                <MapContainer center={[0.3250, 32.5750]} zoom={8} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {bins.map(bin => (
                    <CircleMarker 
                      key={bin.id}
                      center={[bin.latitude || 0.3250, bin.longitude || 32.5750]} 
                      radius={10}
                      pathOptions={{ color: bin.subscriptionActive ? '#2ecc71' : '#e74c3c', fillColor: bin.subscriptionActive ? '#2ecc71' : '#e74c3c', fillOpacity: 0.6 }}
                    >
                      <Popup>Node: {bin.name}<br/>Location: {bin.locationName}</Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
           </div>

           <div className="tech-card">
              <h2 className="text-lg font-bold mb-4">Audit Stream</h2>
              <div className="space-y-4">
                {logs.slice(0, 5).map(log => (
                  <div key={log.id} className="text-xs border-b border-gray-50 pb-3 last:border-0">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-[#2ecc71]">{log.type.toUpperCase()}</span>
                      <span className="text-gray-400">{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : 'Processing...'}</span>
                    </div>
                    <p className="text-gray-500">Bin #{log.binId.slice(0,6)} • {log.weight.toFixed(2)} KG</p>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ResidentView({ user, bin, phoneInput, setPhoneInput, onPaymentClick }: any) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
       <div className="flex justify-between items-center bg-white p-8 rounded-2xl shadow-sm border border-black/5">
          <div>
            <h2 className="text-2xl font-bold text-[#2c3e50]">Welcome back, {user.displayName}</h2>
            <p className="text-gray-500 font-medium mt-1">Status: <span className="text-[#2ecc71] font-bold">Node Connected (Online)</span></p>
          </div>
          <div className="text-right">
             <p className="text-[10px] uppercase font-black text-gray-400 tracking-[0.2em]">Municipal ID</p>
             <p className="text-sm font-mono font-bold">#{user.uid.slice(0, 12).toUpperCase()}</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="tech-card">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-[#2c3e50]"><Activity size={20} className="text-[#2ecc71]" /> Waste Management</h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold uppercase mb-2">
                  <span>Biodegradable Waste</span>
                  <span className="text-[#2ecc71]">{bin?.levels.degradable || 0}%</span>
                </div>
                <div className="progress-wrapper">
                  <div 
                    className="h-full bg-[#2ecc71] transition-all duration-1000 flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ width: `${bin?.levels.degradable || 0}%` }}
                  >
                    {bin?.levels.degradable || 0}%
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold uppercase mb-2">
                  <span>Non-Biodegradable Waste</span>
                  <span className="text-[#3498db]">{bin?.levels.non_degradable || 0}%</span>
                </div>
                <div className="progress-wrapper">
                  <div 
                    className="h-full bg-[#3498db] transition-all duration-1000 flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ width: `${bin?.levels.non_degradable || 0}%` }}
                  >
                    {bin?.levels.non_degradable || 0}%
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-8 text-[10px] text-gray-400 font-medium italic leading-relaxed">
              <AlertTriangle size={12} className="inline mr-1" />
              Your waste levels are monitors in real-time. Please ensure proper segregation to maintain municipality node integrity.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            <div className="tech-card border-t-[5px] border-t-[#3498db]">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Receipt size={20} className="text-[#3498db]" /> Subscription Status</h2>
              <div className="space-y-4">
                <div className={cn(
                  "px-4 py-3 rounded-xl font-bold text-center uppercase tracking-widest text-xs",
                  bin?.subscriptionActive ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                )}>
                  {bin?.subscriptionActive ? 'Subscription Active' : 'Unpaid Balance'}
                </div>
                
                <div className="text-sm font-medium text-gray-600 space-y-2">
                  <div className="flex justify-between"><span>Subscription Fee:</span><span className="text-black font-bold">UGX {bin?.subscriptionFee?.toLocaleString() || 0}</span></div>
                  <div className="flex justify-between border-b pb-2"><span>Amount Settled:</span><span className="text-[#2ecc71] font-bold">UGX {bin?.amountPaid?.toLocaleString() || 0}</span></div>
                  <div className="flex justify-between pt-1"><span>Amount Remaining:</span><span className="text-[#e74c3c] font-bold">UGX {( (bin?.subscriptionFee || 0) - (bin?.amountPaid || 0) ).toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#3498db] to-[#2ecc71] p-6 rounded-2xl text-white shadow-lg overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full"></div>
               <h2 className="text-lg font-bold mb-4 flex items-center gap-2 font-serif italic"><Smartphone size={20} /> Quick Ledger Sync</h2>
               <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-4">M-Settle Payment Endpoint</p>
               <input 
                  type="tel"
                  placeholder="Enter Phone Number..."
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-white font-bold"
               />
               {phoneInput.length >= 10 && (
                 <button 
                  onClick={onPaymentClick}
                  className="w-full mt-4 bg-white text-[#2c3e50] py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                 >
                   Verify and Process Settlement <CheckCircle size={14} />
                 </button>
               )}
            </div>
          </div>
       </div>

       <div className="tech-card h-[400px] flex flex-col p-0 overflow-hidden">
          <div className="p-8 pb-2">
            <h2 className="text-lg font-bold flex items-center gap-2"><MapPin size={20} className="text-[#e74c3c]" /> Bin Location</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">{bin?.locationName || 'Unmapped Coordinate'}</p>
          </div>
          <div className="flex-1 bg-gray-100 border-t mt-4">
             {bin && (
               <MapContainer center={[bin.latitude || 0.3250, bin.longitude || 32.5750]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[bin.latitude || 0.3250, bin.longitude || 32.5750]}>
                    <Popup>
                      <b>Your Smart Bin</b><br/>
                      Node ID: {bin.id.slice(0,8)}
                    </Popup>
                  </Marker>
               </MapContainer>
             )}
          </div>
       </div>
    </div>
  );
}

function AdminStatCard({ label, value, icon, color }: any) {
  return (
    <div className={cn("stat-card", color)}>
      <div>
        <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">{label}</h3>
        <div className="text-2xl font-bold text-[#2c3e50]">{value}</div>
      </div>
      <div className="p-3 bg-gray-50 rounded-xl text-gray-400 opacity-40">
        {icon}
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
        active 
          ? "bg-[#2ecc71] text-white shadow-lg shadow-[#2ecc71]/20" 
          : "text-gray-500 hover:text-[#2ecc71] hover:bg-[#2ecc71]/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

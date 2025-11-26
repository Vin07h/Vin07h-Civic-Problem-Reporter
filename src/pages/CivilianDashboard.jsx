import React, { useEffect, useState } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';

export default function CivilianDashboard() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      setLoading(true);
      const q = query(collection(db, 'reports'), where('submittedBy', '==', user.uid), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(list);
      setLoading(false);
    };
    fetchReports();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description) return;
    try {
      await addDoc(collection(db, 'reports'), {
        title,
        description,
        location,
        status: 'Pending',
        submittedBy: user.uid,
        timestamp: new Date().toISOString(),
      });
      setTitle(''); setDescription(''); setLocation('');
      // Refresh list
      const q = query(collection(db, 'reports'), where('submittedBy', '==', user.uid), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to submit report', err);
    }
  };

  if (!user) return <div className="p-6">Please login to view your reports.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Submit a New Problem</h2>
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded" />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border rounded" />
        <input placeholder="Location / Address" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full p-2 border rounded" />
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Submit</button>
      </form>

      <h3 className="text-xl font-semibold mb-3">My Reports</h3>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-3">
          {reports.length === 0 && <div>No reports yet.</div>}
          {reports.map(r => (
            <div key={r.id} className="p-3 border rounded bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{r.title}</h4>
                  <div className="text-sm text-gray-600">{r.description}</div>
                </div>
                <div className="text-sm">
                  <div className={`px-2 py-1 rounded text-white ${r.status === 'Resolved' ? 'bg-green-600' : 'bg-yellow-600'}`}>{r.status}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">{new Date(r.timestamp).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import api from "../api";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); 

  useEffect(() => {
    load();
  }, []);

 async function load() {
  setLoading(true);
  setError(null);
  try {
    const r = await api.groups.list();
    setGroups(r.data);
  } catch (e) {
    setError("Failed to load groups.");
    setGroups([]);
  }
  setLoading(false);
}

  async function create(e) {
    e.preventDefault();
    try {
      await api.groups.create({ name });
      setName("");
      load();
    } catch (err) {
      alert("create failed");
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Welcome back, {localStorage.getItem('name')}!</h1>
        <p>Manage your expense groups and track balances</p>
      </div>
      <div className="grid">
        <div>
          <div className="card">
            <h2>Your Groups</h2>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}
            {groups.length === 0 && (
              <div className="small">You haven't joined any groups yet</div>
            )}
            {groups.map(g => (
              <div key={g.id} style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f1f1'}}>
                <div>
                  <Link to={`/group/${g.id}`}><strong>{g.name}</strong></Link>
                  <div className="small">{g.description || 'No description'}</div>
                </div>
                <div className="small">₹</div>
              </div>
            ))}
          </div>
          
          <div className="card">
            <h3>Create Group</h3>
            <form onSubmit={create}>
              <input 
                className="input" 
                placeholder="Group name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
              />
              <div style={{height: '8px'}}></div>
              <button className="button" type="submit" disabled={!name.trim()}>
                Create
              </button>
            </form>
          </div>
        </div>
        
        <div>
          <div className="card">
            <h3>Quick Tips</h3>
            <div className="small">
              HisaabHub uses INR (₹). Create a group to add expenses, split equally or custom shares, 
              view balances and settle up. You can invite friends to your groups after creating them.
            </div>
          </div>
        </div>
      </div>
    </div>
  ); 
}


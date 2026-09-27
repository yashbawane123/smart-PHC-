import React, { useState, useEffect } from 'react';
import { db, DEFAULT_PHC_ID, ADMIN_PROFILE_ID } from '../db/offlineDb';
import {
  AlertTriangle, Plus, Download, CheckCircle, ArrowLeft,
  Pill, UserCheck, Activity, Search, ShieldCheck, RefreshCw,
  Clock, PackageCheck, Image, FileSpreadsheet
} from 'lucide-react';
import { speakText, triggerHaptic } from '../utils/audioEngine';
import confetti from 'canvas-confetti';

export default function AdminDashboard({ lang = 'hi', onBack }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | add_med | add_doc | audit | alerts

  // Data States
  const [medicines, setMedicines] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [movements, setMovements] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Search & Filter
  const [inventorySearch, setInventorySearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Forms
  const [medForm, setMedForm] = useState({
    name_en: '',
    name_hi: '',
    name_mr: '',
    photo_url: '',
    unit: 'tablet',
    threshold: 50,
    initialQty: 100
  });

  const [docForm, setDocForm] = useState({
    full_name: '',
    photo_url: '',
    department_id: ''
  });

  const loadAdminData = async () => {
    try {
      const medList = await db.medicines.toArray();
      const stockList = await db.medicine_stock.toArray();
      const docList = await db.doctors.toArray();
      const deptList = await db.departments.toArray();
      const movList = await db.stock_movements.reverse().limit(100).toArray();
      const alertList = await db.alerts.toArray();

      setMedicines(medList);
      setStocks(stockList);
      setDoctors(docList);
      setDepartments(deptList);
      setMovements(movList);
      setAlerts(alertList);
    } catch (err) {
      console.warn('Admin data load error:', err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    if (!medForm.name_en || !medForm.photo_url) {
      alert('Please enter medicine name and photo URL');
      return;
    }

    try {
      triggerHaptic([60]);
      const medId = `med-custom-${Date.now()}`;
      await db.medicines.add({
        id: medId,
        phc_id: DEFAULT_PHC_ID,
        name_en: medForm.name_en,
        name_hi: medForm.name_hi || medForm.name_en,
        name_mr: medForm.name_mr || medForm.name_en,
        photo_url: medForm.photo_url,
        unit: medForm.unit,
        threshold: parseInt(medForm.threshold) || 20,
        is_active: true,
        created_at: new Date().toISOString()
      });

      await db.medicine_stock.add({
        id: `stock-${medId}`,
        medicine_id: medId,
        quantity: parseInt(medForm.initialQty) || 0,
        expiry_date: null,
        updated_at: new Date().toISOString()
      });

      confetti({ particleCount: 60, spread: 70 });
      speakText('नयी दवा सफलतापूर्वक जोड़ी गई', lang);
      setMedForm({ name_en: '', name_hi: '', name_mr: '', photo_url: '', unit: 'tablet', threshold: 50, initialQty: 100 });
      setActiveTab('overview');
    } catch (err) {
      console.error('Create medicine error:', err);
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    if (!docForm.full_name || !docForm.photo_url) {
      alert('Please enter doctor name and photo URL');
      return;
    }

    try {
      triggerHaptic([60]);
      const docId = `doc-custom-${Date.now()}`;
      await db.doctors.add({
        id: docId,
        phc_id: DEFAULT_PHC_ID,
        full_name: docForm.full_name,
        photo_url: docForm.photo_url,
        department_id: docForm.department_id || (departments[0]?.id || 'dept-opd-01'),
        is_active: true,
        created_at: new Date().toISOString()
      });

      confetti({ particleCount: 60, spread: 70 });
      speakText('नया डॉक्टर जोड़ा गया', lang);
      setDocForm({ full_name: '', photo_url: '', department_id: '' });
      setActiveTab('overview');
    } catch (err) {
      console.error('Create doctor error:', err);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await db.alerts.update(alertId, { status: 'resolved' });
      await loadAdminData();
      speakText('अलर्ट स्वीकृत', lang);
    } catch (err) {
      console.error('Alert acknowledge error:', err);
    }
  };

  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,Transaction_ID,Medicine_Name,Quantity_Change,Reason,Logged_By,Timestamp\n';
    movements.forEach(m => {
      const med = medicines.find(x => x.id === m.medicine_id);
      const medName = med ? med.name_en : m.medicine_id;
      const userTag = m.created_by?.includes('kamla') ? 'Kamla Pawar (Worker)' : 'Dr. Sandeep (Admin)';
      csvContent += `${m.id},"${medName}",${m.change},${m.reason},"${userTag}",${m.created_at}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Smart_PHC_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lowStockCount = stocks.filter(s => {
    const med = medicines.find(m => m.id === s.medicine_id);
    return med && (s.quantity <= med.threshold || s.quantity === 0);
  }).length;

  const filteredMedicines = medicines.filter(m =>
    (m.name_en + m.name_hi + m.name_mr).toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const filteredMovements = movements.filter(m => {
    const med = medicines.find(x => x.id === m.medicine_id);
    const nameStr = med ? med.name_en : m.medicine_id;
    return (nameStr + m.reason + m.created_by).toLowerCase().includes(auditSearch.toLowerCase());
  });

  return (
    <div className="admin-container">
      {/* Header Banner */}
      <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '20px 24px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBack}
            style={{ width: '50px', height: '50px', borderRadius: '16px', border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Back to Worker Screen"
          >
            <ArrowLeft size={24} color="var(--color-text-main)" />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-primary-dark)', letterSpacing: '-0.4px' }}>
                ⚙️ PHC In-Charge Portal
              </h2>
              <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 800 }}>
                Dr. Sandeep Sharma (MBBS, MD)
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>
              Shirur Primary Health Centre • System Admin & Audit Control
            </p>
          </div>
        </div>

        <button className="btn-large btn-primary" style={{ height: '50px', padding: '0 20px', fontSize: '14px', borderRadius: '16px' }} onClick={exportCSV}>
          <FileSpreadsheet size={20} />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="admin-tabs" style={{ background: 'var(--color-surface)', padding: '6px', borderRadius: '18px', border: '1px solid var(--color-border)' }}>
        <button className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📊 Overview
        </button>
        <button className={`admin-tab-btn ${activeTab === 'add_med' ? 'active' : ''}`} onClick={() => setActiveTab('add_med')}>
          💊 Register Medicine
        </button>
        <button className={`admin-tab-btn ${activeTab === 'add_doc' ? 'active' : ''}`} onClick={() => setActiveTab('add_doc')}>
          🩺 Add Medical Officer
        </button>
        <button className={`admin-tab-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          📜 Traceability Logs ({movements.length})
        </button>
        <button className={`admin-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
          ⚠️ Escalation Hub ({alerts.filter(a => a.status === 'open').length})
        </button>
      </div>

      {/* Tab 1: Executive Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Executive Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="admin-card" style={{ borderLeft: '6px solid var(--color-safe)', background: 'linear-gradient(135deg, #FFFFFF 70%, #ECFDF5 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 700 }}>Total Registered</span>
                <Pill size={20} color="var(--color-safe)" />
              </div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--color-text-main)', marginTop: '8px' }}>{medicines.length}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-safe-dark)', fontWeight: 700, marginTop: '4px' }}>Active Formulations</div>
            </div>

            <div className="admin-card" style={{ borderLeft: '6px solid var(--color-warning)', background: 'linear-gradient(135deg, #FFFFFF 70%, #FFFBEB 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 700 }}>Low Stock Alerts</span>
                <AlertTriangle size={20} color="var(--color-warning)" />
              </div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--color-warning-dark)', marginTop: '8px' }}>{lowStockCount}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-warning-dark)', fontWeight: 700, marginTop: '4px' }}>Needs Restock Order</div>
            </div>

            <div className="admin-card" style={{ borderLeft: '6px solid var(--color-primary)', background: 'linear-gradient(135deg, #FFFFFF 70%, #F0F9FF 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 700 }}>Active Doctors</span>
                <UserCheck size={20} color="var(--color-primary)" />
              </div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--color-primary-dark)', marginTop: '8px' }}>{doctors.length}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-primary-dark)', fontWeight: 700, marginTop: '4px' }}>Assigned PHC Staff</div>
            </div>

            <div className="admin-card" style={{ borderLeft: '6px solid #8E24AA', background: 'linear-gradient(135deg, #FFFFFF 70%, #F3E5F5 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 700 }}>Audit Logs Today</span>
                <Activity size={20} color="#8E24AA" />
              </div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#6A1B9A', marginTop: '8px' }}>{movements.length}</div>
              <div style={{ fontSize: '12px', color: '#6A1B9A', fontWeight: 700, marginTop: '4px' }}>Traceable Transactions</div>
            </div>
          </div>

          {/* Searchable Inventory Table */}
          <div className="admin-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>📦 Inventory & Threshold Control Matrix</h3>

              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '38px', height: '42px', fontSize: '14px', width: '100%' }}
                  placeholder="Search medicine..."
                  value={inventorySearch}
                  onChange={e => setInventorySearch(e.target.value)}
                />
              </div>
            </div>

            <table className="audit-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Stock Gauge</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map(m => {
                  const st = stocks.find(s => s.medicine_id === m.id);
                  const qty = st?.quantity || 0;
                  const isOut = qty === 0;
                  const isLow = qty <= m.threshold;
                  const stockPercent = Math.min(100, Math.round((qty / (m.threshold * 3 || 1)) * 100));

                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={m.photo_url} alt={m.name_en} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
                          <div>
                            <div style={{ fontWeight: 800 }}>{m.name_en}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{m.name_hi} • {m.name_mr}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '18px', fontWeight: 900 }}>{qty}</span>{' '}
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{m.unit}</span>
                      </td>
                      <td>{m.threshold} {m.unit}</td>
                      <td style={{ width: '160px' }}>
                        <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${stockPercent}%`,
                              background: isOut ? 'var(--color-danger)' : isLow ? 'var(--color-warning)' : 'var(--color-safe)'
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, background: isOut ? 'var(--color-danger-bg)' : isLow ? 'var(--color-warning-bg)' : 'var(--color-safe-bg)', color: isOut ? 'var(--color-danger-dark)' : isLow ? 'var(--color-warning-dark)' : 'var(--color-safe-dark)' }}>
                          {isOut ? '🛑 Out of Stock' : isLow ? '⚠️ Low Stock' : '✅ Safe'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Register Medicine Form */}
      {activeTab === 'add_med' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          <form className="admin-card" onSubmit={handleCreateMedicine}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '18px', color: 'var(--color-primary-dark)' }}>
              💊 Register New Formulation
            </h3>

            <div className="form-group">
              <label>Medicine Name (English) *</label>
              <input className="form-input" value={medForm.name_en} onChange={e => setMedForm({ ...medForm, name_en: e.target.value })} placeholder="e.g. Paracetamol 500mg" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label>Name in Hindi (हिंदी)</label>
                <input className="form-input" value={medForm.name_hi} onChange={e => setMedForm({ ...medForm, name_hi: e.target.value })} placeholder="पैरासिटामॉल ५०० मिग्रा" />
              </div>
              <div className="form-group">
                <label>Name in Marathi (मराठी)</label>
                <input className="form-input" value={medForm.name_mr} onChange={e => setMedForm({ ...medForm, name_mr: e.target.value })} placeholder="पॅरासिटामॉल ५०० मिग्रॅ" />
              </div>
            </div>

            <div className="form-group">
              <label>High-Resolution Photo URL *</label>
              <input className="form-input" value={medForm.photo_url} onChange={e => setMedForm({ ...medForm, photo_url: e.target.value })} placeholder="/images/paracetamol.png or https://..." required />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Samples: <code>/images/paracetamol.png</code> • <code>/images/ors.png</code> • <code>/images/vitamin_c.png</code></span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div className="form-group">
                <label>Unit Form</label>
                <select className="form-input" value={medForm.unit} onChange={e => setMedForm({ ...medForm, unit: e.target.value })}>
                  <option value="tablet">tablet</option>
                  <option value="strip">strip</option>
                  <option value="sachet">sachet</option>
                  <option value="bottle">bottle</option>
                  <option value="vial">vial</option>
                  <option value="ml">ml</option>
                </select>
              </div>

              <div className="form-group">
                <label>Low Stock Threshold</label>
                <input className="form-input" type="number" value={medForm.threshold} onChange={e => setMedForm({ ...medForm, threshold: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Initial Opening Stock</label>
                <input className="form-input" type="number" value={medForm.initialQty} onChange={e => setMedForm({ ...medForm, initialQty: e.target.value })} />
              </div>
            </div>

            <button className="btn-large btn-primary" style={{ width: '100%', height: '60px', marginTop: '16px' }} type="submit">
              <Plus size={24} />
              <span>Save & Register Medicine</span>
            </button>
          </form>

          {/* Live Preview Card */}
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textCenter: 'center', gap: '14px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-muted)' }}>LIVE CARD PREVIEW</h4>
            <div className="stock-card status-green" style={{ width: '100%', pointerEvents: 'none' }}>
              <div className="stock-img-box">
                {medForm.photo_url ? (
                  <img src={medForm.photo_url} alt="Preview" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'; }} />
                ) : (
                  <Image size={40} color="var(--color-text-muted)" />
                )}
                <div className="status-shape-badge green">✅ Safe</div>
              </div>
              <div className="stock-card-title">{medForm.name_en || 'Sample Formulation'}</div>
              <div className="stock-count-display">
                <span className="big-count-num">{medForm.initialQty || 0}</span>
                <span className="unit-tag">{medForm.unit}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Add Doctor Form */}
      {activeTab === 'add_doc' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          <form className="admin-card" onSubmit={handleCreateDoctor}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '18px', color: 'var(--color-primary-dark)' }}>
              🩺 Add Medical Officer Profile
            </h3>

            <div className="form-group">
              <label>Doctor Full Name *</label>
              <input className="form-input" value={docForm.full_name} onChange={e => setDocForm({ ...docForm, full_name: e.target.value })} placeholder="Dr. Firstname Lastname" required />
            </div>

            <div className="form-group">
              <label>Doctor Portrait Photo URL *</label>
              <input className="form-input" value={docForm.photo_url} onChange={e => setDocForm({ ...docForm, photo_url: e.target.value })} placeholder="/images/dr_sandeep.png or https://..." required />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Samples: <code>/images/dr_sandeep.png</code> • <code>/images/dr_anita.png</code></span>
            </div>

            <div className="form-group">
              <label>Assigned Department</label>
              <select className="form-input" value={docForm.department_id} onChange={e => setDocForm({ ...docForm, department_id: e.target.value })}>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name_en}</option>
                ))}
              </select>
            </div>

            <button className="btn-large btn-safe" style={{ width: '100%', height: '60px', marginTop: '16px' }} type="submit">
              <Plus size={24} />
              <span>Save Doctor Profile</span>
            </button>
          </form>

          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-muted)' }}>DOCTOR PROFILE PREVIEW</h4>
            <div className="doctor-card" style={{ width: '100%', pointerEvents: 'none' }}>
              <img
                src={docForm.photo_url || '/images/dr_sandeep.png'}
                alt="Doctor Preview"
                className="doctor-photo-circle"
                onError={(e) => { e.target.src = '/images/dr_sandeep.png'; }}
              />
              <div className="doctor-details">
                <h3>{docForm.full_name || 'Dr. Sample Doctor'}</h3>
                <p>General Medicine</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>📜 Complete Traceability Audit Log</h3>

            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '38px', height: '42px', fontSize: '14px', width: '100%' }}
                placeholder="Search by medicine, reason or user..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
              />
            </div>
          </div>

          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Medicine Formulation</th>
                <th>Quantity Delta</th>
                <th>Transaction Reason</th>
                <th>Logged By User</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map(m => {
                const med = medicines.find(x => x.id === m.medicine_id);
                const isWorker = m.created_by?.includes('kamla');

                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                        <Clock size={14} color="var(--color-text-muted)" />
                        {new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td><strong>{med ? med.name_en : m.medicine_id}</strong></td>
                    <td>
                      <span style={{ fontSize: '16px', fontWeight: 900, color: m.change > 0 ? 'var(--color-safe-dark)' : 'var(--color-danger-dark)' }}>
                        {m.change > 0 ? `+${m.change}` : m.change} {med?.unit || ''}
                      </span>
                    </td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, background: m.reason === 'restock' ? 'var(--color-safe-bg)' : m.reason === 'dispense' ? 'var(--color-danger-bg)' : 'var(--color-primary-light)', color: m.reason === 'restock' ? 'var(--color-safe-dark)' : m.reason === 'dispense' ? 'var(--color-danger-dark)' : 'var(--color-primary-dark)', textTransform: 'capitalize' }}>
                        {m.reason === 'restock' ? '📦 Restock' : m.reason === 'dispense' ? '💊 Dispense' : '⚙️ Adjustment'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>
                        {isWorker ? '👩‍⚕️ Kamla Pawar (Worker)' : '👨‍⚕️ Dr. Sandeep (Admin)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Alerts Escalation Hub */}
      {activeTab === 'alerts' && (
        <div className="admin-card">
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>⚠️ Active Low-Stock & Expiry Escalation Hub</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {alerts.map(a => {
              const med = medicines.find(m => m.id === a.medicine_id);
              const isOpen = a.status === 'open';

              return (
                <div key={a.id} style={{ background: isOpen ? 'var(--color-danger-bg)' : 'var(--color-bg)', border: '2px solid', borderColor: isOpen ? 'var(--color-danger)' : 'var(--color-border)', borderRadius: '18px', padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <AlertTriangle size={36} color={isOpen ? 'var(--color-danger)' : 'var(--color-text-muted)'} />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '17px', color: isOpen ? 'var(--color-danger-dark)' : 'var(--color-text-main)' }}>
                        {a.type === 'low_stock' ? `Low Stock Alert: ${med?.name_en || 'Medicine'}` : `Expiring Soon: ${med?.name_en || 'Medicine'}`}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Threshold limit: {med?.threshold || 0} {med?.unit} • Status: <strong style={{ textTransform: 'uppercase' }}>{a.status}</strong>
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <button className="btn-large btn-safe" style={{ height: '48px', fontSize: '14px', borderRadius: '14px' }} onClick={() => handleAcknowledgeAlert(a.id)}>
                      <CheckCircle size={20} />
                      <span>Acknowledge Alert</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

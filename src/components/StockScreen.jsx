import React, { useState, useEffect } from 'react';
import { db, WORKER_PROFILE_ID } from '../db/offlineDb';
import TallyDots from './TallyDots';
import CounterSheet from './CounterSheet';
import UndoBar from './UndoBar';
import { ArrowLeft, AlertOctagon, AlertTriangle, CheckCircle } from 'lucide-react';
import { speakText, triggerHaptic } from '../utils/audioEngine';
import { syncEngine } from '../utils/syncEngine';

export default function StockScreen({ lang = 'hi', onBack }) {
  const [medicines, setMedicines] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [selectedMed, setSelectedMed] = useState(null);
  const [filter, setFilter] = useState('all'); // all | low | ready
  const [searchQuery, setSearchQuery] = useState('');

  // Undo state
  const [undoState, setUndoState] = useState(null); // { med, delta, prevQty, movementId }

  const loadData = async () => {
    try {
      const medList = await db.medicines.where('is_active').equals(1).toArray();
      const stockList = await db.medicine_stock.toArray();

      const map = {};
      stockList.forEach(s => {
        map[s.medicine_id] = s;
      });

      setMedicines(medList);
      setStockMap(map);
    } catch (err) {
      console.warn('Stock screen data fetch error:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStock = async (medicine, delta, reason) => {
    try {
      const current = stockMap[medicine.id] || { quantity: 0 };
      const prevQty = current.quantity;
      const newQty = Math.max(0, prevQty + delta);

      // 1. Optimistic Local IndexedDB update
      await db.medicine_stock.put({
        id: current.id || `stock-${medicine.id}`,
        medicine_id: medicine.id,
        quantity: newQty,
        updated_at: new Date().toISOString()
      });

      // 2. Audit Movement log
      const mId = `mov-${Date.now()}`;
      await db.stock_movements.add({
        id: mId,
        medicine_id: medicine.id,
        change: delta,
        reason: reason,
        created_by: WORKER_PROFILE_ID,
        created_at: new Date().toISOString(),
        synced: 0
      });

      // Reload local screen state
      await loadData();

      // Background Sync Trigger
      syncEngine.triggerSync();

      // Show 5-second Undo Floating Bar
      const medName = lang === 'mr' ? medicine.name_mr || medicine.name_en : lang === 'hi' ? medicine.name_hi || medicine.name_en : medicine.name_en;
      const message = `${medName}: ${delta > 0 ? '+' : ''}${delta} ${medicine.unit}`;

      setUndoState({
        medicine,
        delta,
        prevQty,
        movementId: mId,
        message
      });
    } catch (err) {
      console.error('Stock update error:', err);
    }
  };

  const handleExecuteUndo = async () => {
    if (!undoState) return;
    try {
      const { medicine, prevQty, movementId } = undoState;

      // Revert Stock
      await db.medicine_stock.put({
        id: stockMap[medicine.id]?.id || `stock-${medicine.id}`,
        medicine_id: medicine.id,
        quantity: prevQty,
        updated_at: new Date().toISOString()
      });

      // Delete optimistic movement
      await db.stock_movements.delete(movementId);

      await loadData();
      speakText(lang === 'mr' ? 'कृती मागे घेतली' : lang === 'hi' ? 'कार्य वापस लिया गया' : 'Action undone', lang);
      setUndoState(null);
    } catch (err) {
      console.error('Undo execution error:', err);
    }
  };

  const getStatusInfo = (med, stock) => {
    const qty = stock?.quantity || 0;
    if (qty === 0) {
      return { level: 'red', label: lang === 'mr' ? 'संपला' : lang === 'hi' ? 'समाप्त' : 'Out of Stock', icon: <AlertOctagon size={16} /> };
    }
    if (qty <= med.threshold) {
      return { level: 'yellow', label: lang === 'mr' ? 'कमी साठा' : lang === 'hi' ? 'कम स्टॉक' : 'Low Stock', icon: <AlertTriangle size={16} /> };
    }
    return { level: 'green', label: lang === 'mr' ? 'उपलब्ध' : lang === 'hi' ? 'उपलब्ध' : 'Available', icon: <CheckCircle size={16} /> };
  };

  const filteredMedicines = medicines.filter(med => {
    const stock = stockMap[med.id];
    const qty = stock?.quantity || 0;
    const nameMatch = (med.name_en + med.name_hi + med.name_mr).toLowerCase().includes(searchQuery.toLowerCase());

    if (!nameMatch) return false;
    if (filter === 'low') return qty <= med.threshold;
    if (filter === 'ready') return qty > med.threshold;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '90vh', position: 'relative' }}>
      {/* Module Title Bar */}
      <div style={{ background: 'var(--color-surface)', padding: '16px 20px', borderBottom: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={onBack}
          style={{ width: '56px', height: '56px', borderRadius: '16px', border: 'none', background: 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={28} />
        </button>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-safe)' }}>
            💊 {lang === 'mr' ? 'औषध साठा' : lang === 'hi' ? 'दवा स्टॉक' : 'Medicine Stock'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {lang === 'mr' ? 'औषधावर टॅप करून मोजा' : lang === 'hi' ? 'दवा पर टैप करके गिनती करें' : 'Tap medicine card to count'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: 'var(--color-bg)' }}>
        <button
          className={`lang-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {lang === 'mr' ? 'सर्व (All)' : lang === 'hi' ? 'सभी (All)' : 'All'}
        </button>
        <button
          className={`lang-chip ${filter === 'low' ? 'active' : ''}`}
          style={{ borderColor: filter === 'low' ? 'var(--color-warning)' : 'var(--color-border)' }}
          onClick={() => setFilter('low')}
        >
          ⚠️ {lang === 'mr' ? 'कमी साठा' : lang === 'hi' ? 'कम स्टॉक' : 'Low Stock'}
        </button>
      </div>

      {/* Medicine Picture Grid */}
      <div className="medicine-grid">
        {filteredMedicines.map(med => {
          const stock = stockMap[med.id];
          const status = getStatusInfo(med, stock);
          const qty = stock?.quantity || 0;
          const medName = lang === 'mr' ? med.name_mr || med.name_en : lang === 'hi' ? med.name_hi || med.name_en : med.name_en;

          return (
            <div
              key={med.id}
              className={`stock-card status-${status.level}`}
              onClick={() => {
                triggerHaptic([40]);
                setSelectedMed(med);
                speakText(medName, lang);
              }}
            >
              {/* Photo Box */}
              <div className="stock-img-box">
                <img src={med.photo_url} alt={medName} />
                <div className={`status-shape-badge ${status.level}`}>
                  {status.icon}
                  <span>{status.label}</span>
                </div>
              </div>

              <div className="stock-card-title">{medName}</div>

              {/* Big Count + Unit + Tally Dots */}
              <div className="stock-count-display">
                <span className="big-count-num">{qty}</span>
                <span className="unit-tag">{med.unit}</span>
              </div>

              <TallyDots count={qty} maxDisplay={20} />

              {stock?.expiry_date && (
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-warning)', background: 'var(--color-warning-bg)', padding: '2px 6px', borderRadius: '6px', alignSelf: 'flex-start' }}>
                  ⏳ {stock.expiry_date}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Counter Bottom Sheet Modal */}
      {selectedMed && (
        <CounterSheet
          medicine={selectedMed}
          currentStock={stockMap[selectedMed.id]}
          lang={lang}
          onClose={() => setSelectedMed(null)}
          onUpdateStock={handleUpdateStock}
        />
      )}

      {/* Floating 5-Second Undo Bar */}
      {undoState && (
        <UndoBar
          actionMessage={undoState.message}
          lang={lang}
          onUndo={handleExecuteUndo}
          onExpire={() => setUndoState(null)}
        />
      )}
    </div>
  );
}

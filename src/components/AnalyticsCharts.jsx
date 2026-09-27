import React, { useEffect, useState } from 'react';
import { db } from '../db/offlineDb';
import { TrendingUp, Activity, PieChart, ShieldCheck } from 'lucide-react';

export default function AnalyticsCharts({ lang = 'hi' }) {
  const [stockSummary, setStockSummary] = useState({ safe: 0, low: 0, out: 0, total: 0 });
  const [footfallSummary, setFootfallSummary] = useState([]);
  const [doctorPresence, setDoctorPresence] = useState({ present: 0, total: 0 });

  useEffect(() => {
    const calculateAnalytics = async () => {
      try {
        // Stock summary
        const medicines = await db.medicines.where('is_active').equals(1).toArray();
        const stocks = await db.medicine_stock.toArray();

        let safe = 0, low = 0, out = 0;
        medicines.forEach(m => {
          const st = stocks.find(s => s.medicine_id === m.id);
          const qty = st?.quantity || 0;
          if (qty === 0) out++;
          else if (qty <= m.threshold) low++;
          else safe++;
        });
        setStockSummary({ safe, low, out, total: medicines.length });

        // Footfall summary
        const todayStr = new Date().toISOString().split('T')[0];
        const depts = await db.departments.toArray();
        const footfalls = await db.patient_footfall.where('visit_date').equals(todayStr).toArray();

        const ffList = depts.map(d => {
          const record = footfalls.find(f => f.department_id === d.id);
          return {
            name: lang === 'mr' ? d.name_mr : lang === 'hi' ? d.name_hi : d.name_en,
            count: record?.count || 0
          };
        });
        setFootfallSummary(ffList);

        // Doctor presence
        const doctors = await db.doctors.where('is_active').equals(1).toArray();
        const att = await db.doctor_attendance.where('attendance_date').equals(todayStr).toArray();
        const presentCount = att.filter(a => a.status === 'present').length;

        setDoctorPresence({ present: presentCount, total: doctors.length });
      } catch (err) {
        console.warn('Analytics calculation error:', err);
      }
    };

    calculateAnalytics();
  }, [lang]);

  const safePercent = stockSummary.total ? Math.round((stockSummary.safe / stockSummary.total) * 100) : 0;
  const maxFootfall = Math.max(...footfallSummary.map(f => f.count), 1);

  return (
    <div className="analytics-section">
      <div className="analytics-header">
        <Activity size={24} color="var(--color-primary)" />
        <h3>{lang === 'mr' ? 'आरोग्य केंद्र विश्लेषक (PHC Real-time Analytics)' : lang === 'hi' ? 'स्वास्थ्य केंद्र एनालिटिक्स (Real-time)' : 'PHC Analytics & Health Index'}</h3>
      </div>

      <div className="analytics-grid">
        {/* 1. Inventory Health Gauge */}
        <div className="analytics-card">
          <div className="card-top">
            <PieChart size={20} color="var(--color-primary)" />
            <span>{lang === 'mr' ? 'साठा स्थिती (Inventory Health)' : lang === 'hi' ? 'स्टॉक स्थिति (Inventory Health)' : 'Inventory Health'}</span>
          </div>

          <div className="gauge-hero">
            <div className="gauge-number">{safePercent}%</div>
            <div className="gauge-label">{lang === 'mr' ? 'सुरक्षित साठा उपलब्ध' : lang === 'hi' ? 'सुरक्षित स्टॉक उपलब्ध' : 'Adequate Stock Ratio'}</div>
          </div>

          <div className="progress-bar-track">
            <div className="progress-fill safe" style={{ width: `${(stockSummary.safe / (stockSummary.total || 1)) * 100}%` }} title="Safe Stock" />
            <div className="progress-fill warning" style={{ width: `${(stockSummary.low / (stockSummary.total || 1)) * 100}%` }} title="Low Stock" />
            <div className="progress-fill danger" style={{ width: `${(stockSummary.out / (stockSummary.total || 1)) * 100}%` }} title="Out of Stock" />
          </div>

          <div className="legend-row">
            <span className="legend-item safe">🟢 {stockSummary.safe} Safe</span>
            <span className="legend-item warning">🟡 {stockSummary.low} Low</span>
            <span className="legend-item danger">🔴 {stockSummary.out} Out</span>
          </div>
        </div>

        {/* 2. Patient Footfall Distribution */}
        <div className="analytics-card">
          <div className="card-top">
            <TrendingUp size={20} color="var(--color-safe)" />
            <span>{lang === 'mr' ? 'आजचे रुग्ण (Today Footfall Breakdown)' : lang === 'hi' ? 'आज की मरीज संख्या (Footfall)' : 'Today Patient Distribution'}</span>
          </div>

          <div className="bar-chart-container">
            {footfallSummary.map((item, idx) => {
              const barHeight = Math.max(12, (item.count / maxFootfall) * 100);
              return (
                <div key={idx} className="chart-bar-column">
                  <span className="bar-value">{item.count}</span>
                  <div className="bar-pill-outer">
                    <div className="bar-pill-inner" style={{ height: `${barHeight}%` }} />
                  </div>
                  <span className="bar-label">{item.name.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Doctor Roster Status */}
        <div className="analytics-card">
          <div className="card-top">
            <ShieldCheck size={20} color="var(--color-warning)" />
            <span>{lang === 'mr' ? 'डॉक्टर हजेरी दर' : lang === 'hi' ? 'डॉक्टर उपस्थिति दर' : 'Doctor Presence Ratio'}</span>
          </div>

          <div className="gauge-hero">
            <div className="gauge-number" style={{ color: 'var(--color-safe)' }}>
              {doctorPresence.present} / {doctorPresence.total}
            </div>
            <div className="gauge-label">{lang === 'mr' ? 'डॉक्टर आज हजर' : lang === 'hi' ? 'डॉक्टर आज उपस्थित' : 'Doctors Present Today'}</div>
          </div>

          <div className="doctor-status-strip">
            {doctorPresence.present === doctorPresence.total ? (
              <span style={{ color: 'var(--color-safe)', fontWeight: 800 }}>✅ All Doctors On Duty</span>
            ) : (
              <span style={{ color: 'var(--color-warning)', fontWeight: 800 }}>⚠️ {doctorPresence.total - doctorPresence.present} Doctor Unmarked/Absent</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

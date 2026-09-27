import { db } from '../db/offlineDb';
import { invokeSupabaseRPC } from './supabaseClient';

export class SyncEngine {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isSyncing = false;
    this.listeners = new Set();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  handleNetworkChange(online) {
    this.isOnline = online;
    this.notify();
    if (online) {
      this.triggerSync();
    }
  }

  setSimulatedOnline(onlineStatus) {
    this.isOnline = onlineStatus;
    this.notify();
    if (onlineStatus) {
      this.triggerSync();
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn({ isOnline: this.isOnline, isSyncing: this.isSyncing }));
  }

  async getPendingCount() {
    try {
      const unsyncedMovements = await db.stock_movements.where('synced').equals(0).count();
      const unsyncedFootfall = await db.patient_footfall.where('synced').equals(0).count();
      const unsyncedAttendance = await db.doctor_attendance.where('synced').equals(0).count();
      return unsyncedMovements + unsyncedFootfall + unsyncedAttendance;
    } catch {
      return 0;
    }
  }

  async triggerSync() {
    if (!this.isOnline || this.isSyncing) return;

    this.isSyncing = true;
    this.notify();

    try {
      // 1. Sync Stock Movements
      const pendingMovements = await db.stock_movements.where('synced').equals(0).toArray();
      for (const m of pendingMovements) {
        const res = await invokeSupabaseRPC('increment_stock', {
          p_medicine_id: m.medicine_id,
          p_delta: m.change,
          p_reason: m.reason,
          p_user: m.created_by
        });
        if (res.success) {
          await db.stock_movements.update(m.id, { synced: 1 });
        }
      }

      // 2. Sync Footfall
      const pendingFootfall = await db.patient_footfall.where('synced').equals(0).toArray();
      for (const f of pendingFootfall) {
        const res = await invokeSupabaseRPC('increment_footfall', {
          p_department_id: f.department_id,
          p_phC_id: f.phc_id,
          p_delta: f.count,
          p_user: 'system'
        });
        if (res.success) {
          await db.patient_footfall.update(f.id, { synced: 1 });
        }
      }

      // 3. Sync Doctor Attendance
      const pendingAtt = await db.doctor_attendance.where('synced').equals(0).toArray();
      for (const a of pendingAtt) {
        await db.doctor_attendance.update(a.id, { synced: 1 });
      }

    } catch (err) {
      console.warn('Sync process background exception:', err);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const syncEngine = new SyncEngine();

import { db } from '../db/offlineDb';
import { invokeSupabaseRPC, upsertSupabaseTable } from './supabaseClient';

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
      const unsyncedPatients = await db.patients.where('synced').equals(0).count();
      const unsyncedDocs = await db.patient_documents.where('synced').equals(0).count();
      const unsyncedEvents = await db.patient_timeline_events.where('synced').equals(0).count();
      const unsyncedFollowUps = await db.follow_ups.where('synced').equals(0).count();

      return (
        unsyncedMovements +
        unsyncedFootfall +
        unsyncedAttendance +
        unsyncedPatients +
        unsyncedDocs +
        unsyncedEvents +
        unsyncedFollowUps
      );
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
          p_phc_id: f.phc_id,
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

      // 4. Sync Patients
      const pendingPatients = await db.patients.where('synced').equals(0).toArray();
      for (const p of pendingPatients) {
        const res = await upsertSupabaseTable('patients', p);
        if (res.success) {
          await db.patients.update(p.id, { synced: 1 });
        }
      }

      // 5. Sync Patient Documents
      const pendingDocs = await db.patient_documents.where('synced').equals(0).toArray();
      for (const d of pendingDocs) {
        const res = await upsertSupabaseTable('patient_documents', d);
        if (res.success) {
          await db.patient_documents.update(d.id, { synced: 1 });
        }
      }

      // 6. Sync Timeline Events
      const pendingEvents = await db.patient_timeline_events.where('synced').equals(0).toArray();
      for (const e of pendingEvents) {
        const res = await upsertSupabaseTable('patient_timeline_events', e);
        if (res.success) {
          await db.patient_timeline_events.update(e.id, { synced: 1 });
        }
      }

      // 7. Sync Follow-ups
      const pendingFollowUps = await db.follow_ups.where('synced').equals(0).toArray();
      for (const f of pendingFollowUps) {
        const res = await upsertSupabaseTable('follow_ups', f);
        if (res.success) {
          await db.follow_ups.update(f.id, { synced: 1 });
        }
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


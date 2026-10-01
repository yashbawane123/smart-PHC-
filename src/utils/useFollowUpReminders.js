import { useState, useEffect } from 'react';
import { db } from '../db/offlineDb';
import { syncEngine } from './syncEngine';

export function useFollowUpReminders() {
  const [reminders, setReminders] = useState([]);

  const checkReminders = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const threeDaysLaterObj = new Date(Date.now() + 3 * 86400000);
      const threeDaysLaterStr = threeDaysLaterObj.toISOString().split('T')[0];

      // Query all pending follow_ups
      const allPending = await db.follow_ups
        .where('status')
        .equals('pending')
        .toArray();

      const patients = await db.patients.toArray();

      // 1. Auto-mark missed for overdue items where due_date < todayStr
      for (const fu of allPending) {
        if (fu.due_date && fu.due_date < todayStr) {
          await db.follow_ups.update(fu.id, { status: 'missed', synced: 0 });
        }
      }

      // Re-fetch remaining pending items with due_date <= today + 3 days
      const updatedPending = await db.follow_ups
        .where('status')
        .equals('pending')
        .toArray();

      const dueReminders = [];
      for (const fu of updatedPending) {
        if (!fu.due_date || fu.due_date <= threeDaysLaterStr) {
          const patientObj = patients.find(p => p.id === fu.patient_id);
          dueReminders.push({
            ...fu,
            patientName: patientObj ? patientObj.name : 'Patient'
          });
        }
      }

      setReminders(dueReminders);
    } catch (err) {
      console.warn('Error checking follow-up reminders:', err);
    }
  };

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const markDone = async (followUpId) => {
    try {
      await db.follow_ups.update(followUpId, { status: 'done', synced: 0 });
      syncEngine.triggerSync();
      await checkReminders();
    } catch (err) {
      console.error('Error marking follow up done:', err);
    }
  };

  return { reminders, markDone, refreshReminders: checkReminders };
}

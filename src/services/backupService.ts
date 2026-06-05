/**
 * JSON backup / restore. Because all data is local-only, the user owns it and
 * must be able to move it between devices and keep a safety copy. (CSV export
 * is a thin V2 addition on top of this.)
 */
import { personRepository } from '../repositories/personRepository';
import { nowTimestamp } from '../lib/date';
import { emitDataChanged } from '../lib/events';
import type { Person } from '../types/person';

export interface BackupFile {
  app: 'relationship-crm';
  version: 1;
  exportedAt: string;
  people: Person[];
}

export const backupService = {
  async export(): Promise<BackupFile> {
    const people = await personRepository.getAll();
    return {
      app: 'relationship-crm',
      version: 1,
      exportedAt: nowTimestamp(),
      people,
    };
  },

  async exportToBlob(): Promise<Blob> {
    const data = await this.export();
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  },

  /** Validate and restore a backup, replacing all current data. */
  async import(raw: unknown): Promise<number> {
    const data = parseBackup(raw);
    await personRepository.replaceAll(data.people);
    emitDataChanged();
    return data.people.length;
  },

  /** Export contacts as CSV (V2-friendly, built on the same data). */
  async exportCsv(): Promise<Blob> {
    const people = await personRepository.getAll();
    const headers = [
      'name', 'company', 'role', 'phone', 'email', 'whereMet', 'tags', 'relationshipStrength',
      'contactFrequencyDays', 'createdDate', 'lastContactDate', 'nextContactDate', 'notes',
    ];
    const rows = people.map((p) =>
      [
        p.name, p.company ?? '', p.role ?? '', p.phone ?? '', p.email ?? '', p.whereMet ?? '',
        p.tags.join('; '), String(p.relationshipStrength), String(p.contactFrequencyDays),
        p.createdDate, p.lastContactDate ?? '', p.nextContactDate, p.notes ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
    return new Blob([[headers.join(','), ...rows].join('\r\n')], { type: 'text/csv' });
  },
};

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseBackup(raw: unknown): BackupFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid backup file.');
  }
  const data = raw as Partial<BackupFile>;
  if (data.app !== 'relationship-crm' || !Array.isArray(data.people)) {
    throw new Error('This file is not a Reconnect backup.');
  }
  for (const person of data.people) {
    if (!person || typeof person.id !== 'string' || typeof person.name !== 'string') {
      throw new Error('Backup contains a malformed contact record.');
    }
  }
  return { app: 'relationship-crm', version: 1, exportedAt: data.exportedAt ?? '', people: data.people };
}

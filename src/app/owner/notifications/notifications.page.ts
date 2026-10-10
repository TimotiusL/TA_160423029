import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';

addIcons({
  searchOutline
});

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  read: boolean;
  date: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss']
})
export class NotificationsPage {

  userId = 'owner1';

  notifs: Notification[] = [
    {
      id: 'n1',
      userId: 'owner1',
      title: 'Pendaftaran Baru',
      message:
        'Rizky Aditya mendaftar untuk kamar 202 di Kost Griya 21',
      type: 'info',
      read: false,
      date: '2026-08-28'
    },

    {
      id: 'n2',
      userId: 'owner1',
      title: 'Pembayaran Diterima',
      message:
        'Kevin Pratama telah mengirim bukti pembayaran tagihan September sebesar Rp1.479.000',
      type: 'success',
      read: false,
      date: '2026-09-10'
    },

    {
      id: 'n3',
      userId: 'owner1',
      title: 'Komplain Baru',
      message:
        'Sari Indah mengajukan komplain: Kran kamar mandi bocor di kamar 104',
      type: 'warning',
      read: false,
      date: '2026-08-28'
    },

    {
      id: 'n4',
      userId: 'owner1',
      title: 'Tagihan Jatuh Tempo',
      message:
        '3 tagihan akan jatuh tempo dalam 5 hari',
      type: 'warning',
      read: true,
      date: '2026-09-01'
    },

    {
      id: 'n5',
      userId: 'owner1',
      title: 'Kontrak Berakhir',
      message:
        'Kontrak Budi Santoso akan berakhir pada 31 Desember 2026',
      type: 'info',
      read: true,
      date: '2026-08-25'
    },

    {
      id: 'n6',
      userId: 't1',
      title: 'Tagihan September Tersedia',
      message:
        'Tagihan September 2026 Anda sudah tersedia. Total: Rp1.075.000',
      type: 'info',
      read: false,
      date: '2026-09-01'
    },

    {
      id: 'n7',
      userId: 't1',
      title: 'Pembayaran Diverifikasi',
      message:
        'Pembayaran cicilan Rp500.000 Anda telah diverifikasi oleh pemilik kos',
      type: 'success',
      read: false,
      date: '2026-09-02'
    },

    {
      id: 'n8',
      userId: 't1',
      title: 'Komplain Direspon',
      message:
        'Pemilik kos merespons komplain AC kamar Anda',
      type: 'info',
      read: true,
      date: '2026-08-21'
    }
  ];

  get filteredNotifications(): Notification[] {
    return this.notifs.filter(
      notification =>
        notification.userId === 'owner1' ||
        notification.userId === this.userId
    );
  }

  get unread(): number {
    return this.filteredNotifications.filter(
      notification => !notification.read
    ).length;
  }

  get typeIcon(): Record<string, string> {
    return {
      info: '🔵',
      success: '🟢',
      warning: '🟡',
      danger: '🔴'
    };
  }

  markAllRead(): void {
    this.notifs = this.notifs.map(
      notification => ({
        ...notification,
        read: true
      })
    );
  }

  markAsRead(id: string): void {
    this.notifs = this.notifs.map(
      notification =>
        notification.id === id
          ? {
              ...notification,
              read: true
            }
          : notification
    );
  }

  formatDate(date: string): string {
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember'
    ];

    const dateObject = new Date(date);

    return `${dateObject.getDate()} ${
      months[dateObject.getMonth()]
    } ${dateObject.getFullYear()}`;
  }
}
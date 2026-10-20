import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../services/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  read: boolean;
  date: string;
  link?: string | null;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss']
})
export class NotificationsPage {
  notifs: Notification[] = [];
  loading = false;
  errorMessage = '';

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  // Dipanggil setiap kali halaman akan ditampilkan
  ionViewWillEnter(): void {
    this.loadNotifications();
  }

  get filteredNotifications(): Notification[] {
    return this.notifs;
  }

  get unread(): number {
    return this.notifs.filter(item => !item.read).length;
  }

  loadNotifications(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.getNotifikasi().subscribe({
      next: (response: any) => {
        const data = response?.data ?? [];

        this.notifs = data.map((item: any) => ({
          id: Number(item.id_notifikasi),
          title: item.judul,
          message: item.pesan,
          type: item.tipe ?? 'info',
          read: item.status_baca === 'terbaca',
          date: item.created_at,
          link: item.link ?? null
        }));

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal mengambil notifikasi:', error);
        this.errorMessage =
          'Notifikasi gagal dimuat. Periksa koneksi dan login Anda.';
        this.loading = false;
      }
    });
  }

  markAsRead(id: number): void {
    const notification = this.notifs.find(item => item.id === id);

    if (!notification || notification.read) {
      return;
    }

    this.api.markNotifikasiAsRead(id).subscribe({
      next: () => {
        this.notifs = this.notifs.map(item =>
          item.id === id ? { ...item, read: true } : item
        );
      },
      error: error => {
        console.error('Gagal menandai notifikasi:', error);
      }
    });
  }

  markAllRead(): void {
    if (this.unread === 0) {
      return;
    }

    this.api.markAllNotifikasiAsRead().subscribe({
      next: () => {
        this.notifs = this.notifs.map(item => ({
          ...item,
          read: true
        }));
      },
      error: error => {
        console.error('Gagal menandai semua notifikasi:', error);
      }
    });
  }

  formatDate(date: string): string {
    if (!date) {
      return '-';
    }

    const dateObject = new Date(date.replace(' ', 'T'));

    if (isNaN(dateObject.getTime())) {
      return '-';
    }

    return dateObject.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}

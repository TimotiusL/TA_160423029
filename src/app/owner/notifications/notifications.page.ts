import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(private api: ApiService, private cdr: ChangeDetectorRef, private router: Router) {}

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

  openNotification(item: Notification): void {
    const navigate = () => {
      if (item.link && item.link.startsWith('/') && !item.link.startsWith('//')) {
        this.router.navigateByUrl(item.link);
      }
    };

    if (item.read) {
      navigate();
      return;
    }

    this.api.markNotifikasiAsRead(item.id).subscribe({
      next: () => {
        item.read = true;
        this.cdr.detectChanges();
        navigate();
      },
      error: error => {
        console.error('Gagal menandai notifikasi:', error);
        navigate();
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

import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

interface TenantNotification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  date: string;
  read: boolean;
  target: string;
}

@Component({
  selector: 'app-tenant-notifications',
  standalone: true,
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  imports: [CommonModule, IonContent]
})
export class NotificationsPage {
  constructor(private router: Router, private api: ApiService, private cdr: ChangeDetectorRef) {}

  notifications: TenantNotification[] = [];
  loading = false;
  errorMessage = '';
  toastMessage = '';

  ionViewWillEnter(): void {
    this.loadNotifications();
  }

  get unreadCount(): number { return this.notifications.filter(item => !item.read).length; }
  get allRead(): boolean { return this.unreadCount === 0; }

  loadNotifications(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getNotifikasi().subscribe({
      next: (response: any) => {
        const data: any[] = Array.isArray(response?.data) ? response.data : [];
        this.notifications = data.map((item: any) => ({
          id: Number(item.id_notifikasi),
          type: this.normalizeType(item.tipe),
          title: item.judul || 'Notifikasi',
          message: item.pesan || '',
          date: item.created_at || '',
          read: item.status_baca === 'terbaca',
          target: this.resolveTarget(item.link, item.judul, item.pesan)
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal memuat notifikasi tenant:', error);
        this.errorMessage = error?.error?.message || 'Notifikasi gagal dimuat. Periksa koneksi dan login.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  markAllRead(): void {
    if (this.allRead) return;
    this.api.markAllNotifikasiAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map(item => ({ ...item, read: true }));
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal menandai semua notifikasi:', error);
        this.showToast('Gagal menandai notifikasi sudah dibaca.');
      }
    });
  }

  openNotification(item: TenantNotification): void {
    if (item.read) {
      this.router.navigateByUrl(item.target);
      return;
    }

    this.api.markNotifikasiAsRead(item.id).subscribe({
      next: () => {
        item.read = true;
        this.cdr.detectChanges();
        this.router.navigateByUrl(item.target);
      },
      error: (error: any) => {
        console.error('Gagal menandai notifikasi:', error);
        this.router.navigateByUrl(item.target);
      }
    });
  }

  private normalizeType(value: string): TenantNotification['type'] {
    const known = ['info', 'success', 'warning', 'danger'];
    return known.includes(value) ? value as TenantNotification['type'] : 'info';
  }

  private resolveTarget(link: string | null, title: string, message: string): string {
    if (link && link.startsWith('/') && !link.startsWith('//')) return link;
    const text = `${title || ''} ${message || ''}`.toLowerCase();
    if (text.includes('komplain') || text.includes('tanggapan')) return '/tenant/complaints';
    if (text.includes('tagihan') || text.includes('jatuh tempo')) return '/tenant/billing';
    if (text.includes('pembayaran') || text.includes('bukti bayar')) return '/tenant/payment-history';
    if (text.includes('kontrak') || text.includes('sewa')) return '/tenant/contract-detail';
    if (text.includes('pendaftaran') || text.includes('pengajuan')) return '/tenant/application-status';
    if (text.includes('profil') || text.includes('ktp')) return '/tenant/profile';
    return '/tenant/dashboard';
  }

  tanggal(value: string): string {
    if (!value) return '-';
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  icon(type: string): string {
    return ({ info: '🔵', success: '🟢', warning: '🟡', danger: '🔴' } as Record<string, string>)[type] || '🔵';
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    this.cdr.detectChanges();
    window.setTimeout(() => { this.toastMessage = ''; this.cdr.detectChanges(); }, 3000);
  }
}

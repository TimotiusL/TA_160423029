import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { ApiService } from '../../services/api';

const RUPIAH_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
});

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

const PERIOD_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric'
});

interface TenantContract {
  active: boolean;
  propertyName: string;
  room: string;
  startDate: string;
  endDate: string;
  rentalPrice: number;
}

interface DashboardBill {
  id: number;
  period: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  remaining: number;
  status: string;
  code?: string;
}

interface Payment {
  id: number;
  amount: number;
  date: string;
  method: string;
  status: string;
  billCode?: string;
}

interface Complaint {
  id: number;
  title: string;
  date: string;
  responseCount: number;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent]
})
export class DashboardPage implements OnInit {
  nama = 'Penghuni';
  email = '';
  loading = false;
  errorMessage = '';

  contract: TenantContract | null = null;
  bills: DashboardBill[] = [];
  unpaidBills: DashboardBill[] = [];
  payments: Payment[] = [];
  complaints: Complaint[] = [];
  recentComplaints: Complaint[] = [];
  unreadNotifications = 0;
  totalBills = 0;
  unpaidBillCount = 0;
  totalComplaints = 0;

  constructor(
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        this.nama = user.nama || user.name || 'Penghuni';
        this.email = user.email || '';
      } catch {
        this.nama = 'Penghuni';
      }
    }

    this.loadDashboard();
  }

  loadDashboard(): void {
    if (this.loading) return;

    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.api.getTenantDashboard().subscribe({
      next: (response) => {
        const user = response?.user || {};
        this.nama = user.nama || this.nama;
        this.email = user.email || this.email;

        const contract = response?.kontrak_aktif;

        const currentContract = contract && contract.status === 'aktif' ? contract : null;

        this.contract = currentContract ? {
          active: true,
          propertyName: currentContract.nama_kos || 'Kos',
          room: `Kamar ${currentContract.no_kamar ?? '-'}${currentContract.nama_jenis ? ' · ' + currentContract.nama_jenis : ''}`,
          startDate: currentContract.tgl_mulai || '',
          endDate: currentContract.tgl_selesai || '',
          rentalPrice: Number(currentContract.harga_sewa || 0)
        } : null;

        this.bills = (response?.tagihan_terbaru || []).map((bill: any) => this.mapBill(bill));
        this.unpaidBills = (response?.tagihan_belum_lunas_data || [])
          .map((bill: any) => this.mapBill(bill));
        this.payments = (response?.pembayaran_terbaru || []).map((payment: any) => ({
          id: Number(payment.id),
          amount: Number(payment.amount || 0),
          date: payment.date || '',
          method: payment.method || '-',
          status: payment.status || '',
          billCode: payment.kode_tagihan || ''
        }));
        this.complaints = (response?.komplain_terbaru || []).map((complaint: any) => ({
          id: Number(complaint.id),
          title: complaint.title || 'Komplain',
          date: complaint.date || '',
          responseCount: Number(complaint.response_count || 0),
          status: complaint.status || ''
        }));
        this.recentComplaints = this.complaints.slice(0, 2);

        this.unreadNotifications = Number(response?.notifikasi_belum_terbaca || 0);
        this.totalBills = Number(response?.jumlah_tagihan || 0);
        this.unpaidBillCount = Number(response?.tagihan_belum_lunas || 0);
        this.totalComplaints = Number(response?.jumlah_komplain || 0);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message
          || 'Data dashboard belum berhasil dimuat. Periksa koneksi ke server Laravel lalu coba muat ulang.';
        this.cdr.markForCheck();
      }
    });
  }

  private mapBill(bill: any): DashboardBill {
    return {
      id: Number(bill.id_tagihan),
      period: this.formatPeriod(bill.periode || ''),
      dueDate: bill.tgl_jatuhTempo || '',
      total: Number(bill.total_tagihan_berjalan ?? bill.total_tagihan ?? 0),
      paidAmount: Number(bill.total_terbayar || 0),
      remaining: Number(bill.sisa_tagihan || 0),
      status: bill.status_dashboard || bill.status || '',
      code: bill.kode_tagihan || ''
    };
  }

  get currentBill(): DashboardBill | undefined {
    return this.unpaidBills.find(bill => bill.remaining > 0);
  }

  get myComplaints(): Complaint[] {
    return this.complaints;
  }

  get payHistory(): Payment[] {
    return this.payments;
  }

  get remainingBill(): number {
    return this.currentBill?.remaining || 0;
  }

  get paymentProgress(): number {
    const bill = this.currentBill;
    if (!bill || !bill.total) return 0;
    return Math.min(100, Math.round((bill.paidAmount / bill.total) * 100));
  }

  rupiah(value: number): string {
    return RUPIAH_FORMATTER.format(Number(value || 0));
  }

  tanggal(value: string): string {
    if (!value) return '-';
    const dateOnly = value.substring(0, 10);
    const parts = dateOnly.split('-');
    if (parts.length !== 3) return '-';

    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (Number.isNaN(date.getTime())) return '-';

    return DATE_FORMATTER.format(date);
  }

  private formatPeriod(value: string): string {
    const match = value.match(/^(\d{1,2})\/(\d{4})$/);
    if (!match) return value || '-';

    const month = Number(match[1]);
    const year = Number(match[2]);
    if (month < 1 || month > 12) return value;

    const date = new Date(year, month - 1, 1);
    return PERIOD_FORMATTER.format(date);
  }

  statusLabel(status: string): string {
    const key = (status || '').toUpperCase();
    const labels: Record<string, string> = {
      DIVERIFIKASI: 'DIVERIFIKASI',
      MENUNGGU_VERIFIKASI: 'MENUNGGU VERIFIKASI',
      BELUM_BAYAR: 'BELUM BAYAR',
      TERJAWAB: 'TERJAWAB',
      MENUNGGU: 'MENUNGGU',
      SEBAGIAN: 'SEBAGIAN',
      TERLAMBAT: 'TERLAMBAT',
      DITOLAK: 'DITOLAK',
      LUNAS: 'LUNAS'
    };
    return labels[key] || key.replace(/_/g, ' ') || '-';
  }

  badgeClass(status: string): string {
    const key = (status || '').toUpperCase();
    if ([
      'LUNAS', 'AKTIF', 'DIKONFIRMASI', 'DIVERIFIKASI',
      'DISETUJUI', 'TERJAWAB', 'SELESAI'
    ].includes(key)) return 'badge-success';

    if (['TERLAMBAT', 'DITOLAK'].includes(key)) return 'badge-danger';

    if ([
      'SEBAGIAN', 'MENUNGGU', 'MENUNGGU_VERIFIKASI',
      'BELUM_BAYAR', 'BARU', 'DIPROSES'
    ].includes(key)) return 'badge-warning';

    return 'badge-info';
  }

  trackByPaymentId(_index: number, payment: Payment): number {
    return payment.id;
  }

  trackByComplaintId(_index: number, complaint: Complaint): number {
    return complaint.id;
  }

  logout(): void {
    if (confirm('Apakah kamu yakin ingin keluar?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }
}

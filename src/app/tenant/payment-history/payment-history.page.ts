import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular';
import { ApiService } from '../../services/api';

interface PaymentItem {
  id: number;
  kode: string;
  kodeTagihan: string;
  periode: string;
  tanggal: string;
  metode: string;
  nominal: number;
  status: string;
  statusText: string;
  buktiUrl: string;
  catatan: string;
  rawDate: string;
  kos: string;
}

@Component({
  selector: 'app-payment-history',
  templateUrl: './payment-history.page.html',
  styleUrls: ['./payment-history.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar]
})
export class PaymentHistoryPage implements OnInit {
  constructor(
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  filterPeriode = 'semua';
  scope: 'current' | 'history' = 'current';
  selectedPayment: PaymentItem | null = null;
  pembayaran: PaymentItem[] = [];
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadPembayaran();
  }

  loadPembayaran(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getPembayaran(this.scope).subscribe({
      next: (response: any) => {
        const rows: any[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.data) ? response.data : [];
        this.pembayaran = rows.map((item: any) => {
          const tagihan = item.tagihan;
          return {
            id: Number(item.id_pembayaran),
            kode: `PAY-${String(item.id_pembayaran).padStart(6, '0')}`,
            kodeTagihan: tagihan?.kode_tagihan || `INV-${item.tTagihan_id_tagihan}`,
            periode: String(tagihan?.periode || '-'),
            tanggal: this.formatTanggal(item.tgl_pembayaran),
            metode: this.labelMetode(item.metode_pembayaran),
            nominal: Number(item.total || 0),
            status: String(item.status || 'menunggu_verifikasi'),
            statusText: this.statusLabel(item.status),
            buktiUrl: this.storageFileUrl(item.bukti_pembayaran),
            catatan: item.catatan || '',
            rawDate: item.tgl_pembayaran || '',
            kos: tagihan?.kontrak?.kamar?.kos?.nama_kos || '-'
          } as PaymentItem;
        }).sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal memuat riwayat pembayaran:', error);
        this.errorMessage = error?.error?.message || 'Riwayat pembayaran gagal dimuat. Periksa koneksi dan login tenant.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  changeScope(scope: 'current' | 'history'): void {
    if (this.scope === scope) return;
    this.scope = scope;
    this.filterPeriode = 'semua';
    this.selectedPayment = null;
    this.loadPembayaran();
  }

  get pembayaranTerfilter(): PaymentItem[] {
    return this.pembayaran.filter(item =>
      this.filterPeriode === 'semua' || item.periode === this.filterPeriode
    );
  }

  get totalPembayaran(): number {
    return this.pembayaran
      .filter(item => item.status === 'diverifikasi')
      .reduce((total, item) => total + item.nominal, 0);
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  statusLabel(status: string): string {
    if (status === 'diverifikasi') return 'Terverifikasi';
    if (status === 'ditolak') return 'Ditolak';
    return 'Menunggu Verifikasi';
  }

  private labelMetode(value: string): string {
    if (value === 'transfer') return 'Transfer Bank';
    if (value === 'langsung') return 'Pembayaran langsung';
    return value || '-';
  }

  private formatTanggal(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).format(date);
  }

  private storageFileUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.replace(/^\/+/, '').replace(/^storage\//, '');
    return `http://127.0.0.1:8000/storage/${cleanPath}`;
  }

  lihatBukti(kode: string): void {
    this.selectedPayment = this.pembayaran.find(item => item.kode === kode) || null;
  }

  bukaBukti(url: string): void {
    if (url) window.open(url, '_blank', 'noopener');
  }

  tutupDetail(): void {
    this.selectedPayment = null;
  }

  cetakDetail(): void {
    window.print();
  }

  kembali(): void {
    this.router.navigateByUrl('/tenant/billing');
  }
}

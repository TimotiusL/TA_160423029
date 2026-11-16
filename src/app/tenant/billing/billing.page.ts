import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular';
import { ApiService } from '../../services/api';

interface BillItem {
  id: number;
  kode: string;
  periode: string;
  jatuhTempo: string;
  tanggalTerbit: string;
  nominal: number;
  denda: number;
  terbayar: number;
  sisa: number;
  status: 'lunas' | 'belum_lunas' | string;
  kos: string;
  kamar: string;
  rawDate: string;
  contractStatus: string;
}

@Component({
  selector: 'app-tenant-billing',
  templateUrl: './billing.page.html',
  styleUrls: ['./billing.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar]
})
export class BillingPage implements OnInit {
  constructor(
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  filterStatus = 'semua';
  filterPeriode = 'semua';
  scope: 'current' | 'history' = 'current';
  tagihan: BillItem[] = [];
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadTagihan();
  }

  loadTagihan(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.getTagihan(this.scope).subscribe({
      next: (response: any) => {
        const rows: any[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.data) ? response.data : [];

        this.tagihan = rows.map((item: any) => {
          const kamar = item.kontrak?.kamar;
          const jenis = kamar?.jenis_kamar || kamar?.jenisKamar;
          const kos = kamar?.kos;
          return {
            id: Number(item.id_tagihan),
            kode: item.kode_tagihan || `INV-${item.id_tagihan}`,
            periode: String(item.periode || '-'),
            jatuhTempo: this.formatTanggal(item.tgl_jatuhTempo),
            tanggalTerbit: this.formatTanggal(item.tgl_terbit),
            nominal: Number(item.total_tagihan_berjalan ?? item.total_tagihan ?? 0),
            denda: Number(item.denda_berjalan || 0),
            terbayar: (Array.isArray(item.pembayaran) ? item.pembayaran : [])
              .filter((p: any) => p.status === 'diverifikasi')
              .reduce((sum: number, p: any) => sum + Number(p.total || 0), 0),
            sisa: Math.max(0, Number(item.total_tagihan_berjalan ?? item.total_tagihan ?? 0) - (Array.isArray(item.pembayaran) ? item.pembayaran : [])
              .filter((p: any) => p.status === 'diverifikasi')
              .reduce((sum: number, p: any) => sum + Number(p.total || 0), 0)),
            status: item.status || 'belum_lunas',
            kos: kos?.nama_kos || '-',
            kamar: [jenis?.nama_jenis, kamar?.no_kamar ? `No. ${kamar.no_kamar}` : '']
              .filter(Boolean).join(' · ') || '-',
            rawDate: item.tgl_terbit || '',
            contractStatus: String(item.kontrak?.status || ''),
          } as BillItem;
        }).sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal memuat tagihan tenant:', error);
        this.errorMessage = error?.error?.message || 'Tagihan gagal dimuat. Periksa koneksi dan login kembali.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  changeScope(scope: 'current' | 'history'): void {
    if (this.scope === scope) return;
    this.scope = scope;
    this.filterStatus = 'semua';
    this.filterPeriode = 'semua';
    this.loadTagihan();
  }

  get tagihanTerfilter(): BillItem[] {
    return this.tagihan.filter(item => {
      const cocokStatus = this.filterStatus === 'semua' || item.status === this.filterStatus;
      const cocokPeriode = this.filterPeriode === 'semua' || item.periode === this.filterPeriode;
      return cocokStatus && cocokPeriode;
    });
  }

  get tagihanBerjalan(): BillItem | null {
    if (this.scope !== 'current') return null;
    return this.tagihan.find(item => item.status === 'belum_lunas') || null;
  }

  get totalBelumLunas(): number {
    return this.tagihan
      .filter(item => item.status === 'belum_lunas')
      .reduce((total, item) => total + item.sisa, 0);
  }

  get totalLunas(): number {
    return this.tagihan
      .reduce((total, item) => total + item.terbayar, 0);
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  private formatTanggal(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).format(date);
  }

  lihatTagihan(kode: string): void {
    this.router.navigate(['/tenant/bill-detail'], { queryParams: { kode } });
  }

  bayarTagihan(kode: string): void {
    this.router.navigate(['/tenant/bill-detail'], { queryParams: { kode, action: 'pay' } });
  }

  bantuanPembayaran(): void {
    this.router.navigateByUrl('/tenant/complaints');
  }
}

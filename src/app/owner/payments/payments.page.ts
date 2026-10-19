import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { ActivatedRoute } from '@angular/router';

addIcons({ searchOutline });

interface Payment {
  id: string;
  billId: string;
  billNumber: string;
  tenantName: string;
  propertyName: string;
  amount: number;
  date: string;
  method: string;
  proofUrl: string;
  status: 'MENUNGGU' | 'DIVERIFIKASI' | 'DITOLAK';
  verifiedAt?: string;
  notes?: string;
}

@Component({
  selector: 'app-payments',
  templateUrl: './payments.page.html',
  styleUrls: ['./payments.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonModal]
})
export class PaymentsPage implements OnInit {
  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef, private route: ActivatedRoute) { }

  search = '';
  tab = 'all';
  tagihanId = '';
  payments: Payment[] = [];
  selectedPayment: Payment | null = null;
  showProof = false;
  loading = false;
  processing = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.tagihanId = params['tagihan_id'] ?? '';
      this.loadPayments();
    });
  }

  loadPayments(): void {
    this.loading = true;

    this.apiService.getPembayaran().subscribe({
      next: (response: any[]) => {
        this.payments = response.map((item: any) => {
          const tagihan = item.tagihan;
          const kontrak = tagihan?.kontrak;
          const penghuni = kontrak?.penghuni;
          const kamar = kontrak?.kamar;

          const path = item.bukti_pembayaran ?? '';
          const baseUrl = 'http://127.0.0.1:8000';

          return {
            id: String(item.id_pembayaran),
            billId: String(tagihan?.id_tagihan ?? ''),
            billNumber: tagihan?.kode_tagihan ?? '-',
            tenantName: penghuni?.user?.nama ?? 'Penghuni',
            propertyName: kamar?.kos?.nama_kos ?? '-',
            amount: Number(item.total),
            date: item.tgl_pembayaran,
            method: item.metode_pembayaran ?? '-',
            proofUrl: path.startsWith('http')
              ? path
              : `${baseUrl}/storage/${path}`,
            status: this.mapStatus(item.status),
            verifiedAt: undefined,
            notes: item.catatan ?? ''
          };
        });
        if (this.tagihanId) {
          this.payments = this.payments.filter(
            payment => payment.billId === this.tagihanId
          );
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Gagal mengambil pembayaran:', error);
        this.loading = false;
        alert('Gagal mengambil data pembayaran dari server.');
        this.cdr.detectChanges();
      }
    });
  }

  private mapStatus(
    status: string
  ): Payment['status'] {
    if (status === 'diverifikasi') return 'DIVERIFIKASI';
    if (status === 'ditolak') return 'DITOLAK';
    return 'MENUNGGU';
  }

  get filteredPayments(): Payment[] {
    return this.payments.filter(payment => {
      const keyword = this.search.toLowerCase().trim();

      const cocokNama = payment.tenantName
        .toLowerCase()
        .includes(keyword);

      const cocokTagihan = payment.billNumber
        .toLowerCase()
        .includes(keyword);

      return (
        (!keyword || cocokNama || cocokTagihan) &&
        (this.tab === 'all' || payment.status === this.tab)
      );
    });
  }

  get countAll(): number {
    return this.payments.length;
  }

  get countWaiting(): number {
    return this.payments.filter(
      p => p.status === 'MENUNGGU'
    ).length;
  }

  get countVerified(): number {
    return this.payments.filter(
      p => p.status === 'DIVERIFIKASI'
    ).length;
  }

  get countRejected(): number {
    return this.payments.filter(
      p => p.status === 'DITOLAK'
    ).length;
  }

  get totalConfirmed(): number {
    return this.payments
      .filter(p => p.status === 'DIVERIFIKASI')
      .reduce((total, p) => total + p.amount, 0);
  }

  get waitingPayments(): Payment[] {
    return this.payments.filter(
      p => p.status === 'MENUNGGU'
    );
  }

  setTab(tab: string): void {
    this.tab = tab;
  }

  openProof(payment: Payment): void {
    this.selectedPayment = payment;
    this.showProof = true;
  }

  closeProof(): void {
    this.showProof = false;
    this.selectedPayment = null;
  }

  openDetail(payment: Payment): void {
    this.selectedPayment = payment;
  }

  verify(payment: Payment): void {
    this.processPayment(payment, 'diverifikasi', '');
  }

  reject(payment: Payment): void {
    const catatan = prompt(
      'Masukkan alasan penolakan pembayaran:'
    );

    if (catatan === null) return;

    if (!catatan.trim()) {
      alert('Alasan penolakan harus diisi.');
      return;
    }

    this.processPayment(payment, 'ditolak', catatan.trim());
  }

  private processPayment(
    payment: Payment,
    status: 'diverifikasi' | 'ditolak',
    catatan: string
  ): void {
    if (this.processing) return;

    const konfirmasi = status === 'diverifikasi'
      ? 'Verifikasi pembayaran ini?'
      : 'Tolak pembayaran ini?';

    if (!confirm(konfirmasi)) return;

    this.processing = true;

    this.apiService.verifikasiPembayaran(
      Number(payment.id),
      status,
      catatan
    ).subscribe({
      next: response => {
        this.processing = false;
        alert(response.message || 'Pembayaran berhasil diproses.');
        this.showProof = false;
        this.selectedPayment = null;
        this.loadPayments();
        this.cdr.detectChanges();
      },
      error: error => {
        this.processing = false;
        console.error('Gagal memproses pembayaran:', error);
        alert(
          error.error?.message ||
          'Pembayaran gagal diproses.'
        );
        this.cdr.detectChanges();
      }
    });
  }

  getTenant(payment: Payment) {
    return { name: payment.tenantName };
  }

  getProperty(payment: Payment) {
    return { name: payment.propertyName };
  }

  getBill(payment: Payment) {
    return { number: payment.billNumber };
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(date: string): string {
    if (!date) return '-';

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  }
}

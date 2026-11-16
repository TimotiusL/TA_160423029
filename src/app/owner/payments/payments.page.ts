import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { ActivatedRoute } from '@angular/router';

addIcons({ searchOutline });

interface PropertyOption {
  id: string;
  name: string;
}

interface Payment {
  id: string;
  billId: string;
  billNumber: string;
  tenantName: string;
  propertyName: string;
  propertyId: string;
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
  @ViewChild('paymentDetailModal') private paymentDetailModal?: IonModal;
  @ViewChild('paymentVerifyConfirmModal') private paymentVerifyConfirmModal?: IonModal;
  @ViewChild('paymentVerifySuccessModal') private paymentVerifySuccessModal?: IonModal;

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef, private route: ActivatedRoute) { }

  search = '';
  selectedPropertyId = 'all';
  properties: PropertyOption[] = [];
  tab = 'all';
  tagihanId = '';
  payments: Payment[] = [];
  selectedPayment: Payment | null = null;
  showProof = false;
  loading = false;
  processing = false;
  processingPaymentId: string | null = null;
  verificationPayment: Payment | null = null;
  verificationError = '';
  verificationSuccessMessage = 'Pembayaran berhasil diverifikasi.';

  ngOnInit(): void {
    this.loadProperties();
    this.route.queryParams.subscribe(params => {
      this.tagihanId = params['tagihan_id'] ?? '';
      this.loadPayments();
    });
  }

  loadProperties(): void {
    this.apiService.getKos().subscribe({
      next: (data: any[]) => {
        this.properties = (Array.isArray(data) ? data : []).map(item => ({
          id: String(item.id_kos),
          name: item.nama_kos
        }));
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Gagal mengambil daftar kos:', error);
      }
    });
  }

  loadPayments(): void {
    this.loading = true;

    this.apiService.getPembayaran().subscribe({
      next: (response: any) => {
        const items: any[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        this.payments = items.map((item: any) => {
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
            propertyId: String(kamar?.kos?.id_kos ?? ''),
            amount: Number(item.total),
            date: item.tgl_pembayaran,
            method: item.metode_pembayaran ?? '-',
            proofUrl: !path
              ? ''
              : path.startsWith('http')
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
      if (this.selectedPropertyId !== 'all' && payment.propertyId !== this.selectedPropertyId) {
        return false;
      }
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
    this.cdr.detectChanges();
  }

  async closeProof(): Promise<void> {
    const dismissed = await this.paymentDetailModal?.dismiss(null, 'close');
    if (!dismissed) this.onPaymentDetailDidDismiss();
  }

  onPaymentDetailDidDismiss(): void {
    this.showProof = false;
    this.selectedPayment = null;
    this.cdr.detectChanges();
  }

  openDetail(payment: Payment): void {
    this.selectedPayment = payment;
  }

  async verify(payment: Payment): Promise<void> {
    if (this.processing) return;

    this.verificationPayment = payment;
    this.verificationError = '';
    this.cdr.detectChanges();
    await this.paymentVerifyConfirmModal?.present();
  }

  async cancelVerification(): Promise<void> {
    const dismissed = await this.paymentVerifyConfirmModal?.dismiss(null, 'cancel');
    if (!dismissed) this.onVerificationConfirmDidDismiss();
  }

  onVerificationConfirmDidDismiss(): void {
    this.verificationPayment = null;
    this.verificationError = '';
    this.cdr.detectChanges();
  }

  async confirmVerification(): Promise<void> {
    const payment = this.verificationPayment;
    if (!payment || this.processing) return;

    this.processing = true;
    this.processingPaymentId = payment.id;
    this.verificationError = '';
    this.cdr.detectChanges();

    this.apiService.verifikasiPembayaran(
      Number(payment.id),
      'diverifikasi',
      ''
    ).subscribe({
      next: async response => {
        const updatedPayment: Payment = {
          ...payment,
          status: this.mapStatus(response?.data?.status || 'diverifikasi'),
          verifiedAt: new Date().toISOString()
        };

        this.payments = this.payments.map(item =>
          item.id === payment.id ? updatedPayment : item
        );
        this.processing = false;
        this.processingPaymentId = null;
        this.verificationSuccessMessage = response?.message || 'Pembayaran berhasil diverifikasi.';
        this.cdr.detectChanges();

        // Tutup modal konfirmasi terlebih dahulu, lalu detail pembayaran.
        await this.paymentVerifyConfirmModal?.dismiss({ verified: true }, 'verified');
        this.verificationPayment = null;
        await this.closeProof();

        this.cdr.detectChanges();
        await this.paymentVerifySuccessModal?.present();
      },
      error: error => {
        console.error('Gagal memverifikasi pembayaran:', error);
        this.processing = false;
        this.processingPaymentId = null;
        this.verificationError = error?.error?.message || 'Pembayaran gagal diverifikasi. Silakan coba lagi.';
        this.cdr.detectChanges();
      }
    });
  }

  async closeVerificationSuccess(): Promise<void> {
    await this.paymentVerifySuccessModal?.dismiss(null, 'close');
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
    this.processingPaymentId = payment.id;
    this.cdr.detectChanges();

    this.apiService.verifikasiPembayaran(
      Number(payment.id),
      status,
      catatan
    ).subscribe({
      next: response => {
        // API sudah mengonfirmasi perubahan di database. Perbarui state
        // lokal langsung agar UI tidak perlu menunggu refresh halaman.
        const newStatus = this.mapStatus(response?.data?.status || status);
        const updatedPayment: Payment = {
          ...payment,
          status: newStatus,
          notes: catatan,
          verifiedAt: new Date().toISOString()
        };

        this.payments = this.payments.map(item =>
          item.id === payment.id ? updatedPayment : item
        );

        this.processing = false;
        this.processingPaymentId = null;
        this.showProof = false;
        this.selectedPayment = null;
        this.cdr.detectChanges();

        alert(response?.message || 'Status pembayaran berhasil diperbarui.');
      },
      error: error => {
        this.processing = false;
        this.processingPaymentId = null;
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

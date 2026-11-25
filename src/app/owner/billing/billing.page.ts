import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { Router } from '@angular/router';

addIcons({
  searchOutline
});

interface BillDetail {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Bill {
  id: string;
  number: string;
  contractId: string;
  tenantId: string;
  propertyId: string;
  roomId: string;
  roomNumber: string;
  period: string;
  dueDate: string;
  details: BillDetail[];
  total: number;
  penalty: number;
  totalDue: number;
  paidAmount: number;
  status: 'BELUM_BAYAR' | 'SEBAGIAN' | 'LUNAS' | 'TERLAMBAT';
}

interface Tenant {
  id: string;
  name: string;
}

interface Property {
  id: string;
  name: string;
}

interface InstallmentRequest {
  id_persetujuanCicilan: number;
  jumlah_cicilan: number;
  alasan: string;
  status: string;
  tgl_pengajuan: string;
  tagihan?: any;
}

@Component({
  selector: 'app-billing',
  templateUrl: './billing.page.html',
  styleUrls: ['./billing.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonModal
  ]
})
export class BillingPage implements OnInit {

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadProperties();
    this.loadBills();
    this.loadCicilanRequests();
  }

  search = '';
  selectedPropertyId = 'all';
  tab = 'all';

  selectedBill: Bill | null = null;
  @ViewChild('detailModal') detailModal?: IonModal;
  private pendingPaymentNavigationId: string | null = null;

  tenants: Tenant[] = [];
  properties: Property[] = [];
  bills: Bill[] = [];
  cicilanRequests: InstallmentRequest[] = [];
  processingCicilanId: number | null = null;

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

  loadBills(): void {
    this.apiService.getTagihan().subscribe({
      next: (response: any[]) => {
        this.bills = response.map((item: any) => {
          const kontrak = item.kontrak;
          const penghuni = kontrak?.penghuni;
          const kamar = kontrak?.kamar;

          const paidAmount = (item.pembayaran ?? [])
            .filter((p: any) => p.status === 'diverifikasi')
            .reduce(
              (total: number, p: any) => total + Number(p.total),
              0
            );

          const total = Number(item.total_tagihan);
          const penalty = Number(item.denda_berjalan || 0);
          const totalDue = Number(item.total_tagihan_berjalan ?? (total + penalty));
          const sisa = Math.max(0, totalDue - paidAmount);
          const approvedPlan = (Array.isArray(item.persetujuan_cicilan) ? item.persetujuan_cicilan : [])
            .filter((request: any) => request.status === 'disetujui'
              && Array.isArray(request.cicilan) && request.cicilan.length > 0)
            .sort((a: any, b: any) => new Date(b.tgl_keputusan || 0).getTime() - new Date(a.tgl_keputusan || 0).getTime())[0];
          const terlambat = item.status !== 'lunas' && (
            approvedPlan
              ? approvedPlan.cicilan.some((cicilan: any) => cicilan.status !== 'lunas'
                && new Date(cicilan.tgl_jatuhTempo) < new Date())
              : new Date(item.tgl_jatuhTempo) < new Date()
          );

          let status: Bill['status'];

          if (sisa <= 0 || item.status === 'lunas') {
            status = 'LUNAS';
          } else if (terlambat) {
            status = 'TERLAMBAT';
          } else if (paidAmount > 0) {
            status = 'SEBAGIAN';
          } else {
            status = 'BELUM_BAYAR';
          }

          return {
            id: String(item.id_tagihan),
            number: item.kode_tagihan,
            contractId: String(kontrak?.id_kontrak ?? ''),
            tenantId: String(penghuni?.id_penghuni ?? ''),
            propertyId: String(kamar?.kos?.id_kos ?? ''),
            roomId: String(kamar?.id_kamar ?? ''),
            roomNumber: String(kamar?.no_kamar ?? '-'),
            period: item.periode,
            dueDate: item.tgl_jatuhTempo,
            details: (item.detail ?? []).map((detail: any) => ({
              id: String(detail.id_detailTagihan),
              description: detail.jenis_biaya,
              quantity: Number(detail.qty),
              unitPrice: Number(detail.harga),
            })),
            total,
            penalty,
            totalDue,
            paidAmount,
            status,
          } as Bill;
        });

        this.tenants = response.map((item: any) => ({
          id: String(item.kontrak?.penghuni?.id_penghuni ?? ''),
          name: item.kontrak?.penghuni?.user?.nama ?? 'Penghuni',
        }));

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Gagal mengambil data tagihan:', error);
        alert('Gagal mengambil data tagihan dari server.');
        this.cdr.detectChanges();
      },
    });
  }

  loadCicilanRequests(): void {
    this.apiService.getPersetujuanCicilan().subscribe({
      next: (rows: any[]) => {
        this.cicilanRequests = (Array.isArray(rows) ? rows : []) as InstallmentRequest[];
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Gagal memuat pengajuan cicilan:', error);
      }
    });
  }

  get pengajuanCicilanMenunggu(): InstallmentRequest[] {
    return this.cicilanRequests.filter(item => {
      if (item.status !== 'menunggu_persetujuan') return false;
      if (this.selectedPropertyId === 'all') return true;
      return String(item.tagihan?.kontrak?.kamar?.kos?.id_kos || '') === this.selectedPropertyId;
    });
  }

  putuskanCicilan(item: InstallmentRequest, status: 'disetujui' | 'ditolak'): void {
    if (this.processingCicilanId !== null) return;

    let catatan = '';
    if (status === 'ditolak') {
      const alasan = window.prompt('Masukkan alasan penolakan cicilan:', '');
      if (alasan === null) return;
      catatan = alasan.trim();
    } else if (!window.confirm('Setujui pengajuan dan buat jadwal cicilan sesuai permintaan penghuni?')) {
      return;
    }

    this.processingCicilanId = item.id_persetujuanCicilan;
    this.apiService.putuskanCicilan(item.id_persetujuanCicilan, status, catatan).subscribe({
      next: (response: any) => {
        this.processingCicilanId = null;
        alert(response?.message || 'Keputusan cicilan berhasil disimpan.');
        this.loadCicilanRequests();
        this.loadBills();
      },
      error: error => {
        this.processingCicilanId = null;
        this.cdr.detectChanges();
        alert(error?.error?.message || 'Gagal memproses pengajuan cicilan.');
      }
    });
  }

  cicilanNominalRupiah(item: InstallmentRequest): string {
    return this.formatRupiah(Number(item.tagihan?.total_tagihan || 0));
  }



  get filteredBills(): Bill[] {

    return this.bills.filter(bill => {

      if (this.selectedPropertyId !== 'all' && bill.propertyId !== this.selectedPropertyId) {
        return false;
      }

      const tenant = this.getTenant(bill);

      if (this.search) {

        const keyword = this.search
          .toLowerCase()
          .trim();

        const numberMatch =
          bill.number
            .toLowerCase()
            .includes(keyword);

        const tenantMatch =
          tenant?.name
            .toLowerCase()
            .includes(keyword);

        if (!numberMatch && !tenantMatch) {
          return false;
        }
      }

      if (
        this.tab !== 'all' &&
        bill.status !== this.tab
      ) {
        return false;
      }

      return true;
    });
  }



  get totalUnpaid(): number {

    return this.bills
      .filter(bill => bill.status !== 'LUNAS')
      .reduce(
        (sum, bill) =>
          sum + (bill.totalDue - bill.paidAmount),
        0
      );
  }

  get countAll(): number {
    return this.bills.length;
  }

  get countBelumBayar(): number {
    return this.bills.filter(
      bill => bill.status === 'BELUM_BAYAR'
    ).length;
  }

  get countSebagian(): number {
    return this.bills.filter(
      bill => bill.status === 'SEBAGIAN'
    ).length;
  }

  get countLunas(): number {
    return this.bills.filter(
      bill => bill.status === 'LUNAS'
    ).length;
  }

  get countTerlambat(): number {
    return this.bills.filter(
      bill => bill.status === 'TERLAMBAT'
    ).length;
  }


  setTab(tab: string) {
    this.tab = tab;
  }

  openDetail(bill: Bill) {
    this.selectedBill = bill;
  }

  closeDetail(): void {
    if (this.detailModal?.isOpen) {
      void this.detailModal.dismiss(undefined, 'close');
      return;
    }

    this.selectedBill = null;
  }

  handleDetailDidDismiss(): void {
    const tagihanId = this.pendingPaymentNavigationId;
    this.pendingPaymentNavigationId = null;
    this.selectedBill = null;
    this.cdr.detectChanges();

    if (tagihanId) {
      void this.router.navigate(['/owner/payments'], {
        queryParams: { tagihan_id: tagihanId }
      });
    }
  }


  getTenant(bill: Bill): Tenant | undefined {
    return this.tenants.find(
      tenant => tenant.id === bill.tenantId
    );
  }

  getProperty(bill: Bill): Property | undefined {
    return this.properties.find(
      property => property.id === bill.propertyId
    );
  }

  getRoomNumber(bill: Bill): string {
    return bill.roomNumber || '-';
  }



  formatRupiah(
    value: number
  ): string {

    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }
    ).format(value);
  }

  formatDate(
    date: string
  ): string {

    return new Intl.DateTimeFormat(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    ).format(new Date(date));
  }

  formatMonthYear(period: string): string {
    if (!period) return '-';

    const parts = period.includes('/')
      ? period.split('/')
      : period.split('-').reverse();

    const month = Number(parts[0]);
    const year = Number(parts[1]);

    if (!month || !year) return period;

    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1));
  }


  getPaymentProgress(
    bill: Bill
  ): number {

    if (!bill.totalDue) {
      return 0;
    }

    return Math.round(
      (bill.paidAmount / bill.totalDue) * 100
    );
  }


  async viewPayments(): Promise<void> {
    const tagihanId = this.selectedBill?.id;
    if (!tagihanId) return;

    this.pendingPaymentNavigationId = tagihanId;

    if (this.detailModal?.isOpen) {
      const dismissed = await this.detailModal.dismiss(undefined, 'view-payments');
      if (!dismissed) {
        this.pendingPaymentNavigationId = null;
      }
      return;
    }

    this.handleDetailDidDismiss();
  }

}
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
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

interface ContractOption {
  id: number;
  number: string;
  tenantName: string;
  propertyName: string;
  roomNumber: string;
}

@Component({
  selector: 'app-billing',
  templateUrl: './billing.page.html',
  styleUrls: ['./billing.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon
  ]
})
export class BillingPage implements OnInit {

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadBills();
  }

  search = '';
  tab = 'all';

  selectedBill: Bill | null = null;

  showGenerate = false;

  loadContracts(): void {
    this.loadingContracts = true;

    this.apiService.getKontrak().subscribe({
      next: (response: any[]) => {
        const existingContractIds = new Set(
          this.bills.map(bill => bill.contractId)
        );

        this.contracts = response
          .filter(kontrak =>
            !existingContractIds.has(String(kontrak.id_kontrak)) &&
            kontrak.status === 'menunggu_pembayaran'
          )
          .map(kontrak => ({
            id: Number(kontrak.id_kontrak),
            number: kontrak.no_kontrak,
            tenantName: kontrak.penghuni?.user?.nama ?? 'Penghuni',
            propertyName: kontrak.kamar?.kos?.nama_kos ?? 'Properti',
            roomNumber: String(kontrak.kamar?.no_kamar ?? '-')
          }));

        this.loadingContracts = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Gagal mengambil kontrak:', error);
        this.loadingContracts = false;
        alert('Gagal mengambil daftar kontrak.');
        this.cdr.detectChanges();
      }
    });
  }

  generateContractId = '';
  contracts: ContractOption[] = [];
  loadingContracts = false;
  generating = false;

  tenants: Tenant[] = [];
  properties: Property[] = [];
  bills: Bill[] = [];


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
          const sisa = Math.max(0, total - paidAmount);
          const terlambat =
            item.status !== 'lunas' &&
            new Date(item.tgl_jatuhTempo) < new Date();

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
            paidAmount,
            status,
          } as Bill;
        });

        this.tenants = response.map((item: any) => ({
          id: String(item.kontrak?.penghuni?.id_penghuni ?? ''),
          name: item.kontrak?.penghuni?.user?.nama ?? 'Penghuni',
        }));

        this.properties = response.map((item: any) => ({
          id: String(item.kontrak?.kamar?.kos?.id_kos ?? ''),
          name: item.kontrak?.kamar?.kos?.nama_kos ?? 'Properti',
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



  /* =========================
     FILTERED DATA
  ========================= */

  get filteredBills(): Bill[] {

    return this.bills.filter(bill => {

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


  /* =========================
     COUNTS
  ========================= */

  get totalUnpaid(): number {

    return this.bills
      .filter(bill => bill.status !== 'LUNAS')
      .reduce(
        (sum, bill) =>
          sum + (bill.total - bill.paidAmount),
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


  /* =========================
     TAB
  ========================= */

  setTab(tab: string) {
    this.tab = tab;
  }


  /* =========================
     DETAIL
  ========================= */

  openDetail(bill: Bill) {
    this.selectedBill = bill;
  }

  closeDetail() {
    this.selectedBill = null;
  }


  /* =========================
     DATA HELPERS
  ========================= */

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


  /* =========================
     FORMAT
  ========================= */

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



  /* =========================
     PAYMENT PROGRESS
  ========================= */

  getPaymentProgress(
    bill: Bill
  ): number {

    if (!bill.total) {
      return 0;
    }

    return Math.round(
      (bill.paidAmount / bill.total) * 100
    );
  }


  /* =========================
     GENERATE
  ========================= */

  openGenerate(): void {
    this.generateContractId = '';
    this.showGenerate = true;
    this.loadContracts();
  }

  closeGenerate() {
    this.showGenerate = false;
  }

  generateBills(): void {
    if (!this.generateContractId) {
      alert('Pilih kontrak terlebih dahulu.');
      return;
    }

    const contractId = Number(this.generateContractId);

    this.generating = true;

    this.apiService.generateTagihan(contractId).subscribe({
      next: response => {
        this.generating = false;
        this.showGenerate = false;
        alert(response.message || 'Tagihan berhasil dibuat.');
        this.loadBills();
      },
      error: error => {
        this.generating = false;
        console.error('Gagal membuat tagihan:', error);

        const message = error.error?.message ||
          'Tagihan gagal dibuat. Silakan coba lagi.';

        alert(message);
        this.loadBills();
        this.cdr.detectChanges();
      }
    });
  }


  /* =========================
     OTHER ACTIONS
  ========================= */

  sendReminder(): void {
    if (!this.selectedBill) return;

    const bill = this.selectedBill;
    const tenant = this.getTenant(bill)?.name ?? 'Penghuni';
    const room = this.getRoomNumber(bill);
    const remaining = bill.total - bill.paidAmount;

    const message =
      `Halo ${tenant}, pengingat pembayaran tagihan ` +
      `${bill.number} untuk Kamar ${room}. ` +
      `Sisa tagihan: ${this.formatRupiah(remaining)}. ` +
      `Mohon segera melakukan pembayaran.`;

    if (confirm(
      `Buat pengingat untuk ${tenant}?\n\n${message}`
    )) {
      navigator.clipboard.writeText(message)
        .then(() => alert('Pesan pengingat berhasil disalin.'))
        .catch(() => alert('Gagal menyalin pesan pengingat.'));
    }
  }

  viewPayments(): void {
    const tagihanId = this.selectedBill?.id;

    this.closeDetail();

    this.router.navigate(['/owner/payments'], {
      queryParams: tagihanId
        ? { tagihan_id: tagihanId }
        : {}
    });
  }

}
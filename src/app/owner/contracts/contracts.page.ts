import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';

addIcons({
  searchOutline
});

interface Contract {
  id: string;
  number: string;
  tenantId: string;
  roomId: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  rentalPrice: number;
  deposit: number;
  duration: number;
  status: 'MENUNGGU_PEMBAYARAN' | 'AKTIF' | 'SELESAI' | 'DIBATALKAN';
  reservationId: string;

  tenant?: Tenant;
  property?: Property;
  room?: Room;
  roomType?: RoomType;
}

interface Tenant {
  id: string;
  name: string;
}

interface Property {
  id: string;
  name: string;
}

interface Room {
  id: string;
  number: string;
  roomTypeId: string;
}

interface RoomType {
  id: string;
  name: string;
}

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.page.html',
  styleUrls: ['./contracts.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon
  ]
})
export class ContractsPage {

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {
    this.loadContracts();
  }

  search = '';
  tab = 'all';

  selectedContract: Contract | null = null;

  timeline = [
    'Pendaftaran',
    'Kontrak Dibuat',
    'Pembayaran',
    'Verifikasi',
    'Kontrak Aktif',
    'Kontrak Selesai'
  ];

  contracts: Contract[] = [];

  loadContracts(): void {
    this.api.getKontrak().subscribe({
      next: (data: any[]) => {
        this.contracts = data.map(item => ({
          id: String(item.id_kontrak),
          number: item.no_kontrak,

          tenantId: String(item.tPenghuni_id_penghuni),
          roomId: String(item.tKamar_id_kamar),
          propertyId: String(item.kamar?.tKos_id_kos),

          startDate: item.tgl_mulai,
          endDate: item.tgl_selesai,

          rentalPrice: Number(item.harga_sewa || 0),
          deposit: Number(item.deposit || 0),

          duration: Number(
            item.pendaftaran?.durasi_sewa || 1
          ),

          status: item.status.toUpperCase() as
            | 'MENUNGGU_PEMBAYARAN'
            | 'AKTIF'
            | 'SELESAI'
            | 'DIBATALKAN',

          reservationId: String(
            item.tPendaftaran_id_pendaftaran
          ),

          tenant: item.penghuni?.user ? {
            id: String(item.penghuni.id_penghuni),
            name: item.penghuni.user.nama
          } : undefined,

          property: item.kamar?.kos ? {
            id: String(item.kamar.kos.id_kos),
            name: item.kamar.kos.nama_kos
          } : undefined,

          room: item.kamar ? {
            id: String(item.kamar.id_kamar),
            number: String(item.kamar.no_kamar),
            roomTypeId: String(
              item.kamar.tJenisKamar_id_jenisKamar
            )
          } : undefined,

          roomType: item.kamar?.jenis_kamar ? {
            id: String(
              item.kamar.jenis_kamar.id_jenisKamar
            ),
            name: item.kamar.jenis_kamar.nama_jenis
          } : undefined
        }));
        this.cdr.detectChanges();
        console.log('Data kontrak:', this.contracts);
      },

      error: (error) => {
        console.error(
          'Gagal mengambil data kontrak:',
          error
        );
      }
    });
  }

  get filteredContracts(): Contract[] {
    return this.contracts.filter(contract => {

      if (this.tab !== 'all' && contract.status !== this.tab) {
        return false;
      }

      const tenant = this.getTenant(contract);

      const keyword = this.search.trim().toLowerCase();

      if (keyword) {
        const numberMatch =
          contract.number.toLowerCase().includes(keyword);

        const tenantMatch =
          tenant?.name.toLowerCase().includes(keyword);

        if (!numberMatch && !tenantMatch) {
          return false;
        }
      }

      return true;
    });
  }

  get activeCount(): number {
    return this.contracts.filter(
      contract => contract.status === 'AKTIF'
    ).length;
  }

  get completedCount(): number {
    return this.contracts.filter(
      contract => contract.status === 'SELESAI'
    ).length;
  }

  get cancelledCount(): number {
    return this.contracts.filter(
      contract => contract.status === 'DIBATALKAN'
    ).length;
  }

  setTab(tab: string) {
    this.tab = tab;
  }

  openDetail(contract: Contract) {
    this.selectedContract = contract;
  }

  closeDetail() {
    this.selectedContract = null;
  }

  getTenant(contract: Contract): Tenant | undefined {
    return contract.tenant;
  }

  getProperty(contract: Contract): Property | undefined {
    return contract.property;
  }

  getRoom(contract: Contract): Room | undefined {
    return contract.room;
  }

  getRoomType(contract: Contract): RoomType | undefined {
    return contract.roomType;
  }

  getStatusIndex(status: Contract['status']): number {
    if (status === 'MENUNGGU_PEMBAYARAN') {
      return 2;
    }

    if (status === 'AKTIF') {
      return 4;
    }

    if (status === 'SELESAI') {
      return 5;
    }

    return 0;
  }

  getStatusLabel(status: Contract['status']): string {
    if (status === 'MENUNGGU_PEMBAYARAN') {
      return 'Menunggu Pembayaran';
    }

    if (status === 'AKTIF') {
      return 'Aktif';
    }

    if (status === 'SELESAI') {
      return 'Selesai';
    }

    return 'Dibatalkan';
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  downloadContract() {
    if (!this.selectedContract) {
      return;
    }

    const contractId = this.selectedContract.id;
    const contractNumber = this.selectedContract.number;

    this.api.downloadKontrak(contractId).subscribe({
      next: (blob: Blob) => {
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${contractNumber}.pdf`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);
      },

      error: (error: any) => {
        console.error('Gagal download kontrak:', error);
      }
    });
  }

  endContract() {
    if (!this.selectedContract) {
      return;
    }

    this.selectedContract = null;
  }

  get waitingPaymentCount(): number {
    return this.contracts.filter(
      contract => contract.status === 'MENUNGGU_PEMBAYARAN'
    ).length;
  }
}
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

addIcons({
  searchOutline
});

interface Tenant {
  id: string;
  name: string;
  nik: string;
  email: string;
  phone: string;
  gender: 'L' | 'P';
  birthDate: string;
  address: string;
  hasKtp: boolean;
  currentRoomId?: string;
  currentPropertyId?: string;
  currentContractId?: string;
  activeContractId?: string;
  contractStatus?: 'MENUNGGU_PEMBAYARAN' | 'AKTIF' | 'SELESAI' | 'DIBATALKAN';
  registrationDate: string;
}

interface Room {
  id: string;
  number: string;
  roomTypeId: string;
}

interface Property {
  id: string;
  name: string;
}

interface RoomType {
  id: string;
  name: string;
}

interface Contract {
  id: string;
  number: string;
  tenantId: string;
  roomId: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  status: 'MENUNGGU_PEMBAYARAN' | 'AKTIF' | 'SELESAI' | 'DIBATALKAN';
}

@Component({
  selector: 'app-tenants',
  templateUrl: './tenants.page.html',
  styleUrls: ['./tenants.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonModal
  ]
})
export class TenantsPage implements OnInit {

  search = '';
  selectedPropertyId = 'all';
  activeTab: 'all' | 'aktif' | 'nonaktif' = 'all';

  selectedTenant: Tenant | null = null;

  ktpLoading = false;
  ktpPreviewForId: string | null = null;
  ktpPreviewUrl: string | null = null;
  ktpPreviewSafeUrl: SafeResourceUrl | null = null;
  ktpPreviewMimeType = '';
  ktpErrorMessage = '';
  tenants: Tenant[] = [];
  properties: Property[] = [];
  roomTypes: RoomType[] = [];
  rooms: Room[] = [];
  contracts: Contract[] = [];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.loadProperties();
    this.loadTenants();
  }

  loadProperties(): void {
    this.api.getKos().subscribe({
      next: (data: any[]) => {
        this.properties = (Array.isArray(data) ? data : []).map(item => ({
          id: String(item.id_kos),
          name: item.nama_kos
        }));
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal mengambil daftar kos:', error);
      }
    });
  }

  loadTenants() {
    this.api.getPenghuni().subscribe({
      next: (data: any[]) => {

        this.tenants = data.map(item => {
          const contract = item.kontrak?.[0];

          return {
            id: String(item.id_penghuni),
            name: item.user?.nama ?? '-',
            nik: item.nik ?? '-',
            email: item.user?.email ?? '-',
            phone: item.user?.no_telp ?? '-',

            gender: item.jenis_kelamin === 'pria' ? 'L' : 'P',

            birthDate: item.tgl_lahir ?? '',
            address: '-',
            hasKtp: !!item.foto_ktp,

            currentRoomId: contract
              ? String(contract.kamar?.id_kamar)
              : undefined,

            currentPropertyId: contract
              ? String(contract.kamar?.kos?.id_kos)
              : undefined,

            currentContractId: contract
              ? String(contract.id_kontrak)
              : undefined,

            activeContractId:
              contract?.status === 'aktif'
                ? String(contract.id_kontrak)
                : undefined,

            contractStatus: this.mapContractStatus(contract?.status),

            registrationDate: item.user?.created_at ?? ''
          };
        });

        this.loadContractData(data);
        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('Gagal mengambil data penghuni:', error);
      }
    });
  }

  mapContractStatus(status: string | undefined):
    'MENUNGGU_PEMBAYARAN' | 'AKTIF' | 'SELESAI' | 'DIBATALKAN' {

    switch (status) {
      case 'aktif':
        return 'AKTIF';

      case 'selesai':
        return 'SELESAI';

      case 'dibatalkan':
        return 'DIBATALKAN';

      default:
        return 'MENUNGGU_PEMBAYARAN';
    }
  }

  loadContractData(data: any[]) {

    this.rooms = [];
    this.roomTypes = [];
    this.contracts = [];

    data.forEach(item => {

      item.kontrak?.forEach((contract: any) => {

        const kamar = contract.kamar;
        const jenisKamar = kamar?.jenis_kamar;
        const kos = kamar?.kos;

        if (kos && !this.properties.some(p => p.id === String(kos.id_kos))) {
          this.properties.push({
            id: String(kos.id_kos),
            name: kos.nama_kos
          });
        }

        if (jenisKamar && !this.roomTypes.some(r => r.id === String(jenisKamar.id_jenisKamar))) {
          this.roomTypes.push({
            id: String(jenisKamar.id_jenisKamar),
            name: jenisKamar.nama_jenis
          });
        }

        if (kamar && !this.rooms.some(r => r.id === String(kamar.id_kamar))) {
          this.rooms.push({
            id: String(kamar.id_kamar),
            number: String(kamar.no_kamar),
            roomTypeId: String(kamar.tJenisKamar_id_jenisKamar)
          });
        }

        this.contracts.push({
          id: String(contract.id_kontrak),
          number: contract.no_kontrak,
          tenantId: String(item.id_penghuni),
          roomId: String(kamar?.id_kamar),
          propertyId: String(kos?.id_kos),
          startDate: contract.tgl_mulai,
          endDate: contract.tgl_selesai,
          status: this.mapContractStatus(contract.status)
        });

      });

    });
  }

  get activeTenants(): Tenant[] {
    return this.tenants.filter(t => !!t.activeContractId);
  }

  get inactiveTenants(): Tenant[] {
    return this.tenants.filter(t => !t.activeContractId);
  }

  get filteredTenants(): Tenant[] {
    return this.tenants.filter(t => {

      if (this.selectedPropertyId !== 'all' && t.currentPropertyId !== this.selectedPropertyId) {
        return false;
      }

      if (this.activeTab === 'aktif' && !t.activeContractId) {
        return false;
      }

      if (this.activeTab === 'nonaktif' && t.activeContractId) {
        return false;
      }

      if (this.search) {
        const keyword = this.search.toLowerCase();

        const match =
          t.name.toLowerCase().includes(keyword) ||
          t.email.toLowerCase().includes(keyword) ||
          t.phone.includes(keyword);

        if (!match) {
          return false;
        }
      }

      return true;
    });
  }

  setTab(tab: 'all' | 'aktif' | 'nonaktif') {
    this.activeTab = tab;
  }

  openDetail(tenant: Tenant) {
    this.clearKtpPreview();
    this.selectedTenant = tenant;
  }

  closeDetail() {
    this.clearKtpPreview();
    this.selectedTenant = null;
  }

  toggleKtpPreview(tenantId: string | number): void {
    const id = String(tenantId);
    const previewVisible = !!(this.ktpPreviewUrl || this.ktpErrorMessage || this.ktpLoading);

    if (this.ktpPreviewForId === id && previewVisible && !this.ktpLoading) {
      this.closeKtpPreview();
      return;
    }

    if (this.ktpLoading) {
      return;
    }

    this.clearKtpPreview();
    this.ktpPreviewForId = id;
    this.ktpLoading = true;
    this.cdr.detectChanges();

    this.api.getPenghuniKtp(Number(tenantId)).subscribe({
      next: (file: Blob) => {
        if (this.ktpPreviewForId !== id) {
          return;
        }
        this.ktpLoading = false;

        if (!file || file.size === 0) {
          this.ktpErrorMessage = 'Dokumen KTP kosong atau tidak tersedia.';
          this.cdr.detectChanges();
          return;
        }

        if (file.type === 'application/json' || file.type.startsWith('text/')) {
          this.ktpErrorMessage = 'Dokumen KTP tidak dapat dimuat. Periksa endpoint dan izin akses Laravel.';
          this.cdr.detectChanges();
          return;
        }

        this.ktpPreviewMimeType = file.type || 'image/jpeg';
        this.ktpPreviewUrl = URL.createObjectURL(file);
        this.ktpPreviewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.ktpPreviewUrl);
        this.cdr.detectChanges();
      },
      error: (error) => {
        if (this.ktpPreviewForId !== id) {
          return;
        }
        console.error('Gagal mengambil dokumen KTP penghuni:', error);
        this.ktpLoading = false;
        this.ktpErrorMessage = error.status === 404
          ? 'Laravel mengembalikan 404. Route KTP belum termuat atau file KTP tidak ditemukan di storage. Lihat Network > Response untuk detailnya.'
          : error.status === 401 || error.status === 403
            ? 'Akses dokumen KTP ditolak. Silakan login ulang dan periksa hak akses akun owner.'
            : `Foto KTP gagal dimuat (HTTP ${error.status || 'tidak diketahui'}). Periksa koneksi dan log Laravel.`;
        this.cdr.detectChanges();
      }
    });
  }

  closeKtpPreview(): void {
    this.clearKtpPreview();
    this.cdr.detectChanges();
  }

  private clearKtpPreview(): void {
    if (this.ktpPreviewUrl) {
      URL.revokeObjectURL(this.ktpPreviewUrl);
    }
    this.ktpPreviewForId = null;
    this.ktpPreviewUrl = null;
    this.ktpPreviewSafeUrl = null;
    this.ktpPreviewMimeType = '';
    this.ktpErrorMessage = '';
    this.ktpLoading = false;
  }

  ngOnDestroy(): void {
    this.clearKtpPreview();
  }

  getRoom(tenant: Tenant | null): Room | undefined {
    if (!tenant?.currentRoomId) {
      return undefined;
    }

    return this.rooms.find(
      room => room.id === tenant.currentRoomId
    );
  }

  getProperty(tenant: Tenant | null): Property | undefined {
    if (!tenant?.currentPropertyId) {
      return undefined;
    }

    return this.properties.find(
      property => property.id === tenant.currentPropertyId
    );
  }

  getRoomType(tenant: Tenant | null): RoomType | undefined {
    const room = this.getRoom(tenant);

    if (!room) {
      return undefined;
    }

    return this.roomTypes.find(
      type => type.id === room.roomTypeId
    );
  }

  getContract(tenant: Tenant | null): Contract | undefined {
    if (!tenant?.currentContractId) {
      return undefined;
    }

    return this.contracts.find(
      contract => contract.id === tenant.currentContractId
    );
  }

  getTenantContracts(tenant: Tenant | null): Contract[] {
    if (!tenant) {
      return [];
    }

    return this.contracts.filter(
      contract => contract.tenantId === tenant.id
    );
  }

  formatDate(date: string): string {
    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }


}
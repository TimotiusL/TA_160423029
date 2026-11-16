import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
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
  address: string;
  hasKtp: boolean;
}

interface Property {
  id: string;
  name: string;
}

interface Room {
  id: string;
  propertyId: string;
  roomTypeId: string;
  number: string;
  floor: number;
  price: number;
}

interface RoomType {
  id: string;
  name: string;
}

interface Registration {
  id: string;
  code: string;
  tenantId: string;
  propertyId: string;
  roomId: string;
  registrationDate: string;
  plannedMoveIn: string;
  plannedMoveOut: string;
  duration: number;
  bundleName: string;
  bundleNormalPrice: number;
  bundleDiscount: number;
  bundlePrice: number;
  notes: string;
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK' | 'DIBATALKAN';
  cancellationDate?: string;
  cancellationReason?: string;

  tenant?: Tenant;
  property?: Property;
  room?: Room;
  roomType?: RoomType;
}

@Component({
  selector: 'app-registrations',
  templateUrl: './registrations.page.html',
  styleUrls: ['./registrations.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonModal
  ]
})
export class RegistrationsPage {

  @ViewChild('registrationConfirmModal') private registrationConfirmModal?: IonModal;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.loadProperties();
    this.loadRegistrations();
  }

  search = '';
  selectedPropertyId = 'all';

  activeTab:
    | 'all'
    | 'MENUNGGU'
    | 'DISETUJUI'
    | 'DITOLAK'
    | 'DIBATALKAN' = 'all';

  selected: Registration | null = null;

  ktpLoading = false;
  ktpPreviewForId: string | null = null;
  ktpPreviewUrl: string | null = null;
  ktpPreviewSafeUrl: SafeResourceUrl | null = null;
  ktpPreviewMimeType = '';
  ktpErrorMessage = '';

  confirmAction: {
    registration: Registration;
    action: 'approve' | 'reject';
  } | null = null;
  isProcessingAction = false;
  confirmErrorMessage = '';


  tenants: Tenant[] = [];

  properties: Property[] = [];

  roomTypes: RoomType[] = [];

  rooms: Room[] = [];

  registrations: Registration[] = [];


  get totalCount(): number {
    return this.registrations.length;
  }

  get waitingCount(): number {
    return this.registrations.filter(
      r => r.status === 'MENUNGGU'
    ).length;
  }

  get approvedCount(): number {
    return this.registrations.filter(
      r => r.status === 'DISETUJUI'
    ).length;
  }

  get rejectedCount(): number {
    return this.registrations.filter(
      r => r.status === 'DITOLAK'
    ).length;
  }

  get cancelledCount(): number {
    return this.registrations.filter(
      r => r.status === 'DIBATALKAN'
    ).length;
  }


  get filteredRegistrations(): Registration[] {

    const keyword =
      this.search.toLowerCase().trim();

    return this.registrations.filter(reg => {

      if (
        this.activeTab !== 'all' &&
        reg.status !== this.activeTab
      ) {
        return false;
      }

      if (
        this.selectedPropertyId !== 'all' &&
        reg.propertyId !== this.selectedPropertyId
      ) {
        return false;
      }

      if (keyword) {

        const tenant =
          this.getTenant(reg);

        const tenantName =
          tenant?.name.toLowerCase() || '';

        const code =
          reg.code.toLowerCase();

        if (
          !tenantName.includes(keyword) &&
          !code.includes(keyword)
        ) {
          return false;
        }
      }

      return true;
    });
  }

  getTenant(registration: Registration): Tenant | undefined {
    return registration.tenant;
  }

  getProperty(registration: Registration): Property | undefined {
    return registration.property;
  }

  getRoom(registration: Registration): Room | undefined {
    return registration.room;
  }

  getRoomType(registration: Registration): RoomType | undefined {
    return registration.roomType;
  }

  formatDate(date: string): string {

    if (!date) {
      return '—';
    }

    return new Intl.DateTimeFormat(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    ).format(new Date(date));
  }


  formatRupiah(value: number): string {

    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }
    ).format(value);
  }


  selectRegistration(
    registration: Registration
  ): void {
    this.clearKtpPreview();
    this.selected = registration;
  }

  toggleKtpPreview(registrationId: string | number): void {
    const id = String(registrationId);
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
    this.ktpErrorMessage = '';
    this.cdr.detectChanges();

    this.api.getPendaftaranKtp(Number(registrationId)).subscribe({
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
        console.error('Gagal mengambil dokumen KTP pendaftaran:', error);
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

  closeDetail(): void {
    this.clearKtpPreview();
    this.selected = null;
  }


  async openConfirm(
    registration: Registration,
    action: 'approve' | 'reject'
  ): Promise<void> {
    this.confirmAction = { registration, action };
    this.confirmErrorMessage = '';
    this.isProcessingAction = false;
    this.cdr.detectChanges();
    await this.registrationConfirmModal?.present();
  }

  async closeConfirm(): Promise<void> {
    const dismissed = await this.registrationConfirmModal?.dismiss(null, 'cancel');
    if (!dismissed) this.onConfirmDidDismiss();
  }

  onConfirmDidDismiss(): void {
    this.confirmAction = null;
    this.isProcessingAction = false;
    this.confirmErrorMessage = '';
    this.cdr.detectChanges();
  }

  handleAction(): void {
    if (!this.confirmAction || this.isProcessingAction) return;

    const { registration, action } = this.confirmAction;
    const status: 'menunggu' | 'disetujui' | 'ditolak' =
      action === 'approve' ? 'disetujui' : 'ditolak';

    this.isProcessingAction = true;
    this.confirmErrorMessage = '';

    this.api.updatePendaftaranStatus(Number(registration.id), status).subscribe({
      next: async () => {
        const dismissed = await this.registrationConfirmModal?.dismiss({ updated: true }, 'confirmed');
        if (!dismissed) this.onConfirmDidDismiss();
        this.selected = null;
        this.loadRegistrations();
      },
      error: (error) => {
        console.error('Gagal mengubah status pendaftaran:', error);
        this.isProcessingAction = false;
        this.confirmErrorMessage = error?.error?.message || 'Status pendaftaran gagal diperbarui. Silakan coba kembali.';
        this.cdr.detectChanges();
      }
    });
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
      error: (error) => {
        console.error('Gagal mengambil daftar kos:', error);
      }
    });
  }

  loadRegistrations(): void {
    this.api.getPendaftaran().subscribe({
      next: (data: any[]) => {
        this.registrations = (Array.isArray(data) ? data : []).map(item => {
          const rawStatus = String(item.status || 'menunggu').toUpperCase();
          const status: Registration['status'] =
            rawStatus === 'DIBATALKAN' ? 'DIBATALKAN' :
            rawStatus === 'DITOLAK' ? 'DITOLAK' :
            rawStatus === 'DISETUJUI' ? 'DISETUJUI' : 'MENUNGGU';

          return {
            id: String(item.id_pendaftaran),
            code: item.kode_pendaftaran,
            tenantId: String(item.tUser_id_user),
            propertyId: String(item.kamar?.tKos_id_kos),
            roomId: String(item.tKamar_id_kamar),
            registrationDate: item.tgl_pendaftaran,
            plannedMoveIn: item.tgl_rencana_masuk,
            plannedMoveOut: '',
            duration: Number(item.durasi_sewa || 1),
            bundleName: String(item.nama_bundle || ''),
            bundleNormalPrice: Number(item.harga_normal_bundle || 0),
            bundleDiscount: Number(item.potongan_bundle || 0),
            bundlePrice: Number(item.harga_bundle || 0),
            notes: item.catatan || '',
            status,
            cancellationDate: item.tgl_pembatalan || '',
            cancellationReason: item.alasan_pembatalan || '',
            tenant: item.user?.penghuni ? {
              id: String(item.user.id_user),
              name: item.user.nama,
              nik: item.user.penghuni.nik,
              email: item.user.email,
              phone: item.user.no_telp,
              gender: item.user.penghuni.jenis_kelamin === 'pria' ? 'L' : 'P',
              address: '',
              hasKtp: !!item.user.penghuni.foto_ktp
            } : undefined,
            property: item.kamar?.kos ? {
              id: String(item.kamar.kos.id_kos),
              name: item.kamar.kos.nama_kos
            } : undefined,
            room: item.kamar ? {
              id: String(item.kamar.id_kamar),
              propertyId: String(item.kamar.tKos_id_kos),
              roomTypeId: String(item.kamar.tJenisKamar_id_jenisKamar),
              number: String(item.kamar.no_kamar),
              floor: item.kamar.lantai,
              price: Number(item.kamar.jenis_kamar?.harga_sewa || 0)
            } : undefined,
            roomType: item.kamar?.jenis_kamar ? {
              id: String(item.kamar.jenis_kamar.id_jenisKamar),
              name: item.kamar.jenis_kamar.nama_jenis
            } : undefined
          };
        });
        this.cdr.detectChanges();
        console.log('Data pendaftaran:', this.registrations);
      },
      error: (error) => {
        console.error('Gagal mengambil data pendaftaran:', error);
      }
    });
  }
}
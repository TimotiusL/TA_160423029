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

interface Tenant {
  id: string;
  name: string;
  nik: string;
  email: string;
  phone: string;
  gender: 'L' | 'P';
  address: string;
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
  notes: string;
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';

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
    IonIcon
  ]
})
export class RegistrationsPage {

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadRegistrations();
  }

  search = '';

  activeTab:
    | 'all'
    | 'MENUNGGU'
    | 'DISETUJUI'
    | 'DITOLAK' = 'all';

  selected: Registration | null = null;

  confirmAction: {
    registration: Registration;
    action: 'approve' | 'reject';
  } | null = null;


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

    this.selected = registration;
  }


  closeDetail(): void {

    this.selected = null;
  }


  openConfirm(
    registration: Registration,
    action: 'approve' | 'reject'
  ): void {

    this.confirmAction = {
      registration,
      action
    };
  }


  closeConfirm(): void {

    this.confirmAction = null;
  }


  handleAction(): void {
    if (!this.confirmAction) {
      return;
    }

    const { registration, action } = this.confirmAction;

    const status: 'menunggu' | 'disetujui' | 'ditolak' =
      action === 'approve'
        ? 'disetujui'
        : 'ditolak';

    this.api.updatePendaftaranStatus(
      Number(registration.id),
      status
    ).subscribe({
      next: () => {
        this.confirmAction = null;
        this.selected = null;

        this.loadRegistrations();
      },

      error: (error) => {
        console.error(
          'Gagal mengubah status pendaftaran:',
          error
        );
      }
    });
  }

  loadRegistrations(): void {
    this.api.getPendaftaran().subscribe({
      next: (data: any[]) => {
        this.registrations = data.map(item => ({
          id: String(item.id_pendaftaran),
          code: item.kode_pendaftaran,

          tenantId: String(item.tUser_id_user),
          propertyId: String(item.kamar?.tKos_id_kos),
          roomId: String(item.tKamar_id_kamar),

          registrationDate: item.tgl_pendaftaran,
          plannedMoveIn: item.tgl_rencana_masuk,
          plannedMoveOut: '',
          duration: Number(item.durasi_sewa || 1),
          notes: item.catatan || '',

          status: item.status.toUpperCase() as
            'MENUNGGU' | 'DISETUJUI' | 'DITOLAK',

          tenant: item.user?.penghuni ? {
            id: String(item.user.id_user),
            name: item.user.nama,
            nik: item.user.penghuni.nik,
            email: item.user.email,
            phone: item.user.no_telp,
            gender: item.user.penghuni.jenis_kelamin === 'pria' ? 'L' : 'P',
            address: ''
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
        }));
        this.cdr.detectChanges();
        console.log('Data pendaftaran:', this.registrations);
      },
      error: (error) => {
        console.error('Gagal mengambil data pendaftaran:', error);
      }
    });
  }
}
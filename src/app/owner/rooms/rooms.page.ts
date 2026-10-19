import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';

addIcons({
  searchOutline
});

interface Property {
  id: string;
  name: string;
}

interface RoomType {
  id: string;
  propertyId: string;
  name: string;
  price: number;
  facilities: string[];
}

interface Tenant {
  id: string;
  name: string;
}

interface Facility {
  id: number;
  name: string;
  description: string;
}

interface Room {
  id: string;
  propertyId: string;
  roomTypeId: string;
  number: string;
  floor: number;
  price: number;
  description: string;
  photo: string;
  status: 'TERSEDIA' | 'DIPESAN' | 'TERISI';
  currentTenantId?: string;
  facilities?: {
    id: number;
    name: string;
    quantity: number;
  }[];
}

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.page.html',
  styleUrls: ['./rooms.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonModal
  ]
})
export class RoomsPage implements OnInit {

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadData();
  }

  search = '';
  propertyFilter = '';
  typeFilter = '';
  floorFilter = '';
  statusFilter = '';

  showDeleteModal = false;
  roomToDelete: Room | null = null;

  view: 'grid' | 'table' | 'visual' = 'grid';

  selectedRoom: Room | null = null;

  showAdd = false;
  isEditMode = false;
  editingRoomId: number | null = null;

  properties: Property[] = [];

  roomTypes: RoomType[] = [];

  tenants: Tenant[] = [];

  rooms: Room[] = [];
  facilities: Facility[] = [];

  newRoom = {
    number: '',
    floor: 0,
    propertyId: '',
    roomTypeId: '',
    price: 0,
    description: '',
    status: 'tersedia' as 'tersedia' | 'dipesan' | 'terisi',
    facilities: [] as {
      id: number;
      quantity: number;
    }[],
  };


  get filteredRooms(): Room[] {
    return this.rooms.filter(room => {

      if (
        this.propertyFilter &&
        room.propertyId !== this.propertyFilter
      ) {
        return false;
      }

      if (
        this.typeFilter &&
        room.roomTypeId !== this.typeFilter
      ) {
        return false;
      }

      if (
        this.floorFilter &&
        room.floor !== Number(this.floorFilter)
      ) {
        return false;
      }

      if (
        this.statusFilter &&
        room.status !== this.statusFilter
      ) {
        return false;
      }

      if (
        this.search &&
        !room.number.includes(this.search)
      ) {
        return false;
      }

      return true;
    });
  }


  get floors(): number[] {
    return [
      ...new Set(this.rooms.map(room => room.floor))
    ].sort((a, b) => a - b);
  }


  get availableCount(): number {
    return this.rooms.filter(
      room => room.status === 'TERSEDIA'
    ).length;
  }


  get reservedCount(): number {
    return this.rooms.filter(
      room => room.status === 'DIPESAN'
    ).length;
  }


  get occupiedCount(): number {
    return this.rooms.filter(
      room => room.status === 'TERISI'
    ).length;
  }


  getTenant(room: Room): Tenant | undefined {
    return this.tenants.find(
      tenant => tenant.id === room.currentTenantId
    );
  }


  getType(room: Room): RoomType | undefined {
    return this.roomTypes.find(
      type => type.id === room.roomTypeId
    );
  }


  getProperty(room: Room): Property | undefined {
    return this.properties.find(
      property => property.id === room.propertyId
    );
  }


  getRoomsByFloor(propertyId: string) {

    const propertyRooms = this.rooms.filter(
      room => room.propertyId === propertyId
    );

    const floors = [
      ...new Set(propertyRooms.map(room => room.floor))
    ].sort((a, b) => a - b);

    return floors.map(floor => ({
      floor,
      rooms: propertyRooms.filter(
        room => room.floor === floor
      )
    }));
  }


  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }


  statusLabel(status: string): string {

    if (status === 'TERSEDIA') {
      return 'KOSONG';
    }

    return status;
  }


  resetFilters(): void {
    this.search = '';
    this.propertyFilter = '';
    this.typeFilter = '';
    this.floorFilter = '';
    this.statusFilter = '';
  }


  openDetail(room: Room): void {
    this.selectedRoom = room;
  }


  closeDetail(): void {
    this.selectedRoom = null;
  }


  openAdd(): void {
    this.isEditMode = false;
    this.editingRoomId = null;
    this.showAdd = true;
  }


  closeAdd(): void {
    this.showAdd = false;
    this.isEditMode = false;
    this.editingRoomId = null;

    this.newRoom = {
      number: '',
      floor: 0,
      propertyId: '',
      roomTypeId: '',
      price: 0,
      description: '',
      status: 'tersedia',
      facilities: [] as {
        id: number;
        quantity: number;
      }[],
    };
  }


  saveRoom(): void {
    const data = {
      tKos_id_kos: Number(this.newRoom.propertyId),
      tJenisKamar_id_jenisKamar: Number(this.newRoom.roomTypeId),
      no_kamar: Number(this.newRoom.number),
      lantai: Number(this.newRoom.floor),
      status: this.newRoom.status,
      deskripsi: this.newRoom.description,
      fasilitas: this.newRoom.facilities.map(facility => ({
        id_fasilitas: facility.id,
        jumlah: facility.quantity
      }))
    };

    if (this.isEditMode && this.editingRoomId !== null) {
      this.api.updateKamar(this.editingRoomId, data).subscribe({
        next: () => {
          alert('Kamar berhasil diperbarui!');
          this.closeAdd();
          this.loadRooms();
        },
        error: (error) => {
          console.error('Gagal memperbarui kamar:', error);

          if (error.error?.message) {
            alert(error.error.message);
          } else {
            alert('Gagal memperbarui kamar.');
          }
        }
      });

      return;
    }

    this.api.createKamar(data).subscribe({
      next: () => {
        alert('Kamar berhasil ditambahkan!');
        this.closeAdd();
        this.loadRooms();
      },
      error: (error) => {
        console.error('Gagal menambahkan kamar:', error);

        if (error.error?.message) {
          alert(error.error.message);
        } else {
          alert('Gagal menambahkan kamar.');
        }
      }
    });
  }


  editRoom(room: Room): void {
    this.isEditMode = true;
    this.editingRoomId = Number(room.id);

    this.newRoom = {
      number: room.number,
      floor: room.floor,
      propertyId: room.propertyId,
      roomTypeId: room.roomTypeId,
      price: room.price,
      description: room.description,
      status: room.status.toLowerCase() as 'tersedia' | 'dipesan' | 'terisi',
      facilities: (room.facilities || []).map(facility => ({
        id: facility.id,
        quantity: facility.quantity
      })),
    };

    this.selectedRoom = null;
    this.showAdd = true;
  }


  deleteRoom(room: Room): void {
    this.roomToDelete = room;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.roomToDelete = null;
  }

  confirmDeleteRoom(): void {
    if (!this.roomToDelete) {
      return;
    }

    const roomId = Number(this.roomToDelete.id);

    // Tutup semua modal
    this.closeDeleteModal();
    this.closeDetail();

    this.api.deleteKamar(roomId).subscribe({
      next: () => {
        this.loadRooms();
      },
      error: (error) => {
        console.error('Gagal menghapus kamar:', error);

        if (error.error?.message) {
          alert(error.error.message);
        } else {
          alert('Gagal menghapus kamar.');
        }
      }
    });
  }

  loadRooms(): void {
    this.api.getKamar().subscribe({
      next: (data) => {
        this.rooms = data.map((item: any) => ({
          id: String(item.id_kamar),
          propertyId: String(item.tKos_id_kos),
          roomTypeId: String(item.tJenisKamar_id_jenisKamar),
          number: String(item.no_kamar),
          floor: Number(item.lantai),
          price: Number(item.jenis_kamar?.harga_sewa || 0),
          description: item.deskripsi,
          photo: '',
          status: item.status.toUpperCase() as 'TERSEDIA' | 'DIPESAN' | 'TERISI',
          facilities: (item.fasilitas || []).map((facility: any) => ({
            id: facility.id_fasilitas,
            name: facility.nama_fasilitas,
            quantity: facility.pivot?.jumlah || 1
          }))
        }));
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Gagal mengambil data kamar:', error);
      }
    });
  }

  loadData(): void {
    this.api.getKos().subscribe({
      next: (data) => {
        this.properties = data.map((item: any) => ({
          id: String(item.id_kos),
          name: item.nama_kos
        }));
      },
      error: (error) => {
        console.error('Gagal mengambil data kos:', error);
      }
    });

    this.api.getJenisKamar().subscribe({
      next: (data) => {
        this.roomTypes = data.map((item: any) => ({
          id: String(item.id_jenisKamar),
          propertyId: String(item.tKos_id_kos),
          name: item.nama_jenis,
          price: Number(item.harga_sewa),
          facilities: []
        }));
      },
      error: (error) => {
        console.error('Gagal mengambil data jenis kamar:', error);
      }
    });

    this.api.getFasilitas().subscribe({
      next: (data: any[]) => {
        this.facilities = data.map(item => ({
          id: item.id_fasilitas,
          name: item.nama_fasilitas,
          description: item.deskripsi
        }));

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Gagal mengambil data fasilitas:', error);
      }
    });

    this.loadRooms();
  }

  get availableRoomTypes(): RoomType[] {
    if (!this.newRoom.propertyId) {
      return [];
    }

    return this.roomTypes.filter(
      type => type.propertyId === this.newRoom.propertyId
    );
  }

  onPropertyChange(): void {
    this.newRoom.roomTypeId = '';
    this.newRoom.price = 0;
  }

  onRoomTypeChange(): void {
    const selectedType = this.roomTypes.find(
      type => type.id === this.newRoom.roomTypeId
    );

    this.newRoom.price = selectedType
      ? selectedType.price
      : 0;
  }

  isFacilitySelected(id: number): boolean {
    return this.newRoom.facilities.some(facility => facility.id === id);
  }

  toggleFacility(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.newRoom.facilities.push({
        id: id,
        quantity: 1
      });
    } else {
      this.newRoom.facilities =
        this.newRoom.facilities.filter(facility => facility.id !== id);
    }
  }

  getFacilityQuantity(id: number): number {
    const facility = this.newRoom.facilities.find(
      facility => facility.id === id
    );

    return facility ? facility.quantity : 1;
  }

  updateFacilityQuantity(id: number, event: Event): void {
    const quantity = Number((event.target as HTMLInputElement).value);

    const facility = this.newRoom.facilities.find(
      facility => facility.id === id
    );

    if (facility) {
      facility.quantity = quantity < 1 ? 1 : quantity;
    }
  }
}
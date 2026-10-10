import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

interface RoomType {
  id: number;
  name: string;
  description: string;
  price: number;
  roomCount: number;
  kosId: number;
  kosName: string;
}

interface Kos {
  id_kos: number;
  nama_kos: string;
}

@Component({
  selector: 'app-room-types',
  templateUrl: './room-types.page.html',
  styleUrls: ['./room-types.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class RoomTypesPage implements OnInit {

  showAdd = false;
  editingRoomType: RoomType | null = null;

  roomTypes: RoomType[] = [];
  allRoomTypes: RoomType[] = [];
  kosList: Kos[] = [];
  selectedKosId: number | null = null;

  form = {
    kosId: null as number | null,
    name: '',
    description: '',
    price: ''
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.selectedKosId = null;
    this.loadKos();
  }

  loadRoomTypes() {
    this.api.getJenisKamar().subscribe({
      next: (data: any[]) => {
        this.allRoomTypes = data.map(item => ({
          id: item.id_jenisKamar,
          name: item.nama_jenis,
          description: item.deskripsi,
          price: Number(item.harga_sewa),
          roomCount: item.kamar_count ?? 0,
          kosId: item.tKos_id_kos,
          kosName: item.kos?.nama_kos ?? '-'
        }));

        this.roomTypes = [...this.allRoomTypes];
        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('ERROR API JENIS KAMAR:', error);
      }
    });
  }

  changeKosFilter() {
    if (this.selectedKosId === null) {
      this.roomTypes = [...this.allRoomTypes];
      return;
    }

    this.roomTypes = this.allRoomTypes.filter(
      roomType => roomType.kosId === this.selectedKosId
    );
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  openAdd() {
    this.editingRoomType = null;

    this.form = {
      kosId: null,
      name: '',
      description: '',
      price: ''
    };

    this.showAdd = true;
  }

  openEdit(roomType: RoomType) {
    this.editingRoomType = roomType;

    this.form = {
      kosId: roomType.kosId,
      name: roomType.name,
      description: roomType.description,
      price: roomType.price.toString()
    };

    this.showAdd = true;
  }

  closeAdd() {
    this.showAdd = false;
    this.editingRoomType = null;
  }

  saveRoomType() {
    if (!this.form.kosId || !this.form.name || !this.form.price) {
      alert('Kos, nama tipe kamar, dan harga sewa wajib diisi.');
      return;
    }

    const data = {
      tKos_id_kos: this.form.kosId,
      nama_jenis: this.form.name,
      deskripsi: this.form.description,
      harga_sewa: Number(this.form.price)
    };

    if (this.editingRoomType) {
      this.api.updateJenisKamar(
        this.editingRoomType.id,
        data
      ).subscribe({
        next: () => {
          this.closeAdd();
          this.loadRoomTypes();
        },
        error: (error) => {
          console.error('Gagal mengubah tipe kamar:', error);
          alert('Gagal mengubah tipe kamar.');
        }
      });

    } else {
      this.api.createJenisKamar(data).subscribe({
        next: () => {
          this.closeAdd();
          this.loadRoomTypes();
        },
        error: (error) => {
          console.error('Gagal menambahkan tipe kamar:', error);
          alert('Gagal menambahkan tipe kamar.');
        }
      });
    }
  }

  deleteRoomType(roomType: RoomType) {
    if (roomType.roomCount > 0) {
      alert('Tipe kamar masih digunakan oleh kamar dan tidak dapat dihapus.');
      return;
    }

    const confirmDelete = confirm(
      `Apakah Anda yakin ingin menghapus tipe kamar "${roomType.name}"?`
    );

    if (!confirmDelete) {
      return;
    }

    this.api.deleteJenisKamar(roomType.id).subscribe({
      next: () => {
        this.loadRoomTypes();
      },
      error: (error) => {
        console.error('Gagal menghapus tipe kamar:', error);

        const message =
          error?.error?.message ||
          'Gagal menghapus tipe kamar.';

        alert(message);
      }
    });
  }

  loadKos() {
    this.api.getKos().subscribe({
      next: (data: any[]) => {

        this.kosList = data.map(item => ({
          id_kos: item.id_kos,
          nama_kos: item.nama_kos
        }));

        this.cdr.detectChanges();

        this.loadRoomTypes();
      },

      error: (error) => {
        console.error('ERROR API KOS:', error);
      }
    });
  }
}
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

interface Property {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  floors: number;
  deposit: number;
  photo: string;
  status: string;
  totalRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  availableRooms: number;
  tenantCount: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

@Component({
  selector: 'app-properties',
  templateUrl: './properties.page.html',
  styleUrls: ['./properties.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonModal
  ]
})
export class PropertiesPage implements OnInit {

  constructor(private api: ApiService, private cdr: ChangeDetectorRef, private router: Router) { }

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    this.api.getKos().subscribe({
      next: (data: any[]) => {
        console.log('Data kos:', data);

        this.properties = data.map(kos => ({
          id: String(kos.id_kos),
          name: kos.nama_kos,
          address: kos.alamat,
          phone: kos.no_telp,
          email: kos.email,
          description: kos.deskripsi,
          floors: kos.jumlah_lantai,
          deposit: Number(kos.deposit),
          photo: this.getPhotoUrl(kos.foto),
          status: kos.status.toUpperCase(),

          totalRooms: kos.totalRooms,
          occupiedRooms: kos.occupiedRooms,
          reservedRooms: kos.reservedRooms,
          availableRooms: kos.availableRooms,

          tenantCount: kos.tenantCount,
          monthlyIncome: Number(kos.monthlyIncome) || 0,
          monthlyExpense: Number(kos.monthlyExpense) || 0
        }));
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Gagal mengambil data kos:', error);
      }
    });
  }

  search = '';

  showAdd = false;
  photoFile: File | null = null;
  photoPreview = '';

  selectedProperty: Property | null = null;
  editingProperty: Property | null = null;

  form = {
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
    floors: '',
    deposit: ''
  };

  properties: Property[] = [];


  get filteredProperties(): Property[] {
    const keyword = this.search.toLowerCase().trim();

    if (!keyword) {
      return this.properties;
    }

    return this.properties.filter(property =>
      property.name.toLowerCase().includes(keyword) ||
      property.address.toLowerCase().includes(keyword)
    );
  }

  get totalIncome(): number {
    return this.properties.reduce(
      (sum, property) => sum + (Number(property.monthlyIncome) || 0),
      0
    );
  }

  get totalRooms(): number {
    return this.properties.reduce(
      (sum, property) => sum + property.totalRooms,
      0
    );
  }

  get totalOccupied(): number {
    return this.properties.reduce(
      (sum, property) => sum + property.occupiedRooms,
      0
    );
  }

  get occupancyPercentage(): number {
    if (this.totalRooms === 0) {
      return 0;
    }

    return Math.round(
      (this.totalOccupied / this.totalRooms) * 100
    );
  }


  getProfit(property: Property): number {
    return property.monthlyIncome - property.monthlyExpense;
  }


  getOccupancy(property: Property): number {
    if (property.totalRooms === 0) {
      return 0;
    }

    return Math.round(
      (property.occupiedRooms / property.totalRooms) * 100
    );
  }


  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }


  openAddModal(): void {
    this.editingProperty = null;
    this.photoFile = null;
    this.photoPreview = '';

    this.form = {
      name: '',
      address: '',
      phone: '',
      email: '',
      description: '',
      floors: '',
      deposit: ''
    };

    this.showAdd = true;
  }

  editProperty(property: Property): void {
    this.editingProperty = property;
    this.photoFile = null;
    this.photoPreview = property.photo || '';

    this.form = {
      name: property.name,
      address: property.address,
      phone: property.phone,
      email: property.email,
      description: property.description,
      floors: String(property.floors),
      deposit: String(property.deposit)
    };

    this.showAdd = true;
  }


  closeAddModal(): void {
    this.showAdd = false;
    this.editingProperty = null;
    this.photoFile = null;
    this.photoPreview = '';

    this.form = {
      name: '',
      address: '',
      phone: '',
      email: '',
      description: '',
      floors: '',
      deposit: ''
    };
  }


  saveProperty(): void {
    const data = new FormData();
    data.append('nama_kos', this.form.name);
    data.append('alamat', this.form.address);
    data.append('deskripsi', this.form.description || '-');
    data.append('no_telp', this.form.phone);
    data.append('email', this.form.email);
    data.append('jumlah_lantai', String(this.form.floors));
    data.append('deposit', String(this.form.deposit || 0));
    data.append('status', this.editingProperty
      ? this.editingProperty.status.toLowerCase()
      : 'aktif');

    if (this.photoFile) {
      data.append('foto', this.photoFile, this.photoFile.name);
    }

    const request = this.editingProperty
      ? this.api.updateKos(this.editingProperty.id, data)
      : this.api.createKos(data);

    request.subscribe({
      next: () => {
        this.closeAddModal();
        this.loadProperties();
      },
      error: (error) => {
        console.error('Gagal menyimpan data kos:', error);
        const message = error?.error?.message || 'Gagal menyimpan data kos. Periksa kembali data dan koneksi API.';
        alert(message);
      }
    });
  }

  triggerPhotoUpload(): void {
    const input = document.getElementById('kos-photo-input') as HTMLInputElement | null;
    input?.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      alert('Foto harus berformat JPG atau PNG.');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran foto maksimal 5 MB.');
      input.value = '';
      return;
    }

    this.photoFile = file;

    if (this.photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.photoPreview);
    }
    this.photoPreview = URL.createObjectURL(file);
    this.cdr.detectChanges();
  }

  getPhotoUrl(photo: string | null | undefined): string {
    if (!photo || photo === 'default.jpg') return '';

    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:') || photo.startsWith('blob:')) {
      return photo;
    }

    const cleanPath = photo.replace(/^\/+/, '').replace(/^storage\//, '');
    return `http://127.0.0.1:8000/storage/${cleanPath}`;
  }

  onPhotoError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }

  openDetail(property: Property): void {
    this.selectedProperty = property;
  }


  closeDetail(): void {
    this.selectedProperty = null;
  }


  navigate(page: string): void {
    console.log('Navigate to:', page);
  }


  deleteProperty(property: Property): void {
    const confirmed = confirm(
      `Apakah Anda yakin ingin menghapus ${property.name}?`
    );

    if (!confirmed) {
      return;
    }

    this.api.deleteKos(property.id).subscribe({
      next: () => {
        this.loadProperties();
      },
      error: (error) => {
        console.error('Gagal menghapus kos:', error);
        alert('Gagal menghapus kos');
      }
    });
  }

  openRooms(kosId: string): void {
    this.router.navigate(['/owner/rooms'], {
      queryParams: { kosId: kosId }
    });
  }

}
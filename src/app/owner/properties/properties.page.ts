import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) { }

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
          photo: kos.foto,
          status: kos.status.toUpperCase(),

          totalRooms: kos.totalRooms,
          occupiedRooms: kos.occupiedRooms,
          reservedRooms: kos.reservedRooms,
          availableRooms: kos.availableRooms,

          tenantCount: kos.tenantCount,
          monthlyIncome: kos.monthlyIncome,
          monthlyExpense: kos.monthlyExpense
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
      (sum, property) => sum + property.monthlyIncome,
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
    const data = {
      nama_kos: this.form.name,
      alamat: this.form.address,
      deskripsi: this.form.description,
      no_telp: this.form.phone,
      email: this.form.email,
      jumlah_lantai: Number(this.form.floors),
      deposit: Number(this.form.deposit),
      status: this.editingProperty
        ? this.editingProperty.status.toLowerCase()
        : 'aktif'
    };

    if (this.editingProperty) {
      this.api.updateKos(this.editingProperty.id, data).subscribe({
        next: () => {
          this.showAdd = false;
          this.editingProperty = null;

          this.form = {
            name: '',
            address: '',
            phone: '',
            email: '',
            description: '',
            floors: '',
            deposit: ''
          };

          this.loadProperties();
        },
        error: (error) => {
          console.error('Gagal mengubah property:', error);
        }
      });

      return;
    }

    this.api.createKos(data).subscribe({
      next: () => {
        this.showAdd = false;

        this.form = {
          name: '',
          address: '',
          phone: '',
          email: '',
          description: '',
          floors: '',
          deposit: ''
        };

        this.loadProperties();
      },
      error: (error) => {
        console.error('Gagal menambahkan property:', error);
      }
    });
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


  triggerPhotoUpload(): void {
    console.log('Upload foto kos');
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

}
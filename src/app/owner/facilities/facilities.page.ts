import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';

addIcons({
  searchOutline
});

interface Facility {
  id: number;
  name: string;
  description: string;
  usageCount: number;
}

@Component({
  selector: 'app-facilities',
  templateUrl: './facilities.page.html',
  styleUrls: ['./facilities.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonModal
  ]
})
export class FacilitiesPage {

  @ViewChild('facilityFormModal') private facilityFormModal?: IonModal;
  @ViewChild('facilitySuccessModal') private facilitySuccessModal?: IonModal;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadFacilities();
  }

  search = '';

  showForm = false;
  editingFacility: Facility | null = null;

  showDeleteModal = false;
  facilityToDelete: Facility | null = null;

  form = {
    name: '',
    description: ''
  };

  facilities: Facility[] = [];


  get filteredFacilities(): Facility[] {
    const keyword = this.search
      .toLowerCase()
      .trim();

    if (!keyword) {
      return this.facilities;
    }

    return this.facilities.filter(facility =>
      facility.name.toLowerCase().includes(keyword) ||
      facility.description.toLowerCase().includes(keyword)
    );
  }


  async openAdd(): Promise<void> {
    this.editingFacility = null;

    this.form = {
      name: '',
      description: ''
    };

    this.showForm = true;
    this.cdr.detectChanges();
    await this.facilityFormModal?.present();
  }


  async openEdit(facility: Facility): Promise<void> {
    this.editingFacility = facility;

    this.form = {
      name: facility.name,
      description: facility.description
    };

    this.showForm = true;
    this.cdr.detectChanges();
    await this.facilityFormModal?.present();
  }


  async closeForm(): Promise<void> {
    const dismissed = await this.facilityFormModal?.dismiss(null, 'cancel');
    if (!dismissed) this.onFormDidDismiss();
  }

  onFormDidDismiss(): void {
    this.showForm = false;
    this.editingFacility = null;
    this.form = { name: '', description: '' };
    this.cdr.detectChanges();
  }

  private async completeSave(): Promise<void> {
    const dismissed = await this.facilityFormModal?.dismiss({ saved: true }, 'saved');
    if (!dismissed) this.onFormDidDismiss();

    this.showForm = false;
    this.loadFacilities();
    this.cdr.detectChanges();
    await this.facilitySuccessModal?.present();
  }

  async dismissSaveSuccess(): Promise<void> {
    const dismissed = await this.facilitySuccessModal?.dismiss(null, 'backdrop');
    if (!dismissed) this.onSaveSuccessDidDismiss();
  }

  onSaveSuccessDidDismiss(): void {
    this.cdr.detectChanges();
  }


  saveFacility(): void {
    if (!this.form.name.trim()) {
      alert('Nama fasilitas wajib diisi.');
      return;
    }

    const data = {
      nama_fasilitas: this.form.name.trim(),
      deskripsi: this.form.description.trim()
    };

    if (this.editingFacility) {
      this.api.updateFasilitas(
        this.editingFacility.id,
        data
      ).subscribe({
        next: async () => {
          await this.completeSave();
        },
        error: (error) => {
          console.error('Gagal mengubah fasilitas:', error);
          this.showSaveError(error, 'mengubah');
        }
      });

    } else {
      this.api.createFasilitas(data).subscribe({
        next: async () => {
          await this.completeSave();
        },
        error: (error) => {
          console.error('Gagal menambahkan fasilitas:', error);
          this.showSaveError(error, 'menambahkan');
        }
      });
    }
  }


  private showSaveError(error: any, action: string): void {
    const errors = error?.error?.errors;
    const firstKey = errors ? Object.keys(errors)[0] : null;
    const validationMessage = firstKey ? errors[firstKey]?.[0] : '';
    const message = validationMessage || error?.error?.message || `Gagal ${action} fasilitas.`;
    alert(message);
  }

  deleteFacility(facility: Facility): void {
    if (facility.usageCount > 0) {
      alert(
        'Fasilitas yang masih digunakan oleh kamar tidak dapat dihapus.'
      );
      return;
    }

    this.facilityToDelete = facility;
    this.showDeleteModal = true;
  }

  loadFacilities(): void {
    this.api.getFasilitas().subscribe({
      next: (data: any[]) => {
        this.facilities = data.map(item => ({
          id: item.id_fasilitas,
          name: item.nama_fasilitas,
          description: item.deskripsi,
          usageCount: item.kamar_count
        }));

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Gagal mengambil data fasilitas:', error);
      }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.facilityToDelete = null;
  }

  confirmDeleteFacility(): void {
    if (!this.facilityToDelete) {
      return;
    }

    const id = this.facilityToDelete.id;

    this.closeDeleteModal();

    this.api.deleteFasilitas(id).subscribe({
      next: () => {
        this.loadFacilities();
      },
      error: (error) => {
        console.error('Gagal menghapus fasilitas:', error);

        if (error.error?.message) {
          alert(error.error.message);
        } else {
          alert('Gagal menghapus fasilitas.');
        }
      }
    });
  }

}
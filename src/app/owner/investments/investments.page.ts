import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonModal } from '@ionic/angular';
import { ApiService } from '../../services/api';

interface Property {
  id: string;
  name: string;
}

interface Investment {
  id: number;
  propertyId: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, FormsModule, IonModal],
  templateUrl: './investments.page.html',
  styleUrls: ['./investments.page.scss']
})
export class InvestmentsPage implements OnInit {

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  propFilter = '';
  showAdd = false;
  editingId: number | null = null;
  loading = false;

  form = {
    propertyId: '',
    category: '',
    date: '',
    amount: '',
    description: ''
  };

  properties: Property[] = [];

  categories = [
    'Konstruksi',
    'Renovasi',
    'Furnitur',
    'Pemasangan AC',
    'Peralatan',
    'Perbaikan',
    'Lainnya'
  ];

  investments: Investment[] = [];

  ngOnInit(): void {
    this.loadProperties();
    this.loadInvestments();
  }

  loadProperties(): void {
    this.api.getKos().subscribe({
      next: (data: any[]) => {
        this.properties = data.map(kos => ({
          id: String(kos.id_kos),
          name: kos.nama_kos
        }));

        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Gagal mengambil data kos:', error);
        alert('Gagal mengambil daftar properti.');
      }
    });
  }

  loadInvestments(): void {
    this.loading = true;

    this.api.getInvestasi().subscribe({
      next: (data: any[]) => {
        this.investments = data.map(item => ({
          id: Number(item.id_investasi),
          propertyId: String(item.tKos_id_kos),
          date: String(item.tgl_masuk).substring(0, 10),
          category: item.kategori,
          amount: Number(item.jumlah),
          description: item.deskripsi
        }));

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Gagal mengambil data investasi:', error);
        this.loading = false;
        alert('Gagal mengambil data investasi.');
        this.cdr.detectChanges();
      }
    });
  }

  get filteredInvestments(): Investment[] {
    if (!this.propFilter) {
      return this.investments;
    }

    return this.investments.filter(
      investment => investment.propertyId === this.propFilter
    );
  }

  get totalInvestment(): number {
    return this.filteredInvestments.reduce(
      (sum, investment) => sum + investment.amount,
      0
    );
  }

  getPropertyInvestments(propertyId: string): Investment[] {
    return this.investments.filter(
      investment => investment.propertyId === propertyId
    );
  }

  getPropertyTotal(propertyId: string): number {
    return this.getPropertyInvestments(propertyId).reduce(
      (sum, investment) => sum + investment.amount,
      0
    );
  }

  getPropertyName(propertyId: string): string {
    const property = this.properties.find(
      item => item.id === propertyId
    );

    return property?.name || '-';
  }

  getCategoryClass(category: string): string {
    const classes: Record<string, string> = {
      Konstruksi: 'category-slate',
      Renovasi: 'category-orange',
      Furnitur: 'category-blue',
      'Pemasangan AC': 'category-teal',
      Peralatan: 'category-purple',
      Perbaikan: 'category-amber',
      Lainnya: 'category-green'
    };

    return classes[category] || 'category-slate';
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date + 'T00:00:00'));
  }

  openAddModal(): void {
    this.editingId = null;

    this.form = {
      propertyId: '',
      category: '',
      date: '',
      amount: '',
      description: ''
    };

    this.showAdd = true;
  }

  closeAddModal(): void {
    this.showAdd = false;
    this.editingId = null;
  }

  editInvestment(investment: Investment): void {
    this.editingId = investment.id;

    this.form = {
      propertyId: investment.propertyId,
      category: investment.category,
      date: investment.date,
      amount: String(investment.amount),
      description: investment.description
    };

    this.showAdd = true;
  }

  saveInvestment(): void {
    if (
      !this.form.propertyId ||
      !this.form.category ||
      !this.form.date ||
      !this.form.amount ||
      Number(this.form.amount) <= 0
    ) {
      alert('Lengkapi data investasi terlebih dahulu.');
      return;
    }

    if (!this.form.description.trim()) {
      alert('Deskripsi investasi wajib diisi.');
      return;
    }

    const data = {
      tKos_id_kos: Number(this.form.propertyId),
      tgl_masuk: this.form.date,
      kategori: this.form.category,
      deskripsi: this.form.description.trim(),
      jumlah: Number(this.form.amount)
    };

    const request = this.editingId !== null
      ? this.api.updateInvestasi(this.editingId, data)
      : this.api.createInvestasi(data);

    request.subscribe({
      next: () => {
        alert(
          this.editingId !== null
            ? 'Investasi berhasil diperbarui.'
            : 'Investasi berhasil ditambahkan.'
        );

        this.closeAddModal();
        this.loadInvestments();
      },
      error: error => {
        console.error('Gagal menyimpan investasi:', error);
        alert(
          error.error?.message ||
          'Gagal menyimpan investasi. Periksa kembali data dan API.'
        );
      }
    });
  }

  deleteInvestment(investment: Investment): void {
    const confirmed = confirm(
      `Hapus investasi "${investment.description}"?`
    );

    if (!confirmed) {
      return;
    }

    this.api.deleteInvestasi(investment.id).subscribe({
      next: () => {
        alert('Investasi berhasil dihapus.');
        this.loadInvestments();
      },
      error: error => {
        console.error('Gagal menghapus investasi:', error);
        alert(
          error.error?.message || 'Gagal menghapus investasi.'
        );
      }
    });
  }
}

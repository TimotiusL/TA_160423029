import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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

interface Expense {
  id: number;
  propertyId: string;
  category: string;
  date: string;
  amount: number;
  description: string;
  proof?: string;
}

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonModal],
  templateUrl: './expenses.page.html',
  styleUrls: ['./expenses.page.scss']
})
export class ExpensesPage implements OnInit {
  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  search = '';
  propFilter = '';
  catFilter = '';
  currentProof: string | null = null;
  showAdd = false;
  editingId: number | null = null;
  selectedFile: File | null = null;
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
    'Listrik',
    'Air',
    'Internet',
    'Perawatan',
    'Kebersihan',
    'Perbaikan',
    'Gaji',
    'Lainnya'
  ];

  expenses: Expense[] = [];

  ngOnInit(): void {
    this.loadProperties();
    this.loadExpenses();
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

  loadExpenses(): void {
    this.loading = true;

    this.api.getPengeluaran().subscribe({
      next: (data: any[]) => {
        this.expenses = data.map(item => ({
          id: Number(item.id_pengeluaran),
          propertyId: String(item.tKos_id_kos),
          category: item.nama_pengeluaran,
          date: String(item.tgl_pengeluaran).substring(0, 10),
          amount: Number(item.jumlah),
          description: item.catatan || '-',
          proof: item.bukti_pengeluaran
        }));

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Gagal mengambil pengeluaran:', error);
        this.loading = false;
        alert('Gagal mengambil data pengeluaran.');
        this.cdr.detectChanges();
      }
    });
  }

  get filteredExpenses(): Expense[] {
    return this.expenses.filter(expense => {
      if (
        this.propFilter &&
        expense.propertyId !== this.propFilter
      ) {
        return false;
      }

      if (
        this.catFilter &&
        expense.category !== this.catFilter
      ) {
        return false;
      }

      if (
        this.search &&
        !expense.description.toLowerCase().includes(
          this.search.toLowerCase()
        )
      ) {
        return false;
      }

      return true;
    });
  }

  get totalExpense(): number {
    return this.filteredExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
  }

  get thisMonthExpense(): number {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;

    return this.expenses
      .filter(expense => expense.date.startsWith(month))
      .reduce((sum, expense) => sum + expense.amount, 0);
  }

  get currentMonthLabel(): string {
    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }

  getPropertyName(propertyId: string): string {
    const property = this.properties.find(
      item => item.id === propertyId
    );

    return property?.name || '-';
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

  getCategoryClass(category: string): string {
    const classes: Record<string, string> = {
      Listrik: 'category-amber',
      Air: 'category-blue',
      Internet: 'category-purple',
      Perawatan: 'category-green',
      Kebersihan: 'category-teal',
      Perbaikan: 'category-orange',
      Gaji: 'category-indigo',
      Lainnya: 'category-slate'
    };

    return classes[category] || 'category-slate';
  }

  openAddModal(): void {
    this.editingId = null;
    this.currentProof = null;
    this.selectedFile = null;

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
    this.selectedFile = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
  }

  editExpense(expense: Expense): void {
    this.editingId = expense.id;
    this.selectedFile = null;
    this.currentProof = expense.proof || null;

    this.form = {
      propertyId: expense.propertyId,
      category: expense.category,
      date: expense.date,
      amount: String(expense.amount),
      description: expense.description === '-'
        ? ''
        : expense.description
    };

    this.showAdd = true;
  }

  saveExpense(): void {
    if (
      !this.form.propertyId ||
      !this.form.category ||
      !this.form.date ||
      !this.form.amount ||
      Number(this.form.amount) <= 0
    ) {
      alert('Lengkapi data pengeluaran terlebih dahulu.');
      return;
    }

    if (this.editingId === null && !this.selectedFile) {
      alert('Silakan pilih bukti atau kwitansi pengeluaran.');
      return;
    }

    const data = new FormData();

    data.append('tKos_id_kos', this.form.propertyId);
    data.append('tgl_pengeluaran', this.form.date);
    data.append('nama_pengeluaran', this.form.category);
    data.append('jumlah', this.form.amount);
    data.append('catatan', this.form.description.trim() || '-');

    if (this.selectedFile) {
      data.append('bukti_pengeluaran', this.selectedFile);
    }

    const request = this.editingId !== null
      ? this.api.updatePengeluaran(this.editingId, data)
      : this.api.createPengeluaran(data);

    request.subscribe({
      next: () => {
        alert(
          this.editingId !== null
            ? 'Pengeluaran berhasil diperbarui.'
            : 'Pengeluaran berhasil dicatat.'
        );

        this.closeAddModal();
        this.loadExpenses();
      },
      error: error => {
        console.error('Gagal menyimpan pengeluaran:', error);

        const message = error.error?.message ||
          'Gagal menyimpan pengeluaran. Periksa kembali data dan API Laravel.';

        alert(message);
      }
    });
  }

  deleteExpense(expense: Expense): void {
    const confirmed = confirm(
      `Hapus pengeluaran "${expense.description}"?`
    );

    if (!confirmed) {
      return;
    }

    this.api.deletePengeluaran(expense.id).subscribe({
      next: () => {
        alert('Pengeluaran berhasil dihapus.');
        this.loadExpenses();
      },
      error: error => {
        console.error('Gagal menghapus pengeluaran:', error);
        alert(
          error.error?.message ||
          'Gagal menghapus pengeluaran.'
        );
      }
    });
  }

  getProofUrl(proof: string): string {
    if (proof.startsWith('http')) {
      return proof;
    }

    return `http://127.0.0.1:8000/storage/${proof}`;
  }

  viewProof(proof: string): void {
    window.open(this.getProofUrl(proof), '_blank');
  }
}

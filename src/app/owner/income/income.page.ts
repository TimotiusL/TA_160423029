import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
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

interface Income {
  id: string;
  date: string;
  paymentId: string;
  tenantId: string;
  propertyId: string;
  source: string;
  amount: number;
  description: string;
}

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './income.page.html',
  styleUrls: ['./income.page.scss']
})
export class IncomePage implements OnInit {
  search = '';
  propFilter = '';

  properties: Property[] = [];
  incomes: Income[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadIncome();
  }

  loadIncome(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.getPemasukan().subscribe({
      next: (response: any[]) => {
        this.incomes = response.map(item => ({
          id: String(item.id_pemasukan),
          date: item.tgl_pemasukan,
          paymentId: String(item.tPembayaran_id_pembayaran),
          tenantId: item.nama_penghuni || '-',
          propertyId: String(item.id_kos),
          source: item.metode_pembayaran || 'Sewa Kamar',
          amount: Number(item.jumlah || 0),
          description: item.catatan || item.kode_tagihan || '-'
        }));

        const propertyMap = new Map<string, string>();

        response.forEach(item => {
          propertyMap.set(
            String(item.id_kos),
            item.nama_kos || '-'
          );
        });

        this.properties = Array.from(
          propertyMap,
          ([id, name]) => ({ id, name })
        );

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Gagal mengambil data pendapatan:', error);
        this.errorMessage =
          error.error?.message || 'Data pendapatan gagal dimuat.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get filteredIncomes(): Income[] {
    return this.incomes.filter(income => {
      if (
        this.propFilter &&
        income.propertyId !== this.propFilter
      ) {
        return false;
      }

      const keyword = this.search.trim().toLowerCase();

      if (keyword) {
        const tenantMatch =
          income.tenantId.toLowerCase().includes(keyword);

        const descriptionMatch =
          income.description.toLowerCase().includes(keyword);

        const propertyMatch =
          this.getPropertyName(income.propertyId)
            .toLowerCase()
            .includes(keyword);

        if (
          !tenantMatch &&
          !descriptionMatch &&
          !propertyMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }

  get totalIncome(): number {
    return this.filteredIncomes.reduce(
      (sum, income) => sum + income.amount,
      0
    );
  }

  get thisMonthIncome(): number {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return this.incomes
      .filter(income => {
        const date = new Date(income.date);

        return date.getMonth() === month &&
          date.getFullYear() === year;
      })
      .reduce((sum, income) => sum + income.amount, 0);
  }

  get lastMonthIncome(): number {
    const now = new Date();
    const lastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    return this.incomes
      .filter(income => {
        const date = new Date(income.date);

        return date.getMonth() === lastMonth.getMonth() &&
          date.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((sum, income) => sum + income.amount, 0);
  }

  get thisMonthLabel(): string {
    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }

  get lastMonthLabel(): string {
    const now = new Date();

    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  }

  getPropertyName(propertyId: string): string {
    return this.properties.find(
      property => property.id === propertyId
    )?.name || '-';
  }

  getTenantName(tenantId: string): string {
    return tenantId || '-';
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
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

  exportData(): void {
    const headers = [
      'Tanggal',
      'Penghuni',
      'Properti',
      'Sumber',
      'Deskripsi',
      'Jumlah'
    ];

    const rows = this.filteredIncomes.map(income => [
      this.formatDate(income.date),
      this.getTenantName(income.tenantId),
      this.getPropertyName(income.propertyId),
      income.source,
      income.description,
      income.amount.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(value =>
          `"${String(value).replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob(
      ['\uFEFF' + csvContent],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'data-pendapatan.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}
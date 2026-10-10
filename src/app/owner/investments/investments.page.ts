import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Property {
  id: string;
  name: string;
}

interface Investment {
  id: string;
  propertyId: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investments.page.html',
  styleUrls: ['./investments.page.scss']
})
export class InvestmentsPage {

  propFilter = '';
  showAdd = false;

  form = {
    propertyId: '',
    category: '',
    date: '',
    amount: '',
    description: ''
  };

  properties: Property[] = [
    {
      id: 'p1',
      name: 'Kost Griya 21'
    },
    {
      id: 'p2',
      name: 'Kost Melati Residence'
    },
    {
      id: 'p3',
      name: 'Kost Mawar Residence'
    }
  ];

  categories = [
    'Konstruksi',
    'Renovasi',
    'Furnitur',
    'Pemasangan AC',
    'Peralatan',
    'Perbaikan',
    'Lainnya'
  ];

  investments: Investment[] = [
    {
      id: 'inv1',
      propertyId: 'p1',
      date: '2022-03-15',
      category: 'Konstruksi',
      amount: 120000000,
      description:
        'Biaya pembangunan gedung Kost Griya 21'
    },
    {
      id: 'inv2',
      propertyId: 'p1',
      date: '2022-08-20',
      category: 'Furnitur',
      amount: 24000000,
      description:
        'Pengadaan furnitur kamar (kasur, lemari, meja)'
    },
    {
      id: 'inv3',
      propertyId: 'p1',
      date: '2023-01-10',
      category: 'Pemasangan AC',
      amount: 16000000,
      description:
        'Pemasangan AC untuk 8 kamar Deluxe dan Premium'
    },
    {
      id: 'inv4',
      propertyId: 'p2',
      date: '2021-06-01',
      category: 'Konstruksi',
      amount: 200000000,
      description:
        'Pembangunan gedung Kost Melati Residence'
    },
    {
      id: 'inv5',
      propertyId: 'p2',
      date: '2021-10-15',
      category: 'Furnitur',
      amount: 45000000,
      description:
        'Pengadaan furnitur lengkap'
    },
    {
      id: 'inv6',
      propertyId: 'p3',
      date: '2023-05-01',
      category: 'Konstruksi',
      amount: 180000000,
      description:
        'Pembangunan Kost Mawar Residence'
    }
  ];

  get filteredInvestments(): Investment[] {
    if (!this.propFilter) {
      return this.investments;
    }

    return this.investments.filter(
      investment =>
        investment.propertyId === this.propFilter
    );
  }

  get totalInvestment(): number {
    return this.filteredInvestments.reduce(
      (sum, investment) =>
        sum + investment.amount,
      0
    );
  }

  getPropertyInvestments(
    propertyId: string
  ): Investment[] {
    return this.investments.filter(
      investment =>
        investment.propertyId === propertyId
    );
  }

  getPropertyTotal(
    propertyId: string
  ): number {
    return this.getPropertyInvestments(
      propertyId
    ).reduce(
      (sum, investment) =>
        sum + investment.amount,
      0
    );
  }

  getPropertyName(
    propertyId: string
  ): string {
    const property = this.properties.find(
      item => item.id === propertyId
    );

    return property?.name || '-';
  }

  getCategoryClass(
    category: string
  ): string {

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

  formatRupiah(
    value: number
  ): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(
    date: string
  ): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  }

  openAddModal(): void {
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
  }

  saveInvestment(): void {

    if (
      !this.form.propertyId ||
      !this.form.category ||
      !this.form.date ||
      !this.form.amount
    ) {
      return;
    }

    const newInvestment: Investment = {
      id: `inv${this.investments.length + 1}`,
      propertyId: this.form.propertyId,
      date: this.form.date,
      category: this.form.category,
      amount: Number(this.form.amount),
      description:
        this.form.description || '-'
    };

    this.investments = [
      ...this.investments,
      newInvestment
    ];

    this.showAdd = false;

    alert(
      'Data investasi berhasil ditambahkan!'
    );
  }

  editInvestment(
    investment: Investment
  ): void {
    alert(
      `Edit investasi "${investment.description}"`
    );
  }
}
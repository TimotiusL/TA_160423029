import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';

addIcons({
  searchOutline
});

interface Property {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  propertyId: string;
  category: string;
  date: string;
  amount: number;
  description: string;
}

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './expenses.page.html',
  styleUrls: ['./expenses.page.scss']
})
export class ExpensesPage {

  search = '';
  propFilter = '';
  catFilter = '';

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
    'Listrik',
    'Air',
    'Internet',
    'Perawatan',
    'Kebersihan',
    'Perbaikan',
    'Gaji',
    'Lainnya'
  ];

  expenses: Expense[] = [
    {
      id: 'exp1',
      propertyId: 'p1',
      category: 'Listrik',
      date: '2026-09-01',
      amount: 1200000,
      description: 'Tagihan listrik PLN September 2026'
    },
    {
      id: 'exp2',
      propertyId: 'p1',
      category: 'Internet',
      date: '2026-09-01',
      amount: 450000,
      description: 'Langganan WiFi Indihome September'
    },
    {
      id: 'exp3',
      propertyId: 'p1',
      category: 'Kebersihan',
      date: '2026-09-05',
      amount: 500000,
      description: 'Gaji petugas kebersihan September'
    },
    {
      id: 'exp4',
      propertyId: 'p1',
      category: 'Perawatan',
      date: '2026-09-10',
      amount: 350000,
      description: 'Perbaikan AC kamar 201'
    },
    {
      id: 'exp5',
      propertyId: 'p1',
      category: 'Air',
      date: '2026-09-01',
      amount: 250000,
      description: 'Tagihan air PDAM September'
    },
    {
      id: 'exp6',
      propertyId: 'p2',
      category: 'Listrik',
      date: '2026-09-01',
      amount: 2100000,
      description: 'Tagihan listrik PLN September 2026'
    },
    {
      id: 'exp7',
      propertyId: 'p2',
      category: 'Internet',
      date: '2026-09-01',
      amount: 450000,
      description: 'Langganan WiFi September'
    },
    {
      id: 'exp8',
      propertyId: 'p2',
      category: 'Gaji',
      date: '2026-09-25',
      amount: 3000000,
      description: 'Gaji pengelola Kost Melati September'
    }
  ];

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
        !expense.description
          .toLowerCase()
          .includes(this.search.toLowerCase())
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
    return this.expenses
      .filter(expense =>
        expense.date.startsWith('2026-09')
      )
      .reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
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
    }).format(new Date(date));
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

  saveExpense(): void {
    if (
      !this.form.propertyId ||
      !this.form.category ||
      !this.form.date ||
      !this.form.amount
    ) {
      return;
    }

    const newExpense: Expense = {
      id: `exp${this.expenses.length + 1}`,
      propertyId: this.form.propertyId,
      category: this.form.category,
      date: this.form.date,
      amount: Number(this.form.amount),
      description:
        this.form.description || '-'
    };

    this.expenses = [
      ...this.expenses,
      newExpense
    ];

    this.showAdd = false;

    alert('Pengeluaran berhasil dicatat!');
  }

  editExpense(expense: Expense): void {
    alert(
      `Edit pengeluaran "${expense.description}"`
    );
  }

  deleteExpense(expense: Expense): void {
    const confirmed = confirm(
      `Hapus pengeluaran "${expense.description}"?`
    );

    if (!confirmed) {
      return;
    }

    this.expenses = this.expenses.filter(
      item => item.id !== expense.id
    );
  }
}
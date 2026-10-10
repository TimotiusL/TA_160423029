import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController,
  Filler
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController,
  Filler
);

interface Property {
  id: string;
  name: string;
}

interface PropertyAnalysis {
  id: string;
  name: string;
  income: number;
  expense: number;
  profit: number;
  investment: number;
  occupancy: number;
  profitMargin: number;
  oer: number;
  roi: number;
}

interface Investment {
  id: string;
  propertyId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

@Component({
  selector: 'app-financial-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './financial-analysis.page.html',
  styleUrls: ['./financial-analysis.page.scss']
})
export class FinancialAnalysisPage
  implements AfterViewInit, OnDestroy {

  @ViewChild('financialChart')
  financialChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('profitChart')
  profitChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('expenseChart')
  expenseChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('occupancyChart')
  occupancyChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('comparisonChart')
  comparisonChart!: ElementRef<HTMLCanvasElement>;

  propertyFilter = 'all';
  period = '2026';

  properties: Property[] = [
    {
      id: 'p1',
      name: 'Kost Griya 21'
    },
    {
      id: 'p2',
      name: 'Kost Melati'
    },
    {
      id: 'p3',
      name: 'Kost Mawar'
    }
  ];

  propertyAnalysis: PropertyAnalysis[] = [
    {
      id: 'p1',
      name: 'Kost Griya 21',
      income: 20000000,
      expense: 8000000,
      profit: 12000000,
      investment: 160000000,
      occupancy: 85,
      profitMargin: 60,
      oer: 40,
      roi: 7.5
    },
    {
      id: 'p2',
      name: 'Kost Melati',
      income: 32400000,
      expense: 14580000,
      profit: 17820000,
      investment: 245000000,
      occupancy: 90,
      profitMargin: 55,
      oer: 45,
      roi: 6.8
    },
    {
      id: 'p3',
      name: 'Kost Mawar',
      income: 18700000,
      expense: 8415000,
      profit: 10285000,
      investment: 180000000,
      occupancy: 80,
      profitMargin: 55,
      oer: 45,
      roi: 5.7
    }
  ];

  /*
   * Data sementara untuk tampilan chart.
   * Nanti saat backend sudah terhubung,
   * data ini diganti hasil query database.
   */
  monthlyFinancials = [
    {
      month: 'Jan',
      income: 68000000,
      expense: 27000000,
      profit: 41000000
    },
    {
      month: 'Feb',
      income: 70000000,
      expense: 28500000,
      profit: 41500000
    },
    {
      month: 'Mar',
      income: 71500000,
      expense: 29000000,
      profit: 42500000
    },
    {
      month: 'Apr',
      income: 70500000,
      expense: 28000000,
      profit: 42500000
    },
    {
      month: 'Mei',
      income: 73000000,
      expense: 30000000,
      profit: 43000000
    },
    {
      month: 'Jun',
      income: 74500000,
      expense: 31000000,
      profit: 43500000
    },
    {
      month: 'Jul',
      income: 76000000,
      expense: 31500000,
      profit: 44500000
    },
    {
      month: 'Agu',
      income: 75500000,
      expense: 30500000,
      profit: 45000000
    },
    {
      month: 'Sep',
      income: 76500000,
      expense: 32000000,
      profit: 44500000
    }
  ];

  expenseBreakdown = [
    {
      name: 'Operasional',
      value: 12500000,
      color: '#0D9488'
    },
    {
      name: 'Pemeliharaan',
      value: 8500000,
      color: '#3B82F6'
    },
    {
      name: 'Utilitas',
      value: 6500000,
      color: '#F59E0B'
    },
    {
      name: 'Lainnya',
      value: 3500000,
      color: '#8B5CF6'
    }
  ];

  occupancyTrend = [
    {
      month: 'Jan',
      griya: 78,
      melati: 85,
      mawar: 72
    },
    {
      month: 'Feb',
      griya: 80,
      melati: 87,
      mawar: 74
    },
    {
      month: 'Mar',
      griya: 82,
      melati: 88,
      mawar: 76
    },
    {
      month: 'Apr',
      griya: 81,
      melati: 89,
      mawar: 75
    },
    {
      month: 'Mei',
      griya: 84,
      melati: 90,
      mawar: 78
    },
    {
      month: 'Jun',
      griya: 85,
      melati: 91,
      mawar: 79
    },
    {
      month: 'Jul',
      griya: 86,
      melati: 92,
      mawar: 80
    },
    {
      month: 'Agu',
      griya: 85,
      melati: 91,
      mawar: 81
    },
    {
      month: 'Sep',
      griya: 85,
      melati: 90,
      mawar: 80
    }
  ];

  investments: Investment[] = [
    {
      id: 'inv1',
      propertyId: 'p1',
      date: '2022-03-15',
      category: 'Konstruksi',
      description: 'Pembangunan properti',
      amount: 120000000
    },
    {
      id: 'inv2',
      propertyId: 'p1',
      date: '2022-08-20',
      category: 'Furnitur',
      description: 'Pengadaan furnitur',
      amount: 24000000
    },
    {
      id: 'inv3',
      propertyId: 'p1',
      date: '2023-01-10',
      category: 'Pemasangan AC',
      description: 'Instalasi AC',
      amount: 16000000
    },
    {
      id: 'inv4',
      propertyId: 'p2',
      date: '2021-06-01',
      category: 'Konstruksi',
      description: 'Pembangunan properti',
      amount: 200000000
    },
    {
      id: 'inv5',
      propertyId: 'p2',
      date: '2021-10-15',
      category: 'Furnitur',
      description: 'Pengadaan furnitur',
      amount: 45000000
    },
    {
      id: 'inv6',
      propertyId: 'p3',
      date: '2023-05-01',
      category: 'Konstruksi',
      description: 'Pembangunan properti',
      amount: 180000000
    }
  ];

  financialChartInstance?: Chart;
  profitChartInstance?: Chart;
  expenseChartInstance?: Chart;
  occupancyChartInstance?: Chart;
  comparisonChartInstance?: Chart;

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.createCharts();
    });
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  get selectedProperty(): PropertyAnalysis | null {
    if (this.propertyFilter === 'all') {
      return null;
    }

    return this.propertyAnalysis.find(
      property => property.id === this.propertyFilter
    ) || null;
  }

  get displayData(): PropertyAnalysis[] {
    return this.selectedProperty
      ? [this.selectedProperty]
      : this.propertyAnalysis;
  }

  get totalIncome(): number {
    return this.displayData.reduce(
      (total, property) => total + property.income,
      0
    );
  }

  get totalExpenses(): number {
    return this.displayData.reduce(
      (total, property) => total + property.expense,
      0
    );
  }

  get profit(): number {
    return this.displayData.reduce(
      (total, property) => total + property.profit,
      0
    );
  }

  get totalInvestment(): number {
    return this.displayData.reduce(
      (total, property) => total + property.investment,
      0
    );
  }

  get profitMargin(): number {
    if (this.totalIncome === 0) {
      return 0;
    }

    return Math.round(
      (this.profit / this.totalIncome) * 100
    );
  }

  get oer(): number {
    if (this.totalIncome === 0) {
      return 0;
    }

    return Math.round(
      (this.totalExpenses / this.totalIncome) * 100
    );
  }

  get roi(): string {
    if (this.totalInvestment === 0) {
      return '0.0';
    }

    return (
      (this.profit * 12) /
      this.totalInvestment *
      100
    ).toFixed(1);
  }

  getPropertyInvestments(propertyId: string): Investment[] {
    return this.investments.filter(
      investment => investment.propertyId === propertyId
    );
  }

  getInvestmentTotal(propertyId: string): number {
    return this.getPropertyInvestments(propertyId)
      .reduce(
        (total, investment) => total + investment.amount,
        0
      );
  }

  getPropertyAnalysis(propertyId: string): PropertyAnalysis | undefined {
    return this.propertyAnalysis.find(
      property => property.id === propertyId
    );
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  calculateBep(roi: number): number {
    return Math.round(100 / (roi || 1));
  }

  formatShortRupiah(value: number): string {
    if (value >= 1000000) {
      return `${value / 1000000}jt`;
    }

    return `${value}`;
  }

  getPropertyName(): string {
    if (this.propertyFilter === 'all') {
      return 'Semua Properti';
    }

    return this.selectedProperty?.name || '-';
  }

  changeProperty(): void {
    this.createCharts();
  }

  changePeriod(): void {
    this.createCharts();
  }

  printAnalysis(): void {
    window.print();
  }

  exportReport(): void {
    window.print();
  }

  private destroyCharts(): void {
    this.financialChartInstance?.destroy();
    this.profitChartInstance?.destroy();
    this.expenseChartInstance?.destroy();
    this.occupancyChartInstance?.destroy();
    this.comparisonChartInstance?.destroy();
  }

  private createCharts(): void {
    if (
      !this.financialChart ||
      !this.profitChart ||
      !this.expenseChart ||
      !this.occupancyChart ||
      !this.comparisonChart
    ) {
      return;
    }

    this.destroyCharts();

    this.createFinancialChart();
    this.createProfitChart();
    this.createExpenseChart();
    this.createOccupancyChart();
    this.createComparisonChart();
  }

  private baseOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            font: {
              size: 12
            },
            color: '#64748B'
          }
        },
        tooltip: {
          backgroundColor: '#0F172A',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#94A3B8',
            font: {
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: '#F1F5F9',
            borderDash: [3, 3]
          },
          ticks: {
            color: '#94A3B8',
            font: {
              size: 10
            }
          }
        }
      }
    };
  }

  private createFinancialChart(): void {
    this.financialChartInstance = new Chart(
      this.financialChart.nativeElement,
      {
        type: 'bar',
        data: {
          labels: this.monthlyFinancials.map(
            item => item.month
          ),
          datasets: [
            {
              label: 'Pendapatan',
              data: this.monthlyFinancials.map(
                item => item.income
              ),
              backgroundColor: '#0D9488',
              borderRadius: 4
            },
            {
              label: 'Pengeluaran',
              data: this.monthlyFinancials.map(
                item => item.expense
              ),
              backgroundColor: '#F59E0B',
              borderRadius: 4
            }
          ]
        },
        options: {
          ...this.baseOptions(),
          scales: {
            ...this.baseOptions().scales,
            y: {
              ...this.baseOptions().scales.y,
              ticks: {
                ...this.baseOptions().scales.y.ticks,
                callback: (value: string | number) =>
                  `${Number(value) / 1000000}jt`
              }
            }
          }
        }
      }
    );
  }

  private createProfitChart(): void {
    this.profitChartInstance = new Chart(
      this.profitChart.nativeElement,
      {
        type: 'line',
        data: {
          labels: this.monthlyFinancials.map(
            item => item.month
          ),
          datasets: [
            {
              label: 'Laba',
              data: this.monthlyFinancials.map(
                item => item.profit
              ),
              borderColor: '#0D9488',
              backgroundColor: 'rgba(13,148,136,0.15)',
              borderWidth: 2.5,
              pointRadius: 4,
              pointBackgroundColor: '#0D9488',
              fill: true,
              tension: 0.35
            }
          ]
        },
        options: {
          ...this.baseOptions(),
          plugins: {
            ...this.baseOptions().plugins,
            legend: {
              display: false
            }
          },
          scales: {
            ...this.baseOptions().scales,
            y: {
              ...this.baseOptions().scales.y,
              ticks: {
                ...this.baseOptions().scales.y.ticks,
                callback: (value: string | number) =>
                  `${Number(value) / 1000000}jt`
              }
            }
          }
        }
      }
    );
  }

  private createExpenseChart(): void {
    this.expenseChartInstance = new Chart(
      this.expenseChart.nativeElement,
      {
        type: 'doughnut',
        data: {
          labels: this.expenseBreakdown.map(
            item => item.name
          ),
          datasets: [
            {
              data: this.expenseBreakdown.map(
                item => item.value
              ),
              backgroundColor: this.expenseBreakdown.map(
                item => item.color
              ),
              borderWidth: 2,
              borderColor: '#FFFFFF'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '55%',
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: '#0F172A',
              callbacks: {
                label: context =>
                  ` ${this.formatRupiah(
                    Number(context.raw)
                  )}`
              }
            }
          }
        }
      }
    );
  }

  private createOccupancyChart(): void {
    this.occupancyChartInstance = new Chart(
      this.occupancyChart.nativeElement,
      {
        type: 'line',
        data: {
          labels: this.occupancyTrend.map(
            item => item.month
          ),
          datasets: [
            {
              label: 'Kost Griya 21',
              data: this.occupancyTrend.map(
                item => item.griya
              ),
              borderColor: '#0D9488',
              backgroundColor: 'rgba(13,148,136,0.08)',
              borderWidth: 2,
              fill: true,
              tension: 0.35
            },
            {
              label: 'Kost Melati',
              data: this.occupancyTrend.map(
                item => item.melati
              ),
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59,130,246,0.08)',
              borderWidth: 2,
              fill: true,
              tension: 0.35
            },
            {
              label: 'Kost Mawar',
              data: this.occupancyTrend.map(
                item => item.mawar
              ),
              borderColor: '#F59E0B',
              backgroundColor: 'rgba(245,158,11,0.08)',
              borderWidth: 2,
              fill: true,
              tension: 0.35
            }
          ]
        },
        options: {
          ...this.baseOptions(),
          scales: {
            ...this.baseOptions().scales,
            y: {
              ...this.baseOptions().scales.y,
              min: 50,
              max: 100,
              ticks: {
                ...this.baseOptions().scales.y.ticks,
                callback: (value: string | number) =>
                  `${value}%`
              }
            }
          }
        }
      }
    );
  }

  private createComparisonChart(): void {
    this.comparisonChartInstance = new Chart(
      this.comparisonChart.nativeElement,
      {
        type: 'bar',
        data: {
          labels: this.propertyAnalysis.map(
            item => item.name.replace('Kost ', '')
          ),
          datasets: [
            {
              label: 'Profit Margin',
              data: this.propertyAnalysis.map(
                item => item.profitMargin
              ),
              backgroundColor: '#0D9488',
              borderRadius: 4
            },
            {
              label: 'OER',
              data: this.propertyAnalysis.map(
                item => item.oer
              ),
              backgroundColor: '#F59E0B',
              borderRadius: 4
            },
            {
              label: 'ROI',
              data: this.propertyAnalysis.map(
                item => item.roi
              ),
              backgroundColor: '#3B82F6',
              borderRadius: 4
            }
          ]
        },
        options: {
          ...this.baseOptions(),
          scales: {
            ...this.baseOptions().scales,
            y: {
              ...this.baseOptions().scales.y,
              beginAtZero: true,
              ticks: {
                ...this.baseOptions().scales.y.ticks,
                callback: (value: string | number) =>
                  `${value}%`
              }
            }
          }
        }
      }
    );
  }
}
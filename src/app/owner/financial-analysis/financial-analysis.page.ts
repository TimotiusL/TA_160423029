import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api';
import {
  Chart, BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale,
  Tooltip, Legend, ArcElement, DoughnutController, Filler
} from 'chart.js';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale,
  Tooltip, Legend, ArcElement, DoughnutController, Filler);

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
  implements OnInit, AfterViewInit, OnDestroy {

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) { }

  loading = false;
  loadError = '';

  @ViewChild('financialChart')
  financialChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('profitChart')
  profitChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('expenseChart')
  expenseChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('incomeChart')
  incomeChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('comparisonChart')
  comparisonChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('incomeTrendChart')
  incomeTrendChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('expenseTrendChart')
  expenseTrendChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('marginChart')
  marginChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('oerChart')
  oerChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('roiChart')
  roiChart!: ElementRef<HTMLCanvasElement>;


  grafikBulanan: any[] = [];
  rincianPendapatan: any[] = [];
  rincianPengeluaran: any[] = [];

  hunian = {
    total_kamar: 0,
    kamar_terisi: 0,
    persentase: 0
  };

  propertyFilter = 'all';

  year = 2026;
  month = 0;

  availableYears = [2025, 2026];
  selectedYear = 2026;
  selectedMonth = 'all';

  years = [2025, 2026, 2027];

  months = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  properties: Property[] = [];

  propertyAnalysis: PropertyAnalysis[] = [];

  monthlyFinancials: {
    month: string;
    income: number;
    expense: number;
    profit: number;
  }[] = [];

  incomeBreakdown: { name: string; value: number; color: string }[] = [];

  expenseBreakdown: { name: string; value: number; color: string }[] = [];

  investments: Investment[] = [];

  financialChartInstance?: Chart;
  profitChartInstance?: Chart;
  expenseChartInstance?: Chart;
  incomeChartInstance?: Chart;
  comparisonChartInstance?: Chart;
  incomeTrendChartInstance?: Chart;
  expenseTrendChartInstance?: Chart;
  marginChartInstance?: Chart;
  oerChartInstance?: Chart;
  roiChartInstance?: Chart;


  ngOnInit(): void {
    this.loadProperties();
    this.loadInvestments();
  }

  private loadProperties(): void {
    this.api.getKos().subscribe({
      next: (data: any[]) => {
        this.properties = data.map(kos => ({
          id: String(kos.id_kos),
          name: kos.nama_kos
        }));

        this.loadFinancialAnalysis();
      },
      error: error => {
        console.error('Gagal mengambil daftar kos:', error);
        this.loadError = 'Gagal mengambil daftar properti.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadInvestments(): void {
    this.api.getInvestasi().subscribe({
      next: (data: any[]) => {
        this.investments = data.map(item => ({
          id: String(item.id_investasi),
          propertyId: String(item.tKos_id_kos),
          date: String(item.tgl_masuk).substring(0, 10),
          category: item.kategori,
          description: item.deskripsi,
          amount: Number(item.jumlah)
        }));
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Gagal mengambil data investasi:', error);
      }
    });
  }

  private getPeriodDates(): { start: string; end: string } {
    const year = this.year;

    if (this.month === 0) {
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`
      };
    }

    const lastDay = new Date(year, this.month, 0).getDate();
    const month = String(this.month).padStart(2, '0');

    return {
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${lastDay}`
    };
  }

  private loadFinancialAnalysis(): void {
    if (!this.properties.length) {
      this.propertyAnalysis = [];
      this.updateChartData();
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.loadError = '';
    const dates = this.getPeriodDates();

    const selectedProperties = this.propertyFilter === 'all'
      ? this.properties
      : this.properties.filter(property => property.id === this.propertyFilter);

    if (!selectedProperties.length) {
      this.loading = false;
      this.propertyAnalysis = [];
      this.updateChartData();
      this.cdr.detectChanges();
      return;
    }

    forkJoin(
      selectedProperties.map(property =>
        this.api.getAnalisisKeuangan(
          Number(property.id),
          dates.start,
          dates.end
        )
      )
    ).subscribe({
      next: (results: any[]) => {
        this.propertyAnalysis = results.map((result, index) => {
          const property = selectedProperties[index];

          return {
            id: property.id,
            name: property.name,
            income: Number(result.total_pendapatan || 0),
            expense: Number(result.total_pengeluaran || 0),
            profit: Number(result.laba || 0),
            investment: Number(result.total_investasi || 0),
            profitMargin: Number(result.profit_margin || 0),
            oer: Number(result.oer || 0),
            roi: Number(result.roi || 0)
          };
        });

        // Gabungkan rincian semua kos yang sedang dipilih agar grafik
        // "Semua Kos" tidak hanya menampilkan data kos pertama.
        const monthlyMap = new Map<number, any>();
        results.forEach(result => {
          (result.grafik_bulanan ?? []).forEach((item: any) => {
            const monthNumber = Number(item.bulan);
            const current = monthlyMap.get(monthNumber) ?? {
              bulan: monthNumber,
              label: item.label,
              pendapatan: 0,
              pengeluaran: 0,
              laba: 0
            };
            current.pendapatan += Number(item.pendapatan || 0);
            current.pengeluaran += Number(item.pengeluaran || 0);
            current.laba = current.pendapatan - current.pengeluaran;
            monthlyMap.set(monthNumber, current);
          });
        });
        this.grafikBulanan = Array.from(monthlyMap.values())
          .sort((a, b) => a.bulan - b.bulan);

        const combineBreakdown = (key: 'rincian_pendapatan' | 'rincian_pengeluaran') => {
          const totals = new Map<string, number>();
          results.forEach(result => {
            (result[key] ?? []).forEach((item: any) => {
              const name = String(item.kategori || 'Tanpa catatan');
              totals.set(name, (totals.get(name) || 0) + Number(item.total || 0));
            });
          });
          return Array.from(totals.entries())
            .map(([kategori, total]) => ({ kategori, total }))
            .sort((a, b) => b.total - a.total);
        };

        this.rincianPendapatan = combineBreakdown('rincian_pendapatan');
        this.rincianPengeluaran = combineBreakdown('rincian_pengeluaran');

        this.hunian = results[0]?.hunian ?? {
          total_kamar: 0,
          kamar_terisi: 0,
          persentase: 0
        };

        this.loading = false;
        this.updateChartData();
        this.cdr.detectChanges();

        setTimeout(() => {
          this.createCharts();
        }, 300);
      },
      error: error => {
        console.error('Gagal mengambil analisis keuangan:', error);
        this.loading = false;
        this.loadError = error.error?.message || 'Gagal mengambil data analisis keuangan.';
        this.cdr.detectChanges();
      }
    });
  }

  private updateChartData(): void {
    this.monthlyFinancials = this.grafikBulanan.map(item => ({
      month: item.label,
      income: Number(item.pendapatan),
      expense: Number(item.pengeluaran),
      profit: Number(item.laba)
    }));

    const colors = [
      '#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B',
      '#EF4444', '#64748B', '#14B8A6', '#EC4899'
    ];

    this.incomeBreakdown = this.rincianPendapatan.map((item, index) => ({
      name: item.kategori,
      value: Number(item.total),
      color: colors[index % colors.length]
    }));

    this.expenseBreakdown = this.rincianPengeluaran.map((item, index) => ({
      name: item.kategori,
      value: Number(item.total),
      color: colors[(index + 3) % colors.length]
    }));
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.createCharts();
    }, 300);
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
      (this.profit / this.totalInvestment) * 100
    ).toFixed(2);
  }


  get averageMonthlyProfit(): number {
    if (!this.monthlyFinancials.length) return 0;
    return this.monthlyFinancials.reduce((sum, item) => sum + item.profit, 0)
      / this.monthlyFinancials.length;
  }

  get bestProfitMonth(): { month: string; profit: number } | null {
    if (!this.monthlyFinancials.length) return null;
    return this.monthlyFinancials.reduce((best, item) =>
      item.profit > best.profit ? item : best
    );
  }

  get positiveProfitMonths(): number {
    return this.monthlyFinancials.filter(item => item.profit > 0).length;
  }

  get incomeBreakdownTotal(): number {
    return this.incomeBreakdown.reduce((sum, item) => sum + item.value, 0);
  }

  get expenseBreakdownTotal(): number {
    return this.expenseBreakdown.reduce((sum, item) => sum + item.value, 0);
  }

  get averageProfitMargin(): number {
    const values = this.monthlyRatios.map(item => item.profitMargin);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  get averageOer(): number {
    const values = this.monthlyRatios.map(item => item.oer);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  get averageRoi(): number {
    const values = this.monthlyRatios.map(item => item.roi);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  get monthlyRatios() {
    return this.monthlyFinancials.map(item => {
      const investment = this.totalInvestment;

      return {
        month: item.month,
        profitMargin: item.income !== 0
          ? (item.profit / item.income) * 100
          : 0,
        oer: item.income !== 0
          ? (item.expense / item.income) * 100
          : 0,
        roi: investment !== 0
          ? (item.profit / investment) * 100
          : 0
      };
    });
  }


  private createTrendChart(
    canvas: ElementRef<HTMLCanvasElement>,
    label: string,
    values: number[],
    color: string,
    percentage = false
  ): Chart {
    return new Chart(canvas.nativeElement, {
      type: 'line',
      data: {
        labels: this.monthlyFinancials.map(item => item.month),
        datasets: [{
          label,
          data: values,
          borderColor: color,
          backgroundColor: `${color}20`,
          borderWidth: 2.5,
          pointRadius: 3,
          fill: true,
          tension: 0.35
        }]
      },
      options: {
        ...this.baseOptions(),
        plugins: {
          ...this.baseOptions().plugins,
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => percentage
                ? `${label}: ${Number(context.raw).toFixed(2)}%`
                : `${label}: ${this.formatRupiah(Number(context.raw))}`
            }
          }
        },
        scales: {
          ...this.baseOptions().scales,
          y: {
            ...this.baseOptions().scales.y,
            ticks: {
              ...this.baseOptions().scales.y.ticks,
              callback: (value: string | number) => percentage
                ? `${value}%`
                : `${Number(value) / 1000000}jt`
            }
          }
        }
      }
    });
  }

  private createTrendCharts(): void {
    const ratios = this.monthlyRatios;

    this.incomeTrendChartInstance = this.createTrendChart(
      this.incomeTrendChart,
      'Pendapatan',
      this.monthlyFinancials.map(item => item.income),
      '#0D9488'
    );

    this.expenseTrendChartInstance = this.createTrendChart(
      this.expenseTrendChart,
      'Pengeluaran',
      this.monthlyFinancials.map(item => item.expense),
      '#F59E0B'
    );

    this.profitChartInstance = this.createTrendChart(
      this.profitChart,
      'Laba Bersih',
      this.monthlyFinancials.map(item => item.profit),
      '#3B82F6'
    );

    this.marginChartInstance = this.createTrendChart(
      this.marginChart,
      'Profit Margin',
      ratios.map(item => item.profitMargin),
      '#8B5CF6',
      true
    );

    this.oerChartInstance = this.createTrendChart(
      this.oerChart,
      'OER',
      ratios.map(item => item.oer),
      '#F59E0B',
      true
    );

    this.roiChartInstance = this.createTrendChart(
      this.roiChart,
      'ROI',
      ratios.map(item => item.roi),
      '#0D9488',
      true
    );
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
    this.loadFinancialAnalysis();
  }

  changePeriod(): void {
    this.loadFinancialAnalysis();
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
    this.incomeChartInstance?.destroy();
    this.comparisonChartInstance?.destroy();
    this.incomeTrendChartInstance?.destroy();
    this.expenseTrendChartInstance?.destroy();
    this.marginChartInstance?.destroy();
    this.oerChartInstance?.destroy();
    this.roiChartInstance?.destroy();

  }


  private createCharts(): void {
    if (
      !this.incomeTrendChart ||
      !this.expenseTrendChart ||
      !this.profitChart ||
      !this.marginChart ||
      !this.oerChart ||
      !this.roiChart ||
      !this.comparisonChart ||
      !this.incomeChart ||
      !this.expenseChart
    ) {
      return;
    }

    this.destroyCharts();
    this.createTrendCharts();
    this.createIncomeChart();
    this.createExpenseChart();
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

  private createIncomeChart(): void {
    this.incomeChartInstance = new Chart(this.incomeChart.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.incomeBreakdown.map(item => item.name),
        datasets: [{
          data: this.incomeBreakdown.map(item => item.value),
          backgroundColor: this.incomeBreakdown.map(item => item.color),
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          ...this.baseOptions().plugins,
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => ` ${this.formatRupiah(Number(context.raw))}`
            }
          }
        }
      }
    });
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


  private createComparisonChart(): void {
    this.comparisonChartInstance = new Chart(
      this.comparisonChart.nativeElement,
      {
        type: 'bar',
        data: {
          labels: this.propertyAnalysis.map(item => item.name),
          datasets: [
            {
              label: 'Pendapatan',
              data: this.propertyAnalysis.map(item => item.income),
              backgroundColor: '#0D9488',
              borderRadius: 4
            },
            {
              label: 'Pengeluaran',
              data: this.propertyAnalysis.map(item => item.expense),
              backgroundColor: '#F59E0B',
              borderRadius: 4
            },
            {
              label: 'Laba Bersih',
              data: this.propertyAnalysis.map(item => item.profit),
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
}
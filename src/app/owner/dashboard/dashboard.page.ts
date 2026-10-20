import {
  AfterViewInit,
  Component,
  ChangeDetectorRef,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { ApiService } from '../../services/api';

Chart.register(
  BarController, BarElement, LineController, LineElement, PointElement,
  DoughnutController, ArcElement, CategoryScale, LinearScale, Tooltip,
  Legend, Filler
);

interface Property {
  id: string;
  name: string;
  address: string;
  totalRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  availableRooms: number;
  tenantCount: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

interface Payment {
  id: string;
  tenant: string;
  room: string;
  period: string;
  amount: number;
}

interface Bill {
  number: string;
  tenant: string;
  room: string;
  period: string;
  dueDate: string;
  total: number;
  status: string;
}

interface Activity {
  icon: string;
  text: string;
  time: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DashboardPage implements AfterViewInit, OnDestroy {
  @ViewChild('roomStatusChart') roomStatusChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('financialChart') financialChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('profitChart') profitChart!: ElementRef<HTMLCanvasElement>;

  roomStatusChartInstance?: Chart;
  financialChartInstance?: Chart;
  profitChartInstance?: Chart;

  month = this.getCurrentMonthLabel();
  user = { name: 'Pengguna' };

  properties: Property[] = [];
  monthlyFinancials: { month: string; income: number; expense: number }[] = [];
  pendingPayments: Payment[] = [];
  recentActivity: Activity[] = [];
  overdueBills: Bill[] = [];

  loading = false;
  errorMessage = '';

  private viewReady = false;

  constructor(
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        this.user.name = parsed.nama || parsed.name || 'Pengguna';
      } catch {
        this.user.name = 'Pengguna';
      }
    }
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  ionViewWillEnter(): void {
    // Jika view sudah siap, refresh setiap kali dashboard dibuka.
    if (this.viewReady) {
      this.loadDashboard();
    }
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    forkJoin({
      kos: this.api.getKos(),
      kamar: this.api.getKamar(),
      penghuni: this.api.getPenghuni(),
      pembayaran: this.api.getPembayaran(),
      tagihan: this.api.getTagihan(),
      pemasukan: this.api.getPemasukan(),
      pengeluaran: this.api.getPengeluaran(),
      pendaftaran: this.api.getPendaftaran(),
      kontrak: this.api.getKontrak(),
      komplain: this.api.getKomplain()
    }).subscribe({
      next: (result: any) => {
        const kos = this.toArray(result.kos);
        const kamar = this.toArray(result.kamar);
        const penghuni = this.toArray(result.penghuni);
        const pembayaran = this.toArray(result.pembayaran);
        const tagihan = this.toArray(result.tagihan);
        const pemasukan = this.toArray(result.pemasukan);
        const pengeluaran = this.toArray(result.pengeluaran);
        const pendaftaran = this.toArray(result.pendaftaran);
        const kontrak = this.toArray(result.kontrak);
        const komplain = this.toArray(result.komplain);

        this.properties = kos.map((item: any) => {
          // Endpoint /kos sudah mengembalikan ringkasan tiap kos.
          const roomsForKos = kamar.filter((room: any) =>
            Number(room.tKos_id_kos) === Number(item.id_kos)
          );

          return {
            id: String(item.id_kos),
            name: item.nama_kos || 'Kos tanpa nama',
            address: item.alamat || '-',
            totalRooms: this.number(item.totalRooms ?? roomsForKos.length),
            occupiedRooms: this.number(
              item.occupiedRooms ??
              roomsForKos.filter((room: any) => room.status === 'terisi').length
            ),
            reservedRooms: this.number(
              item.reservedRooms ??
              roomsForKos.filter((room: any) => room.status === 'dipesan').length
            ),
            availableRooms: this.number(
              item.availableRooms ??
              roomsForKos.filter((room: any) => room.status === 'tersedia').length
            ),
            tenantCount: this.number(item.tenantCount),
            monthlyIncome: this.number(item.monthlyIncome),
            monthlyExpense: this.number(item.monthlyExpense)
          };
        });

        this.pendingPayments = pembayaran
          .filter((item: any) => item.status === 'menunggu_verifikasi')
          .map((item: any) => {
            const tagihanItem = item.tagihan || {};
            const kontrakItem = tagihanItem.kontrak || {};
            const penghuniItem = kontrakItem.penghuni || {};
            const userItem = penghuniItem.user || {};
            const kamarItem = kontrakItem.kamar || {};

            return {
              id: String(item.id_pembayaran),
              tenant: userItem.nama || 'Penghuni',
              room: String(kamarItem.no_kamar ?? '-'),
              period: tagihanItem.periode || '-',
              amount: this.number(item.total)
            };
          });

        this.overdueBills = tagihan
          .filter((item: any) =>
            item.status === 'belum_lunas' &&
            item.tgl_jatuhTempo &&
            new Date(item.tgl_jatuhTempo) < new Date()
          )
          .map((item: any) => {
            const kontrakItem = item.kontrak || {};
            const penghuniItem = kontrakItem.penghuni || {};
            const userItem = penghuniItem.user || {};
            const kamarItem = kontrakItem.kamar || {};

            return {
              number: item.kode_tagihan || `INV-${item.id_tagihan}`,
              tenant: userItem.nama || 'Penghuni',
              room: String(kamarItem.no_kamar ?? '-'),
              period: item.periode || '-',
              dueDate: item.tgl_jatuhTempo,
              total: this.number(item.total_tagihan),
              status: 'TERLAMBAT'
            };
          });

        this.monthlyFinancials = this.buildMonthlyFinancials(pemasukan, pengeluaran);
        this.recentActivity = this.buildRecentActivities(
          pendaftaran, pembayaran, komplain, kontrak
        );

        this.loading = false;
        this.cdr.detectChanges();
        this.refreshCharts();
      },
      error: (error: any) => {
        console.error('Gagal memuat dashboard:', error);
        this.errorMessage =
          'Sebagian data dashboard gagal dimuat. Periksa API Laravel dan Console browser.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get totalRooms(): number {
    return this.properties.reduce((sum, item) => sum + item.totalRooms, 0);
  }

  get totalOccupied(): number {
    return this.properties.reduce((sum, item) => sum + item.occupiedRooms, 0);
  }

  get totalReserved(): number {
    return this.properties.reduce((sum, item) => sum + item.reservedRooms, 0);
  }

  get totalAvailable(): number {
    return this.properties.reduce((sum, item) => sum + item.availableRooms, 0);
  }

  get totalTenants(): number {
    return this.properties.reduce((sum, item) => sum + item.tenantCount, 0);
  }

  get totalIncome(): number {
    const current = this.monthlyFinancials.find(
      item => item.month === this.getCurrentMonthShort()
    );
    return current ? current.income : this.properties.reduce(
      (sum, item) => sum + item.monthlyIncome, 0
    );
  }

  get totalExpense(): number {
    const current = this.monthlyFinancials.find(
      item => item.month === this.getCurrentMonthShort()
    );
    return current ? current.expense : this.properties.reduce(
      (sum, item) => sum + item.monthlyExpense, 0
    );
  }

  get totalProfit(): number {
    return this.totalIncome - this.totalExpense;
  }

  get occupancyPercentage(): number {
    return this.totalRooms === 0 ? 0 :
      Math.round((this.totalOccupied / this.totalRooms) * 100);
  }

  get profitMargin(): number {
    return this.totalIncome === 0 ? 0 :
      Math.round((this.totalProfit / this.totalIncome) * 100);
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(date: string): string {
    if (!date) return '-';
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  }

  getOccupancy(property: Property): number {
    return property.totalRooms === 0 ? 0 :
      Math.round((property.occupiedRooms / property.totalRooms) * 100);
  }

  getProfit(property: Property): number {
    return property.monthlyIncome - property.monthlyExpense;
  }

  navigate(page: string): void {
    const allowedPages = ['properties', 'payments', 'billing'];

    if (!allowedPages.includes(page)) {
      console.error('Halaman tidak dikenal:', page);
      return;
    }

    this.router.navigate(['/owner', page]);
  }

  verifyPayment(payment: Payment): void {
    this.api.verifikasiPembayaran(Number(payment.id), 'diverifikasi').subscribe({
      next: () => this.loadDashboard(),
      error: error => {
        console.error('Gagal memverifikasi pembayaran:', error);
        alert('Pembayaran gagal diverifikasi.');
      }
    });
  }

  rejectPayment(payment: Payment): void {
    this.api.verifikasiPembayaran(
      Number(payment.id), 'ditolak', 'Pembayaran ditolak melalui dashboard'
    ).subscribe({
      next: () => this.loadDashboard(),
      error: error => {
        console.error('Gagal menolak pembayaran:', error);
        alert('Pembayaran gagal ditolak.');
      }
    });
  }

  private toArray(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    return [];
  }

  private number(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private buildMonthlyFinancials(
    pemasukan: any[],
    pengeluaran: any[]
  ): { month: string; income: number; expense: number }[] {
    const now = new Date();
    const result: { month: string; income: number; expense: number }[] = [];

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const label = new Intl.DateTimeFormat('id-ID', { month: 'short' })
        .format(date);

      const income = pemasukan
        .filter(item => this.sameMonth(item.tgl_pemasukan, year, monthIndex))
        .reduce((sum, item) => sum + this.number(item.jumlah), 0);

      const expense = pengeluaran
        .filter(item => this.sameMonth(item.tgl_pengeluaran, year, monthIndex))
        .reduce((sum, item) => sum + this.number(item.jumlah), 0);

      result.push({ month: label, income, expense });
    }

    return result;
  }

  private sameMonth(value: string, year: number, monthIndex: number): boolean {
    if (!value) return false;
    const date = new Date(value.replace(' ', 'T'));
    return !isNaN(date.getTime()) &&
      date.getFullYear() === year &&
      date.getMonth() === monthIndex;
  }

  private buildRecentActivities(
    pendaftaran: any[],
    pembayaran: any[],
    komplain: any[],
    kontrak: any[]
  ): Activity[] {
    const activities: (Activity & { sortDate: number })[] = [];

    pendaftaran.forEach(item => {
      const date = item.tgl_pendaftaran;
      const nama = item.user?.nama ||
        item.penghuni?.user?.nama || 'Calon penghuni';
      const kamar = item.kamar?.no_kamar ?? item.tKamar_id_kamar ?? '-';
      activities.push({
        icon: 'clipboard-outline',
        text: `${nama} mengajukan pendaftaran kamar ${kamar}`,
        time: this.relativeTime(date),
        sortDate: this.timestamp(date)
      });
    });

    pembayaran.forEach(item => {
      const date = item.tgl_pembayaran;
      const nama = item.tagihan?.kontrak?.penghuni?.user?.nama || 'Penghuni';
      activities.push({
        icon: item.status === 'diverifikasi'
          ? 'checkmark-circle-outline' : 'card-outline',
        text: `${nama} melakukan pembayaran ${this.formatRupiah(this.number(item.total))} (${this.statusLabel(item.status)})`,
        time: this.relativeTime(date),
        sortDate: this.timestamp(date)
      });
    });

    komplain.forEach(item => {
      const date = item.tgl_komplain;
      const nama = item.penghuni?.user?.nama || 'Penghuni';
      activities.push({
        icon: 'chatbubble-ellipses-outline',
        text: `${nama} mengajukan komplain: ${item.judul || item.deskripsi || '-'}`,
        time: this.relativeTime(date),
        sortDate: this.timestamp(date)
      });
    });

    kontrak.forEach(item => {
      const date = item.created_at || item.tgl_mulai;
      const nama = item.penghuni?.user?.nama || 'Penghuni';
      activities.push({
        icon: 'reader-outline',
        text: `Kontrak ${nama} ${item.no_kontrak || ''} (${item.status || 'tercatat'})`,
        time: this.relativeTime(date),
        sortDate: this.timestamp(date)
      });
    });

    return activities
      .sort((a, b) => b.sortDate - a.sortDate)
      .slice(0, 5)
      .map(({ icon, text, time }) => ({ icon, text, time }));
  }

  private timestamp(value: string): number {
    if (!value) return 0;
    const date = new Date(value.replace(' ', 'T'));
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private relativeTime(value: string): string {
    const timestamp = this.timestamp(value);
    if (!timestamp) return '-';
    const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari lalu`;
    return this.formatDate(value);
  }

  private statusLabel(status: string): string {
    const labels: Record<string, string> = {
      menunggu_verifikasi: 'menunggu verifikasi',
      diverifikasi: 'diverifikasi',
      ditolak: 'ditolak'
    };
    return labels[status] || status || 'tercatat';
  }

  private getCurrentMonthLabel(): string {
    return new Intl.DateTimeFormat('id-ID', {
      month: 'long', year: 'numeric'
    }).format(new Date());
  }

  private getCurrentMonthShort(): string {
    return new Intl.DateTimeFormat('id-ID', { month: 'short' })
      .format(new Date());
  }

  private refreshCharts(): void {
    if (!this.viewReady) return;
    setTimeout(() => this.createCharts());
  }

  private destroyCharts(): void {
    this.roomStatusChartInstance?.destroy();
    this.financialChartInstance?.destroy();
    this.profitChartInstance?.destroy();
  }

  private createCharts(): void {
    if (!this.roomStatusChart || !this.financialChart || !this.profitChart) return;
    this.destroyCharts();
    this.createRoomStatusChart();
    this.createFinancialChart();
    this.createProfitChart();
  }

  private createRoomStatusChart(): void {
    this.roomStatusChartInstance = new Chart(this.roomStatusChart.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Terisi', 'Dipesan', 'Tersedia'],
        datasets: [{
          data: [this.totalOccupied, this.totalReserved, this.totalAvailable],
          backgroundColor: ['#0D9488', '#F59E0B', '#E2E8F0'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            callbacks: {
              label: context => ` ${Number(context.raw)} kamar`
            }
          }
        }
      }
    });
  }

  private createFinancialChart(): void {
    this.financialChartInstance = new Chart(this.financialChart.nativeElement, {
      type: 'bar',
      data: {
        labels: this.monthlyFinancials.map(item => item.month),
        datasets: [
          {
            label: 'Pendapatan',
            data: this.monthlyFinancials.map(item => item.income),
            backgroundColor: '#0D9488',
            borderRadius: 4,
            barPercentage: 0.65
          },
          {
            label: 'Pengeluaran',
            data: this.monthlyFinancials.map(item => item.expense),
            backgroundColor: '#F59E0B',
            borderRadius: 4,
            barPercentage: 0.65
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            callbacks: {
              label: context => ` ${this.formatRupiah(Number(context.raw))}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: '#F1F5F9' },
            ticks: {
              color: '#94A3B8',
              font: { size: 10 },
              callback: value => `${Number(value) / 1000000}jt`
            }
          }
        }
      }
    });
  }

  private createProfitChart(): void {
    this.profitChartInstance = new Chart(this.profitChart.nativeElement, {
      type: 'line',
      data: {
        labels: this.monthlyFinancials.map(item => item.month),
        datasets: [{
          label: 'Laba Bersih',
          data: this.monthlyFinancials.map(item => item.income - item.expense),
          borderColor: '#0D9488',
          backgroundColor: 'rgba(13,148,136,0.15)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#0D9488',
          pointBorderWidth: 0,
          fill: true,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            callbacks: {
              label: context => ` ${this.formatRupiah(Number(context.raw))}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: '#F1F5F9' },
            ticks: {
              color: '#94A3B8',
              font: { size: 10 },
              callback: value => `${Number(value) / 1000000}jt`
            }
          }
        }
      }
    });
  }
}

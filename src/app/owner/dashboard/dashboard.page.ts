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
  kosId?: string;
}

interface Bill {
  number: string;
  tenant: string;
  room: string;
  period: string;
  dueDate: string;
  total: number;
  status: string;
  kosId?: string;
}

interface Activity {
  icon: string;
  text: string;
  time: string;
  kosId?: string;
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

  month = this.getCurrentMonthValue();
  monthOptions: { value: string; label: string }[] = [];
  selectedKosId = 'all';
  user = { name: 'Pengguna' };

  properties: Property[] = [];
  monthlyFinancials: { month: string; income: number; expense: number }[] = [];
  pendingPayments: Payment[] = [];
  recentActivity: Activity[] = [];
  overdueBills: Bill[] = [];

  private pemasukanData: any[] = [];
  private pengeluaranData: any[] = [];

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

        this.pemasukanData = pemasukan;
        this.pengeluaranData = pengeluaran;
        this.monthOptions = this.buildPeriodOptions(pemasukan, pengeluaran);

        if (!this.monthOptions.some(option => option.value === this.month)) {
          this.month = this.getCurrentMonthValue();
        }

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
              amount: this.number(item.total),
              kosId: String(
                kamarItem.tKos_id_kos ?? kamarItem.kos?.id_kos ?? ''
              )
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
              status: 'TERLAMBAT',
              kosId: String(
                kamarItem.tKos_id_kos ?? kamarItem.kos?.id_kos ?? ''
              )
            };
          });

        this.monthlyFinancials = this.buildMonthlyFinancials(
          this.recordsForSelectedKos(pemasukan),
          this.recordsForSelectedKos(pengeluaran)
        );
        this.updatePropertyFinancials();
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

  get dashboardProperties(): Property[] {
    return this.selectedKosId === 'all'
      ? this.properties
      : this.properties.filter(property => property.id === this.selectedKosId);
  }

  get filteredPendingPayments(): Payment[] {
    return this.selectedKosId === 'all'
      ? this.pendingPayments
      : this.pendingPayments.filter(item => item.kosId === this.selectedKosId);
  }

  get filteredOverdueBills(): Bill[] {
    return this.selectedKosId === 'all'
      ? this.overdueBills
      : this.overdueBills.filter(item => item.kosId === this.selectedKosId);
  }

  get filteredRecentActivity(): Activity[] {
    const activities = this.selectedKosId === 'all'
      ? this.recentActivity
      : this.recentActivity.filter(item => item.kosId === this.selectedKosId);
    return activities.slice(0, 5);
  }

  get totalRooms(): number {
    return this.dashboardProperties.reduce((sum, item) => sum + item.totalRooms, 0);
  }

  get totalOccupied(): number {
    return this.dashboardProperties.reduce((sum, item) => sum + item.occupiedRooms, 0);
  }

  get totalReserved(): number {
    return this.dashboardProperties.reduce((sum, item) => sum + item.reservedRooms, 0);
  }

  get totalAvailable(): number {
    return this.dashboardProperties.reduce((sum, item) => sum + item.availableRooms, 0);
  }

  get totalTenants(): number {
    return this.dashboardProperties.reduce((sum, item) => sum + item.tenantCount, 0);
  }

  get totalIncome(): number {
    return this.sumForPeriod(this.pemasukanData, 'tgl_pemasukan', 'jumlah');
  }

  get totalExpense(): number {
    return this.sumForPeriod(this.pengeluaranData, 'tgl_pengeluaran', 'jumlah');
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

  get hasFinancialData(): boolean {
    const pemasukan = this.recordsForSelectedKos(this.pemasukanData);
    const pengeluaran = this.recordsForSelectedKos(this.pengeluaranData);
    return pemasukan.some(item => this.number(item.jumlah) !== 0) ||
      pengeluaran.some(item => this.number(item.jumlah) !== 0);
  }

  onPeriodChange(): void {
    this.updatePropertyFinancials();
    this.cdr.detectChanges();
  }

  onKosChange(): void {
    this.monthlyFinancials = this.buildMonthlyFinancials(
      this.recordsForSelectedKos(this.pemasukanData),
      this.recordsForSelectedKos(this.pengeluaranData)
    );
    this.updatePropertyFinancials();
    this.cdr.detectChanges();
    this.refreshCharts();
  }

  private recordsForSelectedKos(records: any[]): any[] {
    if (this.selectedKosId === 'all') return records;
    return records.filter(item =>
      Number(item.tKos_id_kos ?? item.kos_id_kos) === Number(this.selectedKosId)
    );
  }

  private updatePropertyFinancials(): void {
    this.properties = this.properties.map(property => ({
      ...property,
      monthlyIncome: this.sumForProperty(
        this.pemasukanData, property.id, 'tgl_pemasukan'
      ),
      monthlyExpense: this.sumForProperty(
        this.pengeluaranData, property.id, 'tgl_pengeluaran'
      )
    }));
  }

  private sumForProperty(records: any[], propertyId: string, dateField: string): number {
    return records
      .filter(item => Number(item.tKos_id_kos ?? item.kos_id_kos) === Number(propertyId))
      .filter(item => this.isInSelectedPeriod(item[dateField]))
      .reduce((sum, item) => sum + this.number(item.jumlah), 0);
  }

  private sumForPeriod(records: any[], dateField: string, amountField: string): number {
    return this.recordsForSelectedKos(records)
      .filter(item => this.isInSelectedPeriod(item[dateField]))
      .reduce((sum, item) => sum + this.number(item[amountField]), 0);
  }

  private isInSelectedPeriod(value: string | null | undefined): boolean {
    return this.month === 'all' || this.monthKey(value) === this.month;
  }

  private monthKey(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatMonthLabel(key: string): string {
    const [year, month] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(year, month - 1, 1));
  }

  private buildPeriodOptions(
    pemasukan: any[],
    pengeluaran: any[]
  ): { value: string; label: string }[] {
    const currentKey = this.getCurrentMonthValue();
    const keys = [...pemasukan, ...pengeluaran]
      .map(item => this.monthKey(item.tgl_pemasukan ?? item.tgl_pengeluaran))
      .filter(Boolean)
      .sort();

    const currentDate = new Date();
    const currentMonthStart = new Date(
      currentDate.getFullYear(), currentDate.getMonth(), 1
    );

    let earliestDate: Date;
    if (keys.length) {
      const [year, month] = keys[0].split('-').map(Number);
      earliestDate = new Date(year, month - 1, 1);
    } else {
      // Tetap sediakan pilihan bulan meskipun belum ada transaksi keuangan.
      earliestDate = new Date(
        currentDate.getFullYear(), currentDate.getMonth() - 11, 1
      );
    }

    const options: { value: string; label: string }[] = [
      { value: 'all', label: 'Semua Periode' }
    ];

    for (
      let date = new Date(earliestDate);
      date <= currentMonthStart;
      date = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    ) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      options.push({ value: key, label: this.formatMonthLabel(key) });
    }

    // Pastikan bulan berjalan selalu tersedia.
    if (!options.some(option => option.value === currentKey)) {
      options.push({ value: currentKey, label: this.formatMonthLabel(currentKey) });
    }

    return options;
  }

  private formatCompactRupiah(value: number): string {
    const absolute = Math.abs(value);
    if (absolute >= 1_000_000_000) {
      return `Rp ${(value / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
    }
    if (absolute >= 1_000_000) {
      return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
    }
    if (absolute >= 1_000) {
      return `Rp ${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} rb`;
    }
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
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
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (value === null || value === undefined || value === '') return 0;

    let normalized = String(value).trim().replace(/\s/g, '');
    if (normalized.includes(',')) {
      // Mendukung format 1.500.000,00 dari sumber data lokal.
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(normalized)) {
      normalized = normalized.replace(/\./g, '');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private buildMonthlyFinancials(
    pemasukan: any[],
    pengeluaran: any[]
  ): { month: string; income: number; expense: number }[] {
    const allDates = [
      ...pemasukan.map(item => item.tgl_pemasukan),
      ...pengeluaran.map(item => item.tgl_pengeluaran)
    ].filter(Boolean);

    const now = new Date();
    let earliest = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const value of allDates) {
      const date = new Date(String(value).replace(' ', 'T'));
      if (!Number.isNaN(date.getTime())) {
        const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
        if (monthDate < earliest) earliest = monthDate;
      }
    }

    const result: { month: string; income: number; expense: number }[] = [];

    for (
      let date = new Date(earliest);
      date <= new Date(now.getFullYear(), now.getMonth(), 1);
      date = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    ) {
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const label = new Intl.DateTimeFormat('id-ID', {
        month: 'short',
        year: 'numeric'
      }).format(date);

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
        kosId: String(item.kamar?.tKos_id_kos ?? item.kamar?.kos?.id_kos ?? ''),
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
        kosId: String(
          item.tagihan?.kontrak?.kamar?.tKos_id_kos ??
          item.tagihan?.kontrak?.kamar?.kos?.id_kos ?? ''
        ),
        sortDate: this.timestamp(date)
      });
    });

    komplain.forEach(item => {
      const date = item.tgl_komplain;
      const nama = item.penghuni?.user?.nama || 'Penghuni';
      const penghuniId = Number(item.tPenghuni_id_penghuni ?? item.penghuni?.id_penghuni ?? 0);
      const relatedContract = kontrak.find((contract: any) =>
        Number(contract.tPenghuni_id_penghuni ?? contract.penghuni?.id_penghuni ?? 0) === penghuniId &&
        contract.status === 'aktif'
      ) || kontrak.find((contract: any) =>
        Number(contract.tPenghuni_id_penghuni ?? contract.penghuni?.id_penghuni ?? 0) === penghuniId
      );
      activities.push({
        icon: 'chatbubble-ellipses-outline',
        text: `${nama} mengajukan komplain: ${item.judul || item.deskripsi || '-'}`,
        time: this.relativeTime(date),
        kosId: String(relatedContract?.kamar?.tKos_id_kos ?? relatedContract?.kamar?.kos?.id_kos ?? ''),
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
        kosId: String(item.kamar?.tKos_id_kos ?? item.kamar?.kos?.id_kos ?? ''),
        sortDate: this.timestamp(date)
      });
    });

    return activities
      .sort((a, b) => b.sortDate - a.sortDate)
      .map(({ icon, text, time, kosId }) => ({ icon, text, time, kosId }));
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

  private getCurrentMonthValue(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
    this.roomStatusChartInstance?.destroy();
    this.financialChartInstance?.destroy();
    this.profitChartInstance?.destroy();

    this.roomStatusChartInstance = undefined;
    this.financialChartInstance = undefined;
    this.profitChartInstance = undefined;

    if (this.roomStatusChart) {
      this.createRoomStatusChart();
    }

    if (this.hasFinancialData && this.financialChart) {
      this.createFinancialChart();
    }

    if (this.hasFinancialData && this.profitChart) {
      this.createProfitChart();
    }
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
              callback: value => this.formatCompactRupiah(Number(value))
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
              callback: value => this.formatCompactRupiah(Number(value))
            }
          }
        }
      }
    });
  }
}

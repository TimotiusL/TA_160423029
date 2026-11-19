import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { ApiService } from '../../services/api';
import { finalize, timeout } from 'rxjs';

type ExitRequestStatus = 'tidak_ada' | 'menunggu' | 'disetujui' | 'ditolak' | 'selesai';

interface ContractView {
  id: number;
  number: string;
  status: string;
  statusCode: string;
  tenantName: string;
  tenantEmail: string;
  propertyName: string;
  address: string;
  propertyPhone: string;
  propertyEmail: string;
  roomName: string;
  roomNumber: string;
  floor: string;
  startDate: Date | null;
  endDate: Date | null;
  rent: number;
  deposit: number;
  applicationCode: string;
  applicationDate: Date | null;
  durationMonths: number;
  bundleName: string;
  bundleNormalPrice: number;
  bundleDiscount: number;
  bundlePrice: number;
  exitRequestStatus: ExitRequestStatus;
  exitRequestedAt: Date | null;
  plannedExitDate: Date | null;
  exitReason: string;
  exitOwnerNote: string;
  checkoutDate: Date | null;
  terminationReason: string;
  terminationNote: string;
}

@Component({
  selector: 'app-contract-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
  templateUrl: './contract-detail.page.html',
  styleUrls: ['./contract-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractDetailPage implements OnInit {
  constructor(
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  loading = true;
  downloading = false;
  downloadError = '';
  hasContract = false;
  errorMessage = '';
  showExitRequestForm = false;
  showExitConfirmModal = false;
  showExitSuccessModal = false;
  exitConfirmationMessage = '';
  exitSuccessMessage = '';
  exitRequestLoading = false;
  exitRequestError = '';
  todayDate = this.localDateToday();
  exitRequestDate = this.localDateToday();
  exitReason = '';

  contract: ContractView = this.emptyContract();

  ngOnInit(): void {
    this.loadContract();
  }

  private emptyContract(): ContractView {
    return {
      id: 0,
      number: '-',
      status: '-',
      statusCode: '',
      tenantName: '-',
      tenantEmail: '-',
      propertyName: '-',
      address: '-',
      propertyPhone: '',
      propertyEmail: '',
      roomName: '-',
      roomNumber: '-',
      floor: '-',
      startDate: null,
      endDate: null,
      rent: 0,
      deposit: 0,
      applicationCode: '-',
      applicationDate: null,
      durationMonths: 0,
      bundleName: '',
      bundleNormalPrice: 0,
      bundleDiscount: 0,
      bundlePrice: 0,
      exitRequestStatus: 'tidak_ada',
      exitRequestedAt: null,
      plannedExitDate: null,
      exitReason: '',
      exitOwnerNote: '',
      checkoutDate: null,
      terminationReason: '',
      terminationNote: '',
    };
  }

  loadContract(): void {
    this.loading = true;
    this.errorMessage = '';
    this.hasContract = false;
    this.cdr.markForCheck();

    this.api.getKontrak().pipe(
      // Hindari halaman terus menampilkan spinner jika API tidak merespons.
      timeout({ first: 15000 }),
      // Selalu matikan loading setelah sukses, gagal, atau timeout.
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response: any) => {
        try {
          // Mendukung respons array langsung, Laravel { data: [...] },
          // maupun pembungkus { kontrak: [...] }.
          const payload = response?.data ?? response?.kontrak ?? response;
          const rows: any[] = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

          // Kontrak aktif tetap ditampilkan walaupun tanggal akhir sudah lewat,
          // supaya penghuni dapat melihat tagihan perpanjangan dan denda berjalan.
          const currentRows = rows.filter((row: any) => this.isCurrentTenantContract(row));

          currentRows.sort((a: any, b: any) => {
            const rank = (status: string) => status === 'aktif' ? 0 : 1;
            const difference = rank(String(a.status || '').toLowerCase())
              - rank(String(b.status || '').toLowerCase());
            if (difference !== 0) return difference;
            return new Date(b.tgl_mulai || 0).getTime() - new Date(a.tgl_mulai || 0).getTime();
          });

          const item = currentRows[0];
          if (!item) {
            this.contract = this.emptyContract();
            this.hasContract = false;
            this.cdr.detectChanges();
            return;
          }

          const kamar = item.kamar;
          const kos = kamar?.kos;
          const jenis = kamar?.jenis_kamar || kamar?.jenisKamar;
          const penghuni = item.penghuni;
          const user = penghuni?.user;
          const pendaftaran = item.pendaftaran;

          this.contract = {
            id: Number(item.id_kontrak),
            number: item.no_kontrak || `KTR-${item.id_kontrak}`,
            status: this.statusLabel(String(item.status || '')),
            statusCode: String(item.status || '').toLowerCase(),
            tenantName: user?.nama || '-',
            tenantEmail: user?.email || '-',
            propertyName: kos?.nama_kos || '-',
            address: kos?.alamat || '-',
            propertyPhone: String(kos?.no_telp || ''),
            propertyEmail: String(kos?.email || ''),
            roomName: jenis?.nama_jenis || 'Kamar',
            roomNumber: String(kamar?.no_kamar ?? '-'),
            floor: kamar?.lantai !== null && kamar?.lantai !== undefined ? `Lantai ${kamar.lantai}` : '-',
            startDate: this.toDate(item.tgl_mulai),
            endDate: this.toDate(item.tgl_selesai),
            rent: Number(item.harga_sewa || 0),
            deposit: Number(item.deposit || 0),
            applicationCode: pendaftaran?.kode_pendaftaran || '-',
            applicationDate: this.toDate(pendaftaran?.tgl_pendaftaran),
            durationMonths: Number(pendaftaran?.durasi_sewa || 0),
            bundleName: String(item.nama_bundle || ''),
            bundleNormalPrice: Number(item.harga_normal_bundle || 0),
            bundleDiscount: Number(item.potongan_bundle || 0),
            bundlePrice: Number(item.harga_bundle || 0),
            exitRequestStatus: this.normalizeExitStatus(item.status_permintaan_keluar),
            exitRequestedAt: this.toDate(item.tgl_pengajuan_keluar),
            plannedExitDate: this.toDate(item.tgl_rencana_keluar),
            exitReason: String(item.alasan_keluar || ''),
            exitOwnerNote: String(item.catatan_owner_keluar || ''),
            checkoutDate: this.toDate(item.tgl_keluar),
            terminationReason: String(item.alasan_pengakhiran || ''),
            terminationNote: String(item.catatan_pengakhiran || ''),
          };

          this.hasContract = true;
          this.exitRequestDate = this.minimumExitDate;
          this.cdr.detectChanges();
        } catch (error: any) {
          console.error('Gagal mengolah data kontrak tenant:', error);
          this.contract = this.emptyContract();
          this.hasContract = false;
          this.errorMessage = 'Data kontrak diterima, tetapi gagal ditampilkan. Silakan coba lagi.';
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        console.error('Gagal memuat kontrak tenant:', error);

        if (error?.name === 'TimeoutError') {
          this.errorMessage = 'Pengambilan data kontrak memerlukan waktu lebih dari 15 detik. Periksa koneksi ke server Laravel, lalu coba lagi.';
        } else if (error?.status === 401) {
          this.errorMessage = 'Sesi login sudah berakhir. Silakan login kembali untuk melihat kontrak.';
        } else if (error?.status === 0) {
          this.errorMessage = 'Server Laravel tidak dapat dihubungi. Periksa koneksi API, lalu coba lagi.';
        } else {
          this.errorMessage = error?.error?.message || 'Kontrak gagal dimuat. Periksa koneksi dan login penghuni.';
        }

        this.hasContract = false;
        this.cdr.detectChanges();
      },
    });
  }

  private isCurrentTenantContract(item: any): boolean {
    const status = String(item?.status || '').toLowerCase();

    if (status !== 'aktif' && status !== 'menunggu_pembayaran') {
      return false;
    }

    return true;
  }

  private normalizeExitStatus(value: unknown): ExitRequestStatus {
    const status = String(value || 'tidak_ada');
    if (status === 'menunggu' || status === 'disetujui' || status === 'ditolak' || status === 'selesai') {
      return status;
    }
    return 'tidak_ada';
  }

  private localDateToday(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  }

  formatDateInput(value: Date | string | null): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    const date = new Date(value);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  get isActiveContract(): boolean {
    return this.contract.statusCode === 'aktif';
  }

  get canRequestExit(): boolean {
    return this.isActiveContract
      && this.contract.exitRequestStatus !== 'menunggu'
      && this.contract.exitRequestStatus !== 'disetujui'
      && this.contract.exitRequestStatus !== 'selesai';
  }

  get exitButtonLabel(): string {
    const endDate = this.formatDateInput(this.contract.endDate);
    if (!endDate || endDate <= this.localDateToday()) return 'Ajukan Konfirmasi Keluar';
    return 'Ajukan Keluar Lebih Awal';
  }

  get exitPanelDescription(): string {
    const endDate = this.formatDateInput(this.contract.endDate);
    if (endDate && endDate <= this.localDateToday()) {
      return 'Masa kontrak sudah mencapai tanggal akhir. Kirim permintaan kepada pemilik kos agar rencana keluar dan serah terima kamar dapat dikonfirmasi.';
    }
    return 'Kirim permintaan jika kamu berencana pindah sebelum masa kontrak berakhir. Kontrak dan status kamar tidak langsung berubah sampai proses dikonfirmasi pemilik kos.';
  }

  get minimumExitDate(): string {
    const today = this.localDateToday();
    const startDate = this.formatDateInput(this.contract.startDate);
    return startDate && startDate > today ? startDate : today;
  }

  get maximumExitDate(): string | null {
    const endDate = this.formatDateInput(this.contract.endDate);
    if (endDate && endDate >= this.localDateToday()) return endDate;
    return null;
  }

  get exitStatusLabel(): string {
    switch (this.contract.exitRequestStatus) {
      case 'menunggu': return 'Menunggu keputusan owner';
      case 'disetujui': return 'Disetujui owner';
      case 'ditolak': return 'Ditolak owner';
      case 'selesai': return 'Proses keluar selesai';
      default: return 'Belum ada permintaan keluar';
    }
  }

  get exitStatusClass(): string {
    return `exit-status-${this.contract.exitRequestStatus}`;
  }

  get terminationReasonLabel(): string {
    switch (this.contract.terminationReason) {
      case 'kontrak_berakhir': return 'Masa kontrak berakhir';
      case 'permintaan_penghuni': return 'Permintaan penghuni';
      case 'keputusan_owner': return 'Keputusan owner';
      default: return this.contract.terminationReason || '-';
    }
  }

  get contractStatusClass(): string {
    switch (this.contract.statusCode) {
      case 'aktif': return 'status-active';
      case 'menunggu_pembayaran': return 'status-pending';
      case 'selesai': return 'status-finished';
      case 'dibatalkan': return 'status-cancelled';
      default: return 'status-neutral';
    }
  }

  get remainingDays(): number {
    const endDate = this.formatDateInput(this.contract.endDate);
    if (!endDate) return 0;
    const [year, month, day] = endDate.split('-').map(Number);
    const end = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
  }

  get isContractExpired(): boolean {
    const endDate = this.formatDateInput(this.contract.endDate);
    return !!endDate && endDate < this.localDateToday() && this.isActiveContract;
  }

  get contractOverdueDays(): number {
    const endDate = this.formatDateInput(this.contract.endDate);
    if (!endDate || !this.isContractExpired) return 0;
    const [year, month, day] = endDate.split('-').map(Number);
    const end = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today.getTime() - end.getTime()) / 86400000));
  }

  get leaseProgressPercent(): number {
    const startDate = this.formatDateInput(this.contract.startDate);
    const endDate = this.formatDateInput(this.contract.endDate);
    if (!startDate || !endDate) return 0;
    const startParts = startDate.split('-').map(Number);
    const endParts = endDate.split('-').map(Number);
    const start = new Date(startParts[0], startParts[1] - 1, startParts[2]).getTime();
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2]).getTime();
    const span = end - start;
    if (span <= 0) return 100;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.max(0, Math.min(100, Math.round(((now.getTime() - start) / span) * 100)));
  }

  private statusLabel(status: string): string {
    switch (status) {
      case 'aktif': return 'Aktif';
      case 'menunggu_pembayaran': return 'Menunggu Pembayaran';
      case 'selesai': return 'Selesai';
      case 'dibatalkan': return 'Dibatalkan';
      default: return status || '-';
    }
  }

  private toDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  openExitRequestForm(): void {
    if (!this.canRequestExit || this.exitRequestLoading) return;
    this.exitRequestError = '';
    this.exitRequestDate = this.minimumExitDate;
    this.showExitRequestForm = !this.showExitRequestForm;
    this.cdr.markForCheck();
  }

  submitExitRequest(): void {
    this.exitRequestError = '';
    const minimum = this.minimumExitDate;
    const maximum = this.maximumExitDate;

    if (!this.exitRequestDate || !this.exitReason.trim()) {
      this.exitRequestError = 'Tanggal rencana keluar dan alasan wajib diisi.';
      this.cdr.markForCheck();
      return;
    }
    if (this.exitRequestDate < minimum) {
      this.exitRequestError = 'Tanggal rencana keluar tidak boleh sebelum hari ini atau sebelum tanggal mulai kontrak.';
      this.cdr.markForCheck();
      return;
    }
    if (maximum && this.exitRequestDate > maximum) {
      this.exitRequestError = 'Tanggal rencana keluar tidak boleh melewati tanggal akhir kontrak.';
      this.cdr.markForCheck();
      return;
    }

    this.exitConfirmationMessage = this.contract.endDate
      && this.formatDateInput(this.contract.endDate) <= this.localDateToday()
      ? 'Kirim permintaan konfirmasi keluar kepada pemilik kos? Kontrak tetap aktif sampai pemilik kos mengonfirmasi bahwa kamu benar-benar sudah keluar.'
      : 'Kirim permintaan keluar lebih awal kepada pemilik kos? Kontrak tidak langsung berakhir dan kamar tidak langsung tersedia.';

    this.showExitConfirmModal = true;
    this.cdr.markForCheck();
  }

  confirmExitRequest(): void {
    if (this.exitRequestLoading || !this.showExitConfirmModal) return;

    this.exitRequestLoading = true;
    this.cdr.markForCheck();

    this.api.createTenantPermintaanKeluar({
      tKontrak_id_kontrak: this.contract.id,
      tgl_rencana_keluar: this.exitRequestDate,
      alasan: this.exitReason.trim(),
    }).subscribe({
      next: (response: any) => {
        const item = response?.data || {};
        this.contract = {
          ...this.contract,
          exitRequestStatus: this.normalizeExitStatus(item.status_permintaan_keluar || 'menunggu'),
          exitRequestedAt: this.toDate(item.tgl_pengajuan_keluar) || new Date(),
          plannedExitDate: this.toDate(item.tgl_rencana_keluar || this.exitRequestDate),
          exitReason: String(item.alasan_keluar || this.exitReason.trim()),
          exitOwnerNote: String(item.catatan_owner_keluar || ''),
        };

        this.exitRequestLoading = false;
        this.showExitConfirmModal = false;
        this.showExitRequestForm = false;
        this.exitReason = '';
        this.exitSuccessMessage = response?.message || 'Permintaan keluar berhasil dikirim kepada pemilik kos.';
        this.showExitSuccessModal = true;
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.showExitConfirmModal = false;
        this.exitRequestError = error?.error?.message || 'Permintaan keluar gagal dikirim. Coba lagi.';
        this.exitRequestLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeExitConfirmModal(): void {
    if (this.exitRequestLoading) return;
    this.showExitConfirmModal = false;
    this.cdr.markForCheck();
  }

  closeExitSuccessModal(): void {
    this.showExitSuccessModal = false;
    this.exitSuccessMessage = '';
    this.cdr.markForCheck();
  }

  downloadContract(): void {
    if (!this.contract.id || this.downloading) return;

    this.downloading = true;
    this.downloadError = '';
    this.cdr.markForCheck();

    this.api.downloadKontrak(String(this.contract.id)).subscribe({
      next: (blob: Blob) => {
        // Unduh melalui tautan sementara agar PDF langsung diunduh,
        // bukan dibuka pada tab atau jendela pratinjau.
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const fileName = `${this.contract.number || 'kontrak'}.pdf`;

        anchor.href = url;
        anchor.download = fileName;
        anchor.style.display = 'none';
        anchor.setAttribute('download', fileName);

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        this.downloading = false;
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        console.error('Gagal mengunduh kontrak:', error);
        this.downloadError = error?.error?.message || 'Dokumen kontrak gagal diunduh. Silakan coba lagi.';
        this.downloading = false;
        this.cdr.markForCheck();
      },
    });
  }

  lihatTagihan(): void {
    this.router.navigateByUrl('/tenant/billing');
  }

  kembaliDashboard(): void {
    this.router.navigateByUrl('/tenant/dashboard');
  }
}

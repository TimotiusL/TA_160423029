import { ChangeDetectionStrategy, Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api';

interface ApplicationStatusData {
  id: number;
  kode: string;
  namaKos: string;
  alamatKos: string;
  fotoKos: string;
  tipeKamar: string;
  tanggalPengajuan: string;
  tanggalRencanaMasuk: string;
  nomorKamar: string;
  durasiSewa: number;
  bundleName: string;
  bundleNormalPrice: number;
  bundleDiscount: number;
  bundlePrice: number;
  total: number;
  status: string;
  catatan: string;
  bisaDibatalkan: boolean;
  pesanPembatalan: string;
  sudahBayar: boolean;
  deposit: number;
  tglPembatalan: string;
  alasanPembatalan: string;
  rawDate: string;
}

@Component({
  selector: 'app-application-status',
  templateUrl: './application-status.page.html',
  styleUrls: ['./application-status.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar]
})
export class ApplicationStatusPage {
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  kodePendaftaran = '';
  sudahCari = false;
  tidakDitemukan = false;
  sedangCari = false;
  pesanError = '';
  belumAdaPengajuan = false;
  sedangMembatalkan = false;
  showCancelModal = false;
  alasanPembatalanInput = '';
  errorPembatalanModal = '';
  pesanAksi = '';
  errorAksi = '';
  pengajuanMenungguLainnya: ApplicationStatusData[] = [];
  riwayatPengajuan: ApplicationStatusData[] = [];
  pengajuanTerbaru: ApplicationStatusData | null = null;
  melihatRiwayat = false;
  melihatPengajuanMenungguLain = false;
  belumAdaPengajuanMenunggu = false;

  pendaftaran: ApplicationStatusData = {
    id: 0,
    kode: '',
    namaKos: '',
    alamatKos: '',
    fotoKos: '',
    tipeKamar: '',
    tanggalPengajuan: '',
    tanggalRencanaMasuk: '',
    nomorKamar: '',
    durasiSewa: 1,
    bundleName: '',
    bundleNormalPrice: 0,
    bundleDiscount: 0,
    bundlePrice: 0,
    total: 0,
    status: 'menunggu',
    catatan: '',
    bisaDibatalkan: false,
    pesanPembatalan: '',
    sudahBayar: false,
    deposit: 0,
    tglPembatalan: '',
    alasanPembatalan: '',
    rawDate: ''
  };


  ionViewWillEnter(): void {
    const kode = this.route.snapshot.queryParamMap.get('kode')?.trim();

    if (kode) {
      this.kodePendaftaran = kode;
      this.cariStatus();
      return;
    }

    this.kodePendaftaran = '';
    this.loadLatestApplication();
  }



  cariStatus(preserveActionMessage = false): void {
    const kode = this.kodePendaftaran.trim().toUpperCase();
    if (!kode) {
      this.pesanError = 'Masukkan kode pendaftaran terlebih dahulu.';
      this.sudahCari = false;
      this.tidakDitemukan = false;
      this.sedangCari = false;
      this.cdr.markForCheck();
      return;
    }

    this.loadAllApplications(kode, preserveActionMessage);
  }

  private loadLatestApplication(): void {
    this.loadAllApplications('', false);
  }

  /** Memuat seluruh pengajuan, lalu memisahkan yang masih menunggu dari riwayat final. */
  private loadAllApplications(targetCode: string, preserveActionMessage: boolean): void {
    this.mulaiMemuatStatus(preserveActionMessage);
    this.api.getTenantPendaftaran().subscribe({
      next: (response: any) => {
        const rows = this.toApplicationArray(response);
        rows.sort((a: any, b: any) => {
          const dateDiff = new Date(b?.tgl_pendaftaran || 0).getTime() - new Date(a?.tgl_pendaftaran || 0).getTime();
          return dateDiff || Number(b?.id_pendaftaran || 0) - Number(a?.id_pendaftaran || 0);
        });

        const mapped = rows.map((item: any) => this.mapPengajuan(item));
        const menunggu = mapped.filter(item => item.status === 'menunggu');
        const selesai = mapped.filter(item => item.status !== 'menunggu');

        this.pengajuanTerbaru = menunggu[0] || null;
        this.pengajuanMenungguLainnya = menunggu.slice(1);
        this.riwayatPengajuan = selesai;
        this.sedangCari = false;

        if (mapped.length === 0) {
          this.sudahCari = false;
          this.tidakDitemukan = true;
          this.belumAdaPengajuan = true;
          this.belumAdaPengajuanMenunggu = false;
          this.melihatRiwayat = false;
          this.melihatPengajuanMenungguLain = false;
          this.kodePendaftaran = '';
          this.cdr.markForCheck();
          return;
        }

        if (targetCode) {
          const selected = mapped.find(item => item.kode.toUpperCase() === targetCode.toUpperCase());
          if (!selected) {
            this.sudahCari = false;
            this.tidakDitemukan = true;
            this.belumAdaPengajuan = false;
            this.belumAdaPengajuanMenunggu = false;
            this.melihatRiwayat = false;
            this.melihatPengajuanMenungguLain = false;
            this.cdr.markForCheck();
            return;
          }

          this.kodePendaftaran = selected.kode;
          this.tampilkanDataPengajuan(selected);
          this.melihatRiwayat = selected.status !== 'menunggu';
          this.melihatPengajuanMenungguLain = selected.status === 'menunggu' && selected.id !== this.pengajuanTerbaru?.id;
          this.cdr.markForCheck();
          return;
        }

        this.tidakDitemukan = false;
        this.belumAdaPengajuan = false;
        this.melihatRiwayat = false;
        this.melihatPengajuanMenungguLain = false;

        if (this.pengajuanTerbaru) {
          this.kodePendaftaran = this.pengajuanTerbaru.kode;
          this.belumAdaPengajuanMenunggu = false;
          this.tampilkanDataPengajuan(this.pengajuanTerbaru);
        } else {
          this.kodePendaftaran = '';
          this.sudahCari = false;
          this.belumAdaPengajuanMenunggu = true;
          this.cdr.markForCheck();
        }
      },
      error: (error: any) => this.tanganiErrorPencarian(error)
    });
  }

  private mulaiMemuatStatus(preserveActionMessage: boolean): void {
    this.sudahCari = false;
    this.tidakDitemukan = false;
    this.belumAdaPengajuan = false;
    this.belumAdaPengajuanMenunggu = false;
    this.melihatRiwayat = false;
    this.melihatPengajuanMenungguLain = false;
    this.pesanError = '';
    if (!preserveActionMessage) {
      this.pesanAksi = '';
      this.errorAksi = '';
    }
    this.sedangCari = true;
    this.cdr.markForCheck();
  }

  private toApplicationArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  }

  private mapPengajuan(item: any): ApplicationStatusData {
    const rawStatus = String(item?.status || 'menunggu').trim().toLowerCase();
    const normalizedStatus = rawStatus === 'disetujui' || rawStatus === 'diterima'
      ? 'diterima'
      : rawStatus;
    return {
      id: Number(item?.id_pendaftaran || 0),
      kode: String(item?.kode_pendaftaran || '-'),
      namaKos: item?.kamar?.kos?.nama_kos || 'Kos tidak ditemukan',
      alamatKos: item?.kamar?.kos?.alamat || '-',
      fotoKos: this.photoUrl(item?.kamar?.kos?.foto),
      tipeKamar: item?.kamar?.jenis_kamar?.nama_jenis || `Kamar ${item?.kamar?.no_kamar || ''}`,
      tanggalPengajuan: this.formatTanggal(item?.tgl_pendaftaran),
      tanggalRencanaMasuk: this.formatTanggal(item?.tgl_rencana_masuk),
      nomorKamar: item?.kamar?.no_kamar ? `Kamar ${item.kamar.no_kamar}` : '-',
      durasiSewa: Math.max(1, Number(item?.durasi_sewa || 1)),
      bundleName: String(item?.nama_bundle || ''),
      bundleNormalPrice: Number(item?.harga_normal_bundle || 0),
      bundleDiscount: Number(item?.potongan_bundle || 0),
      bundlePrice: Number(item?.harga_bundle || 0),
      total: Number(item?.total || 0),
      status: normalizedStatus,
      catatan: item?.catatan || '',
      bisaDibatalkan: Boolean(item?.can_cancel),
      pesanPembatalan: String(item?.cancel_message || ''),
      sudahBayar: Boolean(item?.has_verified_payment),
      deposit: Number(item?.deposit || 0),
      tglPembatalan: item?.tgl_pembatalan ? this.formatTanggal(item.tgl_pembatalan) : '',
      alasanPembatalan: String(item?.alasan_pembatalan || ''),
      rawDate: String(item?.tgl_pendaftaran || '')
    };
  }

  private tampilkanDataPengajuan(item: ApplicationStatusData): void {
    this.pendaftaran = { ...item };
    this.tidakDitemukan = false;
    this.belumAdaPengajuan = false;
    this.sudahCari = true;
    this.cdr.markForCheck();
  }

  lihatDetailPengajuan(item: ApplicationStatusData): void {
    this.kodePendaftaran = item.kode;
    this.tampilkanDataPengajuan(item);
    this.melihatRiwayat = item.status !== 'menunggu';
    this.melihatPengajuanMenungguLain = item.status === 'menunggu' && item.id !== this.pengajuanTerbaru?.id;
    this.pesanAksi = '';
    this.errorAksi = '';
    this.cdr.markForCheck();
  }

  lihatPengajuanMenunggu(): void {
    if (!this.pengajuanTerbaru) return;
    this.kodePendaftaran = this.pengajuanTerbaru.kode;
    this.tampilkanDataPengajuan(this.pengajuanTerbaru);
    this.melihatRiwayat = false;
    this.melihatPengajuanMenungguLain = false;
    this.pesanAksi = '';
    this.errorAksi = '';
    this.cdr.markForCheck();
  }

  labelStatusPengajuan(status: string): string {
    switch (status) {
      case 'diterima': return 'Diterima';
      case 'ditolak': return 'Ditolak';
      case 'dibatalkan': return 'Dibatalkan';
      default: return 'Menunggu';
    }
  }

  private tanganiErrorPencarian(error: any): void {
    console.error('Gagal mencari status pendaftaran:', error);
    this.sedangCari = false;
    this.pesanError = error?.error?.message || 'Status pendaftaran gagal dimuat. Periksa koneksi dan login penghuni.';
    this.cdr.markForCheck();
  }

  muatUlangStatus(): void {
    if (this.kodePendaftaran.trim()) {
      this.cariStatus();
    } else {
      this.loadLatestApplication();
    }
  }

  private formatTanggal(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  get statusLabel(): string {
    switch (this.pendaftaran.status) {
      case 'diterima': return 'Pengajuan diterima';
      case 'ditolak': return 'Pengajuan ditolak';
      case 'dibatalkan': return 'Pengajuan dibatalkan';
      default: return 'Menunggu verifikasi';
    }
  }

  get statusDescription(): string {
    switch (this.pendaftaran.status) {
      case 'diterima': return 'Pengajuanmu telah disetujui. Pantau informasi kontrak dan pembayaran pada menu terkait.';
      case 'ditolak': return 'Pengajuanmu belum dapat diterima. Hubungi pengelola kos jika membutuhkan penjelasan lebih lanjut.';
      case 'dibatalkan': return `Pengajuan ini dibatalkan pada ${this.pendaftaran.tglPembatalan || '-'}${this.pendaftaran.alasanPembatalan ? '. Alasan: ' + this.pendaftaran.alasanPembatalan : '.'}`;
      default: return 'Pengajuan sudah tercatat dan sedang menunggu pemeriksaan pemilik kos.';
    }
  }

  private photoUrl(path: string | null | undefined): string {
    if (!path || path === 'default.jpg') {
      return 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=320&h=220&fit=crop&auto=format';
    }
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.replace(/^\/+/, '').replace(/^storage\//, '');
    return `http://127.0.0.1:8000/storage/${cleanPath}`;
  }

  batalkanPendaftaran(): void {
    if (!this.pendaftaran.bisaDibatalkan || this.sedangMembatalkan || !this.pendaftaran.id) {
      return;
    }

    this.alasanPembatalanInput = '';
    this.errorPembatalanModal = '';
    this.showCancelModal = true;
    this.cdr.markForCheck();
  }

  tutupModalPembatalan(): void {
    if (this.sedangMembatalkan) return;
    this.showCancelModal = false;
    this.errorPembatalanModal = '';
    this.cdr.markForCheck();
  }

  konfirmasiPembatalan(): void {
    if (!this.pendaftaran.bisaDibatalkan || this.sedangMembatalkan || !this.pendaftaran.id) {
      return;
    }

    const alasan = this.alasanPembatalanInput.trim();
    if (alasan.length < 5) {
      this.errorPembatalanModal = 'Alasan pembatalan minimal 5 karakter.';
      this.cdr.markForCheck();
      return;
    }

    this.sedangMembatalkan = true;
    this.errorPembatalanModal = '';
    this.errorAksi = '';
    this.pesanAksi = '';
    this.cdr.markForCheck();

    this.api.cancelTenantPendaftaran(this.pendaftaran.id, alasan).subscribe({
      next: (response: any) => {
        this.sedangMembatalkan = false;
        this.showCancelModal = false;
        this.alasanPembatalanInput = '';
        this.pesanAksi = response?.message || 'Pendaftaran berhasil dibatalkan.';
        this.kodePendaftaran = '';
        this.cdr.markForCheck();
        this.loadAllApplications('', true);
      },
      error: (error: any) => {
        this.sedangMembatalkan = false;
        this.errorPembatalanModal = error?.error?.message || 'Pembatalan gagal diproses. Silakan coba lagi.';
        this.cdr.markForCheck();
      }
    });
  }

  lihatKontrak(): void {
    this.router.navigateByUrl('/tenant/contract-detail');
  }

  lihatTagihan(): void {
    this.router.navigateByUrl('/tenant/billing');
  }

  kembali(): void {
    this.router.navigateByUrl('/tenant/browse');
  }
}

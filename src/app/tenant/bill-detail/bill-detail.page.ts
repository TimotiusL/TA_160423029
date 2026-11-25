import { ChangeDetectionStrategy, Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api';

interface BillDetailData {
  id: number;
  kode: string;
  periode: string;
  tanggalTerbit: string;
  jatuhTempo: string;
  nominal: number;
  dendaBerjalan: number;
  totalBerjalan: number;
  bisaDicicil: boolean;
  isBundle: boolean;
  bundleName: string;
  bundleDuration: number;
  installmentRequests: any[];
  status: string;
  contractStatus: string;
  kos: string;
  kamar: string;
  phone: string;
  email: string;
  namaBank: string;
  nomorRekening: string;
  namaPemilikRekening: string;
  details: any[];
  payments: any[];
}

@Component({
  selector: 'app-bill-detail',
  templateUrl: './bill-detail.page.html',
  styleUrls: ['./bill-detail.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar]
})
export class BillDetailPage implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  fileBukti: File | null = null;
  namaFile = '';
  catatan = '';
  metode = 'transfer';
  pratinjauUrl = '';
  showConfirmation = false;
  submitMessage = '';
  loading = true;
  submitting = false;
  errorMessage = '';
  showCicilanForm = false;
  jumlahCicilan = 2;
  alasanCicilan = '';
  mengajukanCicilan = false;
  selectedCicilan: any = null;
  notFound = false;
  tagihan: BillDetailData = {
    id: 0,
    kode: '-',
    periode: '-',
    tanggalTerbit: '-',
    jatuhTempo: '-',
    nominal: 0,
    dendaBerjalan: 0,
    totalBerjalan: 0,
    bisaDicicil: true,
    isBundle: false,
    bundleName: '',
    bundleDuration: 0,
    installmentRequests: [],
    status: 'belum_lunas',
    contractStatus: '',
    kos: '-',
    kamar: '-',
    phone: '-',
    email: '-',
    namaBank: '',
    nomorRekening: '',
    namaPemilikRekening: '',
    details: [],
    payments: []
  };

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const kode = params.get('kode');
      if (!kode || kode === 'bantuan') {
        this.loading = false;
        this.notFound = true;
        this.errorMessage = 'Kode tagihan tidak valid.';
        this.cdr.markForCheck();
        return;
      }
      this.loadTagihan(kode);
    });
  }

  private loadTagihan(kode: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.notFound = false;
    this.cdr.markForCheck();

    this.api.getTenantTagihanByKode(kode).subscribe({
      next: (response: any) => {
        const item = response?.data ?? response;

        if (!item || !item.id_tagihan) {
          this.notFound = true;
          this.loading = false;
          this.errorMessage = 'Tagihan tidak ditemukan atau bukan milik akun ini.';
          this.cdr.markForCheck();
          return;
        }

        const kamar = item.kontrak?.kamar;
        const jenis = kamar?.jenis_kamar || kamar?.jenisKamar;
        const kos = kamar?.kos;
        const kontrak = item.kontrak || {};
        const isBundle = String(kontrak.nama_bundle || '').trim() !== '' && Number(kontrak.harga_bundle || 0) > 0;
        this.tagihan = {
          id: Number(item.id_tagihan),
          kode: item.kode_tagihan || `INV-${item.id_tagihan}`,
          periode: String(item.periode || '-'),
          tanggalTerbit: this.formatTanggal(item.tgl_terbit),
          jatuhTempo: this.formatTanggal(item.tgl_jatuhTempo),
          nominal: Number(item.total_tagihan || 0),
          dendaBerjalan: Number(item.denda_berjalan || 0),
          totalBerjalan: Number(item.total_tagihan_berjalan ?? (Number(item.total_tagihan || 0) + Number(item.denda_berjalan || 0))),
          bisaDicicil: !isBundle && Number(kos?.bisa_dicicil ?? 1) === 1,
          isBundle,
          bundleName: isBundle ? String(kontrak.nama_bundle) : '',
          bundleDuration: isBundle ? Number(kontrak.pendaftaran?.durasi_sewa || 0) : 0,
          installmentRequests: isBundle ? [] : (Array.isArray(item.persetujuan_cicilan) ? item.persetujuan_cicilan : []),
          status: item.status || 'belum_lunas',
          contractStatus: String(kontrak.status || ''),
          kos: kos?.nama_kos || '-',
          kamar: [jenis?.nama_jenis, kamar?.no_kamar ? `No. ${kamar.no_kamar}` : '']
            .filter(Boolean).join(' · ') || '-',
          phone: kos?.no_telp || '-',
          email: kos?.email || '-',
          namaBank: kos?.nama_bank || '',
          nomorRekening: kos?.nomor_rekening || '',
          namaPemilikRekening: kos?.nama_pemilik_rekening || '',
          details: Array.isArray(item.detail) ? item.detail : [],
          payments: Array.isArray(item.pembayaran) ? item.pembayaran : []
        };
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        console.error('Gagal memuat detail tagihan:', error);
        this.loading = false;
        this.errorMessage = error?.status === 404
          ? 'Tagihan tidak ditemukan atau bukan milik akun ini.'
          : (error?.error?.message || 'Detail tagihan gagal dimuat. Periksa koneksi dan login tenant.');
        this.notFound = error?.status === 404;
        this.cdr.markForCheck();
      }
    });
  }

  get phoneLink(): string {
    const phone = (this.tagihan.phone || '').replace(/[^0-9+]/g, '');
    return phone && phone !== '-' ? `tel:${phone}` : '';
  }

  get whatsappLink(): string {
    let phone = (this.tagihan.phone || '').replace(/\D/g, '');
    if (phone.startsWith('0')) phone = `62${phone.slice(1)}`;
    else if (phone.startsWith('8')) phone = `62${phone}`;
    return phone ? `https://wa.me/${phone}` : '';
  }

  async salinNomorRekening(): Promise<void> {
    const nomor = (this.tagihan.nomorRekening || '').trim();
    if (!nomor) return;

    try {
      await navigator.clipboard.writeText(nomor);
      alert('Nomor rekening berhasil disalin.');
    } catch (error) {
      console.error('Gagal menyalin nomor rekening:', error);
      alert('Nomor rekening belum bisa disalin otomatis. Silakan salin secara manual.');
    }
  }

  get statusTagihan(): string {
    return this.tagihan.status === 'lunas' ? 'Lunas' : 'Belum Lunas';
  }

  get menungguVerifikasi(): boolean {
    return this.tagihan.payments.some((p: any) => p.status === 'menunggu_verifikasi');
  }

  get menungguVerifikasiLangsung(): boolean {
    return this.tagihan.payments.some((p: any) =>
      p.status === 'menunggu_verifikasi' && p.metode_pembayaran === 'langsung'
    );
  }

  get permintaanCicilanTerbaru(): any | null {
    if (this.tagihan.isBundle) return null;
    return [...(this.tagihan.installmentRequests || [])]
      .sort((a: any, b: any) => new Date(b.tgl_pengajuan || 0).getTime() - new Date(a.tgl_pengajuan || 0).getTime())[0] || null;
  }

  get persetujuanCicilanDisetujui(): any | null {
    const request = this.permintaanCicilanTerbaru;
    return request?.status === 'disetujui'
      && Array.isArray(request.cicilan)
      && request.cicilan.length > 0
      ? request
      : null;
  }

  get jadwalCicilan(): any[] {
    return this.persetujuanCicilanDisetujui?.cicilan || [];
  }

  get bolehMengajukanCicilan(): boolean {
    const latest = this.permintaanCicilanTerbaru;
    const hasSchedule = latest?.status === 'disetujui'
      && Array.isArray(latest.cicilan)
      && latest.cicilan.length > 0;
    const canRequestAgain = !latest || latest.status === 'ditolak'
      || (latest.status === 'disetujui' && !hasSchedule);

    return this.tagihan.contractStatus !== 'selesai'
      && this.tagihan.bisaDicicil
      && !this.loading && this.tagihan.status !== 'lunas'
      && !this.menungguVerifikasi && !hasSchedule
      && canRequestAgain && this.sisaBayar > 0;
  }

  get bolehMengirimBukti(): boolean {
    const latest = this.permintaanCicilanTerbaru;
    if (this.loading || this.submitting || this.tagihan.contractStatus === 'selesai' || this.tagihan.status === 'lunas' || this.menungguVerifikasi) return false;
    if (latest?.status === 'menunggu_persetujuan') return false;
    if (this.persetujuanCicilanDisetujui) return !!this.selectedCicilan && this.sisaBayar > 0;
    return this.sisaBayar > 0;
  }

  get sisaBayar(): number {
    if (this.tagihan.status === 'lunas') return 0;
    if (this.persetujuanCicilanDisetujui && this.selectedCicilan) {
      const cicilanId = Number(this.selectedCicilan.id_cicilan);
      const alreadyPaid = this.tagihan.payments
        .filter((p: any) => Number(p.tCicilan_id_cicilan) === cicilanId && p.status !== 'ditolak')
        .reduce((total: number, p: any) => total + Number(p.total || 0), 0);
      return Math.max(0, Number(this.selectedCicilan.nominal || 0)
        + Number(this.selectedCicilan.denda_berjalan || 0) - alreadyPaid);
    }

    const alreadyPaid = this.tagihan.payments
      .filter((p: any) => p.status !== 'ditolak')
      .reduce((total: number, p: any) => total + Number(p.total || 0), 0);
    return Math.max(0, this.tagihan.totalBerjalan - alreadyPaid);
  }

  get nominalPembayaranSekarang(): number {
    return this.sisaBayar;
  }

  pilihCicilan(cicilan: any): void {
    if (cicilan.status === 'lunas') return;
    this.selectedCicilan = cicilan;
    this.hapusFile();
    this.cdr.markForCheck();
  }

  batalkanPilihanCicilan(): void {
    this.selectedCicilan = null;
    this.hapusFile();
    this.cdr.markForCheck();
  }

  ajukanCicilan(): void {
    if (!this.bolehMengajukanCicilan) return;
    const count = Number(this.jumlahCicilan);
    if (!Number.isInteger(count) || count < 2 || count > 12) {
      alert('Jumlah cicilan harus antara 2 sampai 12 kali.');
      return;
    }
    if (!this.alasanCicilan.trim()) {
      alert('Tuliskan alasan pengajuan cicilan terlebih dahulu.');
      return;
    }

    this.mengajukanCicilan = true;
    this.api.ajukanCicilan({
      tTagihan_id_tagihan: this.tagihan.id,
      jumlah_cicilan: count,
      alasan: this.alasanCicilan.trim()
    }).subscribe({
      next: (response: any) => {
        this.mengajukanCicilan = false;
        this.showCicilanForm = false;
        this.alasanCicilan = '';
        alert(response?.message || 'Pengajuan cicilan berhasil dikirim.');
        this.loadTagihan(this.tagihan.kode);
      },
      error: (error: any) => {
        this.mengajukanCicilan = false;
        this.cdr.markForCheck();
        alert(error?.error?.message || 'Pengajuan cicilan gagal dikirim.');
      }
    });
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  formatTanggal(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
  }

  perkiraanCicilan(count: number): number {
    const total = Math.max(0, Math.round(Number(this.tagihan.nominal) || 0));
    return count > 0 ? Math.floor(total / count) : total;
  }

  dendaCicilan(cicilan: any): number {
    return Number(cicilan?.denda_berjalan || 0);
  }

  nominalTotalCicilan(cicilan: any): number {
    return Number(cicilan?.nominal || 0) + this.dendaCicilan(cicilan);
  }

  cicilanDipilih(cicilan: any): boolean {
    return Number(this.selectedCicilan?.id_cicilan) === Number(cicilan?.id_cicilan);
  }

  pilihFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    const tipeValid = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
    if (!tipeValid) {
      alert('Format file harus JPG, PNG, atau PDF.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5 MB.');
      input.value = '';
      return;
    }

    this.fileBukti = file;
    this.namaFile = file.name;
    if (this.pratinjauUrl) URL.revokeObjectURL(this.pratinjauUrl);
    this.pratinjauUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    this.cdr.markForCheck();
  }

  hapusFile(): void {
    this.fileBukti = null;
    this.namaFile = '';
    if (this.pratinjauUrl) URL.revokeObjectURL(this.pratinjauUrl);
    this.pratinjauUrl = '';
  }

  metodeDiubah(value: string): void {
    this.metode = value === 'langsung' ? 'langsung' : 'transfer';

    if (this.metode === 'langsung') {
      this.hapusFile();
    }

    this.showConfirmation = false;
    this.cdr.markForCheck();
  }

  kirimBukti(): void {
    if (this.tagihan.contractStatus === 'selesai') {
      alert('Kontrak sudah selesai. Tagihan ini hanya tersedia sebagai riwayat dan tidak dapat menerima pembayaran baru.');
      return;
    }
    if (!this.bolehMengirimBukti) {
      if (this.tagihan.status === 'lunas') alert('Tagihan ini sudah lunas.');
      else if (this.menungguVerifikasi) alert('Pengajuan pembayaran sebelumnya sedang diverifikasi. Tunggu keputusan pengelola terlebih dahulu.');
      return;
    }

    if (this.metode === 'transfer' && !this.fileBukti) {
      alert('Pilih file bukti transfer terlebih dahulu.');
      return;
    }

    if (this.metode === 'langsung') {
      this.showConfirmation = true;
      this.cdr.markForCheck();
      return;
    }

    this.showConfirmation = true;
    this.cdr.markForCheck();
  }

  konfirmasiKirim(): void {
    if (!this.tagihan.id || this.submitting) return;
    if (this.metode === 'transfer' && !this.fileBukti) {
      this.showConfirmation = false;
      alert('Pilih file bukti transfer terlebih dahulu.');
      this.cdr.markForCheck();
      return;
    }
    if (this.sisaBayar <= 0) {
      this.showConfirmation = false;
      alert('Tidak ada sisa tagihan yang dapat diajukan.');
      this.cdr.markForCheck();
      return;
    }

    const data = new FormData();
    data.append('tTagihan_id_tagihan', String(this.tagihan.id));
    data.append('total', String(this.nominalPembayaranSekarang));
    if (this.selectedCicilan) {
      data.append('tCicilan_id_cicilan', String(this.selectedCicilan.id_cicilan));
    }
    data.append('metode_pembayaran', this.metode);
    if (this.metode === 'transfer' && this.fileBukti) {
      data.append('bukti_pembayaran', this.fileBukti, this.fileBukti.name);
    }
    data.append('catatan', this.catatan.trim());

    this.submitting = true;
    this.submitMessage = '';
    this.cdr.markForCheck();

    this.api.createPembayaran(data).subscribe({
      next: (response: any) => {
        this.submitting = false;
        this.showConfirmation = false;
        this.submitMessage = response?.message || (
          this.metode === 'langsung'
            ? 'Pengajuan pembayaran langsung berhasil dikirim dan menunggu verifikasi owner.'
            : 'Bukti transfer berhasil dikirim dan menunggu verifikasi owner.'
        );
        this.cdr.markForCheck();
        alert(this.submitMessage);
        this.router.navigateByUrl('/tenant/payment-history');
      },
      error: (error: any) => {
        console.error('Gagal mengajukan pembayaran:', error);
        this.submitting = false;
        this.showConfirmation = false;
        const errors = error?.error?.errors;
        const firstKey = errors ? Object.keys(errors)[0] : null;
        this.submitMessage = (firstKey && errors[firstKey]?.[0])
          || error?.error?.message
          || 'Pengajuan pembayaran gagal dikirim. Silakan coba kembali.';
        this.cdr.markForCheck();
        alert(this.submitMessage);
      }
    });
  }

  kembali(): void {
    this.router.navigateByUrl('/tenant/billing');
  }
}

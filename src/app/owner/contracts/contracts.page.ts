import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, checkmarkCircleOutline, closeCircleOutline, informationCircleOutline, logOutOutline, searchOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';

addIcons({
  searchOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  informationCircleOutline,
  logOutOutline
});

interface Contract {
  id: string;
  number: string;
  tenantId: string;
  roomId: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  rentalPrice: number;
  deposit: number;
  duration: number;
  bundleName: string;
  bundleNormalPrice: number;
  bundleDiscount: number;
  bundlePrice: number;
  status: 'MENUNGGU_PEMBAYARAN' | 'AKTIF' | 'SELESAI' | 'DIBATALKAN';
  reservationId: string;

  tenant?: Tenant;
  property?: Property;
  room?: Room;
  roomType?: RoomType;
  checkoutDate?: string | null;
  terminationReason?: string | null;
  terminationNote?: string | null;
  exitRequestStatus?: 'tidak_ada' | 'menunggu' | 'disetujui' | 'ditolak' | 'selesai';
  exitRequestDate?: string | null;
  exitRequestReason?: string | null;
  exitRequestOwnerNote?: string | null;
}


interface ExitRequest {
  id: string;
  contractId: string;
  contractNumber: string;
  tenantName: string;
  propertyName: string;
  roomNumber: string;
  plannedDate: string;
  reason: string;
  status: 'menunggu' | 'disetujui' | 'ditolak' | 'selesai';
  ownerNote?: string | null;
}

interface Tenant {
  id: string;
  name: string;
}

interface Property {
  id: string;
  name: string;
}

interface Room {
  id: string;
  number: string;
  roomTypeId: string;
}

interface RoomType {
  id: string;
  name: string;
}

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.page.html',
  styleUrls: ['./contracts.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonModal
  ]
})
export class ContractsPage {
  @ViewChild('contractDetailModal') contractDetailModal?: IonModal;


  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {
    this.loadProperties();
    this.loadContracts();
    this.loadExitRequests();
  }

  search = '';
  selectedPropertyId = 'all';
  properties: Property[] = [];
  tab = 'all';

  selectedContract: Contract | null = null;
  downloadingContract = false;
  contractDownloadError = '';
  contractDownloadNotice = '';

  timeline = [
    'Pendaftaran',
    'Kontrak Dibuat',
    'Pembayaran',
    'Verifikasi',
    'Kontrak Aktif',
    'Kontrak Selesai'
  ];

  contracts: Contract[] = [];
  exitRequests: ExitRequest[] = [];
  showEndContractForm = false;
  endingContract = false;
  endContractError = '';
  showEndConfirmationModal = false;
  endConfirmationError = '';
  showExitDecisionModal = false;
  processingExitDecision = false;
  exitDecisionError = '';
  exitDecisionNote = '';
  pendingExitDecision: { item: ExitRequest; status: 'disetujui' | 'ditolak' } | null = null;
  showFeedbackModal = false;
  feedbackTitle = '';
  feedbackMessage = '';
  feedbackType: 'success' | 'error' | 'info' = 'success';
  private feedbackAfterModal: { title: string; message: string; type: 'success' | 'error' | 'info' } | null = null;
  todayDate = this.localDateToday();
  endForm: {
    tgl_keluar: string;
    alasan_pengakhiran: 'kontrak_berakhir' | 'permintaan_penghuni' | 'keputusan_owner';
    catatan_pengakhiran: string;
  } = {
    tgl_keluar: this.localDateToday(),
    alasan_pengakhiran: 'kontrak_berakhir',
    catatan_pengakhiran: ''
  };

  loadProperties(): void {
    this.api.getKos().subscribe({
      next: (data: any[]) => {
        this.properties = (Array.isArray(data) ? data : []).map(item => ({
          id: String(item.id_kos),
          name: item.nama_kos
        }));
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Gagal mengambil daftar kos:', error);
      }
    });
  }

  loadContracts(): void {
    this.api.getKontrak().subscribe({
      next: (data: any[]) => {
        this.contracts = data.map(item => ({
          id: String(item.id_kontrak),
          number: item.no_kontrak,

          tenantId: String(item.tPenghuni_id_penghuni),
          roomId: String(item.tKamar_id_kamar),
          propertyId: String(item.kamar?.tKos_id_kos),

          startDate: item.tgl_mulai,
          endDate: item.tgl_selesai,
          checkoutDate: item.tgl_keluar || null,
          terminationReason: item.alasan_pengakhiran || null,
          terminationNote: item.catatan_pengakhiran || null,
          exitRequestStatus: item.status_permintaan_keluar || 'tidak_ada',
          exitRequestDate: item.tgl_rencana_keluar || null,
          exitRequestReason: item.alasan_keluar || null,
          exitRequestOwnerNote: item.catatan_owner_keluar || null,

          rentalPrice: Number(item.harga_sewa || 0),
          deposit: Number(item.deposit || 0),

          duration: Number(
            item.pendaftaran?.durasi_sewa || 1
          ),
          bundleName: String(item.nama_bundle || ''),
          bundleNormalPrice: Number(item.harga_normal_bundle || 0),
          bundleDiscount: Number(item.potongan_bundle || 0),
          bundlePrice: Number(item.harga_bundle || 0),

          status: item.status.toUpperCase() as
            | 'MENUNGGU_PEMBAYARAN'
            | 'AKTIF'
            | 'SELESAI'
            | 'DIBATALKAN',

          reservationId: String(
            item.tPendaftaran_id_pendaftaran
          ),

          tenant: item.penghuni?.user ? {
            id: String(item.penghuni.id_penghuni),
            name: item.penghuni.user.nama
          } : undefined,

          property: item.kamar?.kos ? {
            id: String(item.kamar.kos.id_kos),
            name: item.kamar.kos.nama_kos
          } : undefined,

          room: item.kamar ? {
            id: String(item.kamar.id_kamar),
            number: String(item.kamar.no_kamar),
            roomTypeId: String(
              item.kamar.tJenisKamar_id_jenisKamar
            )
          } : undefined,

          roomType: item.kamar?.jenis_kamar ? {
            id: String(
              item.kamar.jenis_kamar.id_jenisKamar
            ),
            name: item.kamar.jenis_kamar.nama_jenis
          } : undefined
        }));
        this.cdr.detectChanges();
        console.log('Data kontrak:', this.contracts);
      },

      error: (error) => {
        console.error(
          'Gagal mengambil data kontrak:',
          error
        );
      }
    });
  }

  loadExitRequests(): void {
    this.api.getPermintaanKeluar().subscribe({
      next: (data: any[]) => {
        // Endpoint mengembalikan kontrak yang menyimpan permintaan keluar,
        // bukan baris dari tabel permintaan terpisah.
        this.exitRequests = (Array.isArray(data) ? data : []).filter(item => item.status_permintaan_keluar === 'menunggu').map(item => ({
          id: String(item.id_kontrak),
          contractId: String(item.id_kontrak),
          contractNumber: item.no_kontrak || `KTR-${item.id_kontrak}`,
          tenantName: item.penghuni?.user?.nama || 'Penghuni',
          propertyName: item.kamar?.kos?.nama_kos || '-',
          roomNumber: String(item.kamar?.no_kamar ?? '-'),
          plannedDate: item.tgl_rencana_keluar || '',
          reason: item.alasan_keluar || '-',
          status: item.status_permintaan_keluar,
          ownerNote: item.catatan_owner_keluar || null
        }));
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal mengambil permintaan keluar:', error);
      }
    });
  }

  get pendingExitRequestCount(): number {
    return this.exitRequests.filter(item => item.status === 'menunggu').length;
  }

  getExitRequestStatusLabel(status: ExitRequest['status']): string {
    switch (status) {
      case 'menunggu': return 'Menunggu';
      case 'disetujui': return 'Disetujui';
      case 'ditolak': return 'Ditolak';
      default: return 'Selesai';
    }
  }

  decideExitRequest(item: ExitRequest, status: 'disetujui' | 'ditolak'): void {
    this.pendingExitDecision = { item, status };
    this.exitDecisionNote = '';
    this.exitDecisionError = '';
    this.showExitDecisionModal = true;
  }

  confirmExitRequestDecision(): void {
    if (!this.pendingExitDecision || this.processingExitDecision) {
      return;
    }

    const { item, status } = this.pendingExitDecision;
    this.processingExitDecision = true;
    this.exitDecisionError = '';

    this.api.updatePermintaanKeluarStatus(
      item.id,
      status,
      this.exitDecisionNote.trim()
    ).subscribe({
      next: (response: any) => {
        this.processingExitDecision = false;
        this.pendingExitDecision = null;
        this.showExitDecisionModal = false;
        this.feedbackAfterModal = {
          title: 'Berhasil diproses',
          message: response?.message || 'Permintaan keluar penghuni berhasil diproses.',
          type: 'success'
        };
        this.loadExitRequests();
        this.loadContracts();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.processingExitDecision = false;
        this.exitDecisionError = error?.error?.message || 'Permintaan keluar gagal diproses. Silakan coba lagi.';
        this.cdr.detectChanges();
      }
    });
  }

  onExitDecisionModalDismiss(): void {
    this.showExitDecisionModal = false;
    this.pendingExitDecision = null;
    this.processingExitDecision = false;
    this.exitDecisionError = '';
    this.openPendingFeedback();
  }

  openContractFromRequest(item: ExitRequest): void {
    const contract = this.contracts.find(row => row.id === item.contractId);
    if (!contract) {
      this.openFeedback(
        'Kontrak tidak ditemukan',
        'Muat ulang halaman lalu coba buka detail kontrak kembali.',
        'error'
      );
      return;
    }
    this.openDetail(contract);
  }

  private openFeedback(title: string, message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.feedbackTitle = title;
    this.feedbackMessage = message;
    this.feedbackType = type;
    this.showFeedbackModal = true;
  }

  private openPendingFeedback(): void {
    if (!this.feedbackAfterModal) {
      return;
    }

    const feedback = this.feedbackAfterModal;
    this.feedbackAfterModal = null;
    this.openFeedback(feedback.title, feedback.message, feedback.type);
  }

  hasApprovedExitRequest(contractId: string): boolean {
    const contract = this.contracts.find(item => item.id === contractId);
    return contract?.exitRequestStatus === 'disetujui'
      || this.exitRequests.some(item => item.contractId === contractId && item.status === 'disetujui');
  }

  private localDateToday(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  }

  get filteredContracts(): Contract[] {
    return this.contracts.filter(contract => {

      if (this.selectedPropertyId !== 'all' && contract.propertyId !== this.selectedPropertyId) {
        return false;
      }

      if (this.tab !== 'all' && contract.status !== this.tab) {
        return false;
      }

      const tenant = this.getTenant(contract);

      const keyword = this.search.trim().toLowerCase();

      if (keyword) {
        const numberMatch =
          contract.number.toLowerCase().includes(keyword);

        const tenantMatch =
          tenant?.name.toLowerCase().includes(keyword);

        if (!numberMatch && !tenantMatch) {
          return false;
        }
      }

      return true;
    });
  }

  get activeCount(): number {
    return this.contracts.filter(
      contract => contract.status === 'AKTIF'
    ).length;
  }

  get completedCount(): number {
    return this.contracts.filter(
      contract => contract.status === 'SELESAI'
    ).length;
  }

  get cancelledCount(): number {
    return this.contracts.filter(
      contract => contract.status === 'DIBATALKAN'
    ).length;
  }

  setTab(tab: string) {
    this.tab = tab;
  }

  openDetail(contract: Contract) {
    this.contractDownloadError = '';
    this.contractDownloadNotice = '';
    this.selectedContract = contract;
  }

  closeDetail() {
    this.selectedContract = null;
    this.showEndContractForm = false;
    this.showEndConfirmationModal = false;
    this.endingContract = false;
    this.endContractError = '';
    this.endConfirmationError = '';
    this.openPendingFeedback();
  }

  getTenant(contract: Contract): Tenant | undefined {
    return contract.tenant;
  }

  getProperty(contract: Contract): Property | undefined {
    return contract.property;
  }

  getRoom(contract: Contract): Room | undefined {
    return contract.room;
  }

  getRoomType(contract: Contract): RoomType | undefined {
    return contract.roomType;
  }

  getStatusIndex(status: Contract['status']): number {
    if (status === 'MENUNGGU_PEMBAYARAN') {
      return 2;
    }

    if (status === 'AKTIF') {
      return 4;
    }

    if (status === 'SELESAI') {
      return 5;
    }

    return 0;
  }

  getTerminationLabel(reason: string | null | undefined): string {
    switch (reason) {
      case 'kontrak_berakhir': return 'Masa kontrak berakhir';
      case 'permintaan_penghuni': return 'Permintaan penghuni';
      case 'keputusan_owner': return 'Keputusan owner';
      default: return '-';
    }
  }

  getStatusLabel(status: Contract['status']): string {
    if (status === 'MENUNGGU_PEMBAYARAN') {
      return 'Menunggu Pembayaran';
    }

    if (status === 'AKTIF') {
      return 'Aktif';
    }

    if (status === 'SELESAI') {
      return 'Selesai';
    }

    return 'Dibatalkan';
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  downloadContract(): void {
    if (!this.selectedContract || this.downloadingContract) {
      return;
    }

    const contractId = this.selectedContract.id;
    const contractNumber = this.selectedContract.number;
    this.downloadingContract = true;
    this.contractDownloadError = '';
    this.contractDownloadNotice = '';

    this.api.downloadKontrak(contractId).subscribe({
      next: (blob: Blob) => {
        if (!blob || blob.size === 0) {
          this.contractDownloadError = 'File kontrak kosong atau tidak dapat diunduh.';
          this.downloadingContract = false;
          this.cdr.detectChanges();
          return;
        }

        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        pdfBlob.slice(0, 5).text().then(signature => {
          if (!signature.includes('%PDF-')) {
            this.contractDownloadError = 'Respons server bukan file PDF yang valid. Silakan muat ulang halaman atau hubungi administrator.';
            this.downloadingContract = false;
            this.cdr.detectChanges();
            return;
          }

          const blobUrl = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `${contractNumber || 'kontrak'}.pdf`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          link.remove();

          // URL dibiarkan hidup lebih lama agar browser atau IDM sempat mengambil blob.
          window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
          this.downloadingContract = false;
          this.contractDownloadNotice = 'Unduhan telah dimulai. Periksa daftar unduhan browser atau Internet Download Manager.';
          this.cdr.detectChanges();
        }).catch((error: any) => {
          console.error('Gagal memvalidasi file kontrak:', error);
          this.contractDownloadError = 'File kontrak tidak dapat diperiksa. Silakan coba lagi.';
          this.downloadingContract = false;
          this.cdr.detectChanges();
        });
      },
      error: async (error: any) => {
        console.error('Gagal download kontrak:', error);
        this.downloadingContract = false;

        // Beberapa integrasi download manager memutus respons XHR setelah mengambil file.
        // Status 0 tidak cukup untuk menyimpulkan bahwa file gagal diunduh, jadi tampilkan
        // pemberitahuan netral dan minta pengguna memeriksa daftar unduhan.
        if (error?.status === 0) {
          this.contractDownloadNotice = 'Aplikasi tidak menerima konfirmasi dari browser. Periksa daftar unduhan browser atau Internet Download Manager sebelum mencoba kembali.';
          this.cdr.detectChanges();
          return;
        }

        let serverMessage = '';
        if (error?.error instanceof Blob) {
          try {
            const responseText = await error.error.text();
            try {
              const parsed = JSON.parse(responseText);
              serverMessage = parsed?.message || '';
            } catch {
              serverMessage = responseText.slice(0, 180);
            }
          } catch {
            serverMessage = '';
          }
        } else {
          serverMessage = error?.error?.message || '';
        }

        this.contractDownloadError = serverMessage || 'Kontrak gagal diunduh. Periksa koneksi dan coba lagi.';
        this.cdr.detectChanges();
      }
    });
  }

  endContract(): void {
    if (!this.selectedContract || this.selectedContract.status !== 'AKTIF') {
      return;
    }

    this.endContractError = '';
    this.endConfirmationError = '';
    const endDate = String(this.selectedContract.endDate || '').slice(0, 10);
    const adaPersetujuanKeluar = this.selectedContract.exitRequestStatus === 'disetujui'
      || this.hasApprovedExitRequest(this.selectedContract.id);
    this.endForm = {
      tgl_keluar: this.todayDate,
      alasan_pengakhiran: adaPersetujuanKeluar
        ? 'permintaan_penghuni'
        : endDate && endDate <= this.todayDate
          ? 'kontrak_berakhir'
          : 'keputusan_owner',
      catatan_pengakhiran: ''
    };
    this.showEndContractForm = !this.showEndContractForm;
  }


  submitEndContract(): void {
    if (!this.selectedContract || this.endingContract) {
      return;
    }

    if (!this.endForm.tgl_keluar || this.endForm.tgl_keluar > this.todayDate) {
      this.endContractError = 'Tanggal keluar tidak boleh melebihi hari ini.';
      return;
    }

    this.endContractError = '';
    this.endConfirmationError = '';
    this.showEndConfirmationModal = true;
  }

  confirmEndContract(): void {
    if (!this.selectedContract || this.endingContract) {
      return;
    }

    this.endingContract = true;
    this.endConfirmationError = '';
    this.api.endKontrak(this.selectedContract.id, this.endForm).subscribe({
      next: async (response: any) => {
        this.loadContracts();
        this.loadExitRequests();
        this.feedbackAfterModal = {
          title: 'Kontrak berhasil diakhiri',
          message: response?.message || 'Kontrak berhasil diakhiri dan status kamar telah diperbarui.',
          type: 'success'
        };
        this.cdr.detectChanges();
        if (this.contractDetailModal) {
          await this.contractDetailModal.dismiss();
        } else {
          this.closeDetail();
        }
      },
      error: (error: any) => {
        this.endConfirmationError = error?.error?.message || 'Kontrak gagal diakhiri. Silakan coba lagi.';
        this.endingContract = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal = false;
  }

  get waitingPaymentCount(): number {
    return this.contracts.filter(
      contract => contract.status === 'MENUNGGU_PEMBAYARAN'
    ).length;
  }
}
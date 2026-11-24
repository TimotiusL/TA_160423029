import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { ApiService } from '../../services/api';
import { finalize, timeout } from 'rxjs';

interface ComplaintResponse {
  id: number;
  authorName: string;
  role: 'tenant' | 'owner';
  date: string;
  content: string;
}

interface ComplaintItem {
  id: number;
  title: string;
  description: string;
  status: 'BARU' | 'DIPROSES' | 'SELESAI';
  date: string;
  responses: ComplaintResponse[];
}

@Component({
  selector: 'app-tenant-complaints',
  standalone: true,
  templateUrl: './complaints.page.html',
  styleUrls: ['./complaints.page.scss'],
  imports: [CommonModule, FormsModule, RouterLink, IonContent]
})
export class ComplaintsPage {
  showNew = false;
  selected: ComplaintItem | null = null;
  toastMessage = '';
  replyText = '';
  loading = true;
  submitting = false;
  sendingReply = false;
  hasActiveContract = false;
  errorMessage = '';
  form = { title: '', description: '' };
  complaints: ComplaintItem[] = [];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ionViewWillEnter(): void {
    this.loadComplaints();
  }

  /**
   * Komplain hanya tersedia untuk penghuni dengan kontrak berstatus aktif.
   * Acuan status disamakan dengan halaman Kontrak dan Dashboard; tanggal akhir
   * sewa tidak otomatis menonaktifkan kontrak selama status database masih aktif.
   */
  loadComplaints(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.api.getKontrak().pipe(
      timeout({ first: 15000 })
    ).subscribe({
      next: (response: any) => {
        const contracts = this.extractRows(response);
        this.hasActiveContract = contracts.some((contract: any) =>
          String(contract?.status || '').toLowerCase() === 'aktif'
        );

        if (!this.hasActiveContract) {
          this.complaints = [];
          this.selected = null;
          this.showNew = false;
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        this.fetchComplaintList(true);
      },
      error: (error: any) => {
        console.error('Gagal memeriksa kontrak aktif tenant:', error);
        this.hasActiveContract = false;
        this.loading = false;
        this.errorMessage = error?.name === 'TimeoutError'
          ? 'Pemeriksaan kontrak memerlukan waktu terlalu lama. Silakan coba lagi.'
          : error?.error?.message || 'Status kontrak tidak dapat diperiksa. Pastikan koneksi ke server tersedia.';
        this.cdr.detectChanges();
      }
    });
  }

  private applyComplaintRows(response: any): void {
    const list = this.extractRows(response);
    this.complaints = list.map((item: any) => this.mapComplaint(item));

    if (this.selected) {
      this.selected = this.complaints.find(item => item.id === this.selected?.id) || this.selected;
    }
  }

  private extractRows(response: any): any[] {
    const payload = response?.data ?? response?.kontrak ?? response;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  private fetchComplaintList(showPageLoading: boolean): void {
    if (showPageLoading) this.loading = true;

    this.api.getTenantKomplain().pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        if (showPageLoading) this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response: any) => {
        // Kelayakan kontrak sudah diperiksa melalui GET /kontrak. Respons daftar
        // komplain hanya dipakai untuk menyinkronkan riwayat, bukan mengubah statusnya.
        this.applyComplaintRows(response);
        this.errorMessage = '';
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal memuat komplain tenant:', error);
        if (showPageLoading) {
          this.errorMessage = error?.name === 'TimeoutError'
            ? 'Pengambilan daftar komplain memerlukan waktu lebih dari 15 detik. Silakan coba lagi.'
            : error?.error?.message || 'Komplain gagal dimuat. Pastikan kamu sudah login dan memiliki profil penghuni.';
        } else {
          // Refresh latar belakang tidak menghapus pesan yang sudah tampil secara optimistis.
          this.toast('Pesan sudah diproses, tetapi riwayat chat belum berhasil diperbarui. Coba buka kembali percakapan.');
        }
        this.cdr.detectChanges();
      }
    });
  }

  private mapComplaint(item: any): ComplaintItem {
    const responses = Array.isArray(item.tanggapan) ? item.tanggapan : [];
    const status: ComplaintItem['status'] = item.status === 'terjawab'
      ? 'SELESAI'
      : (responses.length > 0 ? 'DIPROSES' : 'BARU');

    return {
      id: Number(item.id_komplain),
      title: item.judul || 'Komplain',
      description: item.deskripsi || '',
      status,
      date: item.tgl_komplain || '',
      responses: responses.map((reply: any) => ({
        id: Number(reply.id_tanggapan),
        authorName: reply.nama_pengirim || 'Pengguna',
        role: reply.role === 'penghuni' ? 'tenant' : 'owner',
        date: reply.tgl_tanggapan || '',
        content: reply.tanggapan || ''
      }))
    };
  }

  countStatus(status: string): number {
    return this.complaints.filter(item => item.status === status).length;
  }

  openDetail(item: ComplaintItem): void {
    this.selected = item;
    this.replyText = '';
  }

  closeDetail(): void {
    this.selected = null;
    this.replyText = '';
  }

  submitComplaint(): void {
    if (!this.hasActiveContract) {
      this.toast('Komplain hanya dapat dibuat saat kamu memiliki kontrak kos yang aktif.');
      return;
    }

    const title = this.form.title.trim();
    const description = this.form.description.trim();

    if (!title || !description) {
      this.toast('Isi judul dan deskripsi komplain terlebih dahulu.');
      return;
    }
    if (title.length > 45) {
      this.toast('Judul komplain maksimal 45 karakter.');
      return;
    }
    if (description.length > 100) {
      this.toast('Deskripsi komplain maksimal 100 karakter sesuai database.');
      return;
    }
    if (this.submitting) return;

    this.submitting = true;
    this.api.createTenantKomplain({ judul: title, deskripsi: description }).pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        this.submitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response: any) => {
        this.showNew = false;
        this.form = { title: '', description: '' };
        this.toast(response?.message || 'Komplain berhasil dikirim ke pengelola.');
        this.fetchComplaintList(false);
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        const validation = error?.error?.errors;
        const key = validation ? Object.keys(validation)[0] : null;
        this.toast((key && validation[key]?.[0]) || error?.error?.message || 'Komplain gagal dikirim.');
        this.cdr.detectChanges();
      }
    });
  }

  sendReply(): void {
    if (!this.selected || !this.replyText.trim() || this.sendingReply) return;
    if (this.replyText.trim().length > 100) {
      this.toast('Balasan maksimal 100 karakter sesuai database.');
      return;
    }

    const complaintId = this.selected.id;
    const message = this.replyText.trim();
    this.sendingReply = true;

    this.api.replyTenantKomplain(complaintId, message).pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        this.sendingReply = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response: any) => {
        // Tampilkan pesan segera setelah POST berhasil, tanpa menunggu GET ulang.
        // Refresh dilakukan setelahnya untuk mengganti ID/timestamp sementara
        // dengan data resmi dari database.
        const optimisticReply: ComplaintResponse = {
          id: -Date.now(),
          authorName: this.currentTenantName(),
          role: 'tenant',
          date: new Date().toISOString(),
          content: message
        };

        if (this.selected?.id === complaintId) {
          const updated: ComplaintItem = {
            ...this.selected,
            status: 'DIPROSES',
            responses: [...this.selected.responses, optimisticReply]
          };
          this.selected = updated;
          this.complaints = this.complaints.map(item => item.id === complaintId ? updated : item);
        }

        this.replyText = '';
        this.toast(response?.message || 'Pesan berhasil dikirim ke pengelola.');
        this.fetchComplaintList(false);
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.toast(error?.name === 'TimeoutError'
          ? 'Belum menerima konfirmasi dari server. Riwayat percakapan sedang diperiksa kembali.'
          : error?.error?.message || 'Pesan gagal dikirim. Silakan coba lagi.');
        // Jika server sempat menyimpan pesan sebelum koneksi terputus,
        // GET ulang akan menyinkronkan chat tanpa membuat balasan ganda.
        this.fetchComplaintList(false);
        this.cdr.detectChanges();
      }
    });
  }

  private currentTenantName(): string {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user?.nama || user?.name || 'Saya';
    } catch {
      return 'Saya';
    }
  }

  toast(message: string): void {
    this.toastMessage = message;
    this.cdr.detectChanges();
    window.setTimeout(() => {
      this.toastMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  tanggal(value: string): string {
    if (!value) return '-';
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }
}

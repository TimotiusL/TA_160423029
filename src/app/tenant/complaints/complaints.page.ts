import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { ApiService } from '../../services/api';

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
  imports: [CommonModule, FormsModule, IonContent]
})
export class ComplaintsPage {
  showNew = false;
  selected: ComplaintItem | null = null;
  toastMessage = '';
  replyText = '';
  loading = false;
  submitting = false;
  sendingReply = false;
  errorMessage = '';
  form = { title: '', description: '' };
  complaints: ComplaintItem[] = [];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}


  ionViewWillEnter(): void {
    this.loadComplaints();
  }

  loadComplaints(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.getTenantKomplain().subscribe({
      next: (response: any) => {
        const list: any[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.data) ? response.data : [];

        this.complaints = list.map((item: any) => this.mapComplaint(item));
        if (this.selected) {
          this.selected = this.complaints.find(item => item.id === this.selected?.id) || null;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal memuat komplain tenant:', error);
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Komplain gagal dimuat. Pastikan kamu sudah login dan memiliki profil penghuni.';
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
    this.api.createTenantKomplain({ judul: title, deskripsi: description }).subscribe({
      next: (response: any) => {
        this.submitting = false;
        this.showNew = false;
        this.form = { title: '', description: '' };
        this.toast(response?.message || 'Komplain berhasil dikirim ke pengelola.');
        this.loadComplaints();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.submitting = false;
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

    this.sendingReply = true;
    this.api.replyTenantKomplain(this.selected.id, this.replyText.trim()).subscribe({
      next: (response: any) => {
        this.sendingReply = false;
        this.replyText = '';
        this.toast(response?.message || 'Pesan berhasil dikirim ke pengelola.');
        this.loadComplaints();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.sendingReply = false;
        this.toast(error?.error?.message || 'Pesan gagal dikirim.');
        this.cdr.detectChanges();
      }
    });
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

import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef  } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';

addIcons({ searchOutline });

interface ComplaintResponse {
  id: number;
  authorName: string;
  authorRole: 'admin' | 'penghuni';
  content: string;
  date: string;
}

interface Complaint {
  id: number;
  tenantId: number;
  tenantName: string;
  propertyName: string;
  roomNumber: number | null;
  title: string;
  description: string;
  status: 'menunggu' | 'terjawab';
  date: string;
  responses: ComplaintResponse[];
}

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonModal],
  templateUrl: './complaints.page.html',
  styleUrls: ['./complaints.page.scss']
})
export class ComplaintsPage implements OnInit {
  search = '';
  tab: 'all' | 'menunggu' | 'terjawab' = 'all';
  selected: Complaint | null = null;
  response = '';

  complaints: Complaint[] = [];
  loading = false;
  savingResponse = false;
  savingStatus = false;

  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'info' = 'success';

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadComplaints();
  }

  loadComplaints(): void {
    this.loading = true;

    this.api.getKomplain().subscribe({
      next: (data: any[]) => {
        this.complaints = data.map(item => ({
          id: Number(item.id_komplain),
          tenantId: Number(item.tPenghuni_id_penghuni),
          tenantName: item.nama_penghuni || 'Penghuni',
          propertyName: item.nama_kos || '-',
          roomNumber: item.no_kamar == null ? null : Number(item.no_kamar),
          title: item.judul,
          description: item.deskripsi,
          status: item.status,
          date: item.tgl_komplain,
          responses: (item.tanggapan || []).map((reply: any) => ({
            id: Number(reply.id_tanggapan),
            authorName: reply.nama_pengirim || 'Pengguna',
            authorRole: reply.role === 'admin' ? 'admin' : 'penghuni',
            content: reply.tanggapan,
            date: reply.tgl_tanggapan
          }))
        }));

        if (this.selected) {
          this.selected = this.complaints.find(c => c.id === this.selected?.id) || null;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.showToastMessage('Gagal memuat komplain. Periksa koneksi API.', 'info');
      }
    });
  }

  get filteredComplaints(): Complaint[] {
    return this.complaints.filter(complaint => {
      if (this.tab !== 'all' && complaint.status !== this.tab) {
        return false;
      }

      const keyword = this.search.trim().toLowerCase();
      if (!keyword) return true;

      return complaint.title.toLowerCase().includes(keyword)
        || complaint.tenantName.toLowerCase().includes(keyword);
    });
  }

  get totalCount(): number {
    return this.complaints.length;
  }

  get waitingCount(): number {
    return this.complaints.filter(c => c.status === 'menunggu').length;
  }

  get answeredCount(): number {
    return this.complaints.filter(c => c.status === 'terjawab').length;
  }

  getInitial(name: string): string {
    return name?.charAt(0) || '?';
  }

  formatDate(date: string): string {
    if (!date) return '-';

    const parsed = new Date(date.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return date;

    return parsed.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  selectComplaint(complaint: Complaint): void {
    this.selected = complaint;
    this.response = '';
  }

  closeModal(): void {
    this.selected = null;
    this.response = '';
  }

  sendResponse(): void {
    if (!this.selected || !this.response.trim() || this.savingResponse) return;

    this.savingResponse = true;
    this.api.kirimTanggapan(this.selected.id, this.response.trim()).subscribe({
      next: () => {
        this.savingResponse = false;
        this.response = '';
        this.showToastMessage('Tanggapan berhasil dikirim.', 'success');
        this.loadComplaints();
      },
      error: (error) => {
        this.savingResponse = false;
        const message = error?.error?.message || 'Gagal mengirim tanggapan.';
        this.showToastMessage(message, 'info');
      }
    });
  }

  markAnswered(): void {
    if (!this.selected || this.savingStatus) return;

    this.savingStatus = true;
    this.api.updateStatusKomplain(this.selected.id, 'terjawab').subscribe({
      next: () => {
        this.savingStatus = false;
        this.showToastMessage('Status komplain diubah menjadi terjawab.', 'success');
        this.loadComplaints();
      },
      error: (error) => {
        this.savingStatus = false;
        const message = error?.error?.message || 'Gagal memperbarui status.';
        this.showToastMessage(message, 'info');
      }
    });
  }

  showToastMessage(message: string, type: 'success' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 2500);
  }
}

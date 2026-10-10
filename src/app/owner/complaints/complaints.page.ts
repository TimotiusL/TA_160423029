import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';

addIcons({
  searchOutline
});

interface ComplaintResponse {
  id: string;
  authorId: string;
  authorRole: 'owner' | 'tenant';
  authorName: string;
  content: string;
  date: string;
}

interface Complaint {
  id: string;
  tenantId: string;
  propertyId: string;
  roomId: string;
  title: string;
  description: string;
  category: string;
  priority: 'RENDAH' | 'SEDANG' | 'TINGGI';
  status: 'BARU' | 'DIPROSES' | 'SELESAI';
  date: string;
  responses: ComplaintResponse[];
}

interface Property {
  id: string;
  name: string;
}

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './complaints.page.html',
  styleUrls: ['./complaints.page.scss']
})
export class ComplaintsPage {

  search = '';
  tab = 'all';

  selected: Complaint | null = null;

  response = '';

  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'info' = 'success';

  properties: Property[] = [
    {
      id: 'p1',
      name: 'Kost Griya 21'
    },
    {
      id: 'p2',
      name: 'Kost Melati Residence'
    },
    {
      id: 'p3',
      name: 'Kost Mawar Residence'
    }
  ];

  tenantNames: Record<string, string> = {
    t1: 'Budi Santoso',
    t2: 'Andi Wijaya',
    t3: 'Sari Indah',
    t4: 'Kevin Pratama'
  };

  roomNums: Record<string, string> = {
    r101: '101',
    r102: '102',
    r104: '104',
    r201: '201'
  };

  complaints: Complaint[] = [
    {
      id: 'cmp1',
      tenantId: 't1',
      propertyId: 'p1',
      roomId: 'r101',
      title: 'AC tidak dingin',
      description:
        'AC di kamar saya sudah 3 hari tidak dingin, suhu tidak turun meski sudah disetel ke 16 derajat.',
      category: 'Fasilitas',
      priority: 'TINGGI',
      status: 'SELESAI',
      date: '2026-08-20',
      responses: [
        {
          id: 'cr1',
          authorId: 'owner1',
          authorRole: 'owner',
          authorName: 'Timotius',
          content:
            'Terima kasih laporan Anda. Tim teknisi akan datang besok pagi untuk memeriksa AC kamar 101.',
          date: '2026-08-21'
        },
        {
          id: 'cr2',
          authorId: 'owner1',
          authorRole: 'owner',
          authorName: 'Timotius',
          content:
            'AC sudah diperbaiki oleh teknisi hari ini. Freon telah diisi ulang. Mohon konfirmasi jika AC sudah berfungsi normal.',
          date: '2026-08-22'
        },
        {
          id: 'cr3',
          authorId: 't1',
          authorRole: 'tenant',
          authorName: 'Budi Santoso',
          content:
            'Terima kasih, AC sudah dingin kembali. Pelayanan sangat cepat!',
          date: '2026-08-22'
        }
      ]
    },

    {
      id: 'cmp2',
      tenantId: 't2',
      propertyId: 'p1',
      roomId: 'r102',
      title: 'WiFi lambat di kamar',
      description:
        'Koneksi WiFi di kamar 102 sangat lambat terutama malam hari setelah jam 19:00.',
      category: 'Fasilitas',
      priority: 'SEDANG',
      status: 'DIPROSES',
      date: '2026-08-25',
      responses: [
        {
          id: 'cr4',
          authorId: 'owner1',
          authorRole: 'owner',
          authorName: 'Timotius',
          content:
            'Kami sedang menghubungi provider untuk pengecekan jaringan di area kamar 102. Harap tunggu 1-2 hari kerja.',
          date: '2026-08-26'
        }
      ]
    },

    {
      id: 'cmp3',
      tenantId: 't3',
      propertyId: 'p1',
      roomId: 'r104',
      title: 'Kran kamar mandi bocor',
      description:
        'Kran wastafel di kamar mandi kamar 104 bocor dan meneteskan air terus menerus.',
      category: 'Perbaikan',
      priority: 'SEDANG',
      status: 'BARU',
      date: '2026-08-28',
      responses: []
    },

    {
      id: 'cmp4',
      tenantId: 't4',
      propertyId: 'p1',
      roomId: 'r201',
      title: 'Lampu lorong lantai 2 mati',
      description:
        'Beberapa lampu di lorong lantai 2 sudah mati sejak seminggu lalu.',
      category: 'Fasilitas',
      priority: 'RENDAH',
      status: 'BARU',
      date: '2026-08-27',
      responses: []
    }
  ];

  get filteredComplaints(): Complaint[] {
    return this.complaints.filter(complaint => {

      if (
        this.tab !== 'all' &&
        complaint.status !== this.tab
      ) {
        return false;
      }

      const tenantName =
        this.tenantNames[complaint.tenantId] || '';

      if (this.search.trim()) {
        const keyword =
          this.search.toLowerCase().trim();

        const titleMatch =
          complaint.title
            .toLowerCase()
            .includes(keyword);

        const tenantMatch =
          tenantName
            .toLowerCase()
            .includes(keyword);

        if (!titleMatch && !tenantMatch) {
          return false;
        }
      }

      return true;
    });
  }

  get totalCount(): number {
    return this.complaints.length;
  }

  get newCount(): number {
    return this.complaints.filter(
      complaint => complaint.status === 'BARU'
    ).length;
  }

  get processedCount(): number {
    return this.complaints.filter(
      complaint => complaint.status === 'DIPROSES'
    ).length;
  }

  get completedCount(): number {
    return this.complaints.filter(
      complaint => complaint.status === 'SELESAI'
    ).length;
  }

  getPropertyName(propertyId: string): string {
    return (
      this.properties.find(
        property => property.id === propertyId
      )?.name || '-'
    );
  }

  getTenantName(tenantId: string): string {
    return this.tenantNames[tenantId] || '-';
  }

  getRoomNumber(roomId: string): string {
    return this.roomNums[roomId] || '-';
  }

  getInitial(name: string): string {
    return name?.charAt(0) || '?';
  }

  formatDate(date: string): string {
    if (!date) {
      return '-';
    }

    const parts = date.split('-');

    if (parts.length !== 3) {
      return date;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
    if (!this.selected || !this.response.trim()) {
      return;
    }

    this.selected.responses.push({
      id: `response-${Date.now()}`,
      authorId: 'owner1',
      authorRole: 'owner',
      authorName: 'Timotius',
      content: this.response.trim(),
      date: this.getTodayDate()
    });

    this.showToastMessage(
      'Respons berhasil dikirim!',
      'success'
    );

    this.response = '';
  }

  markCompleted(): void {
    if (!this.selected) {
      return;
    }

    this.selected.status = 'SELESAI';

    this.showToastMessage(
      'Status diperbarui ke Selesai',
      'success'
    );

    this.closeModal();
  }

  markProcessed(): void {
    if (!this.selected) {
      return;
    }

    this.selected.status = 'DIPROSES';

    this.showToastMessage(
      'Status diperbarui ke Diproses',
      'info'
    );
  }

  showToastMessage(
    message: string,
    type: 'success' | 'info'
  ): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 2500);
  }

  getTodayDate(): string {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');
    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
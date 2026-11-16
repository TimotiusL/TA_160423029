import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular';
import { ApiService } from '../../services/api';

interface KosItem {
  id: number;
  nama: string;
  alamat: string;
  deskripsi: string;
  harga: number;
  tersedia: number;
  foto: string;
  fasilitas: string[];
  status: string;
  bundleAktif: boolean;
  jumlahBundle: number;
}

interface KamarItem {
  id: number;
  nomor: string;
  kos: string;
  kosId: number;
  lantai: number;
  harga: number;
  fasilitas: string[];
  foto: string;
}

@Component({
  selector: 'app-browse',
  templateUrl: './browse.page.html',
  styleUrls: ['./browse.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar]
})
export class BrowsePage implements OnInit {
  constructor(private router: Router, private api: ApiService, private cdr: ChangeDetectorRef) { }

  search = '';
  priceFilter = '';
  view: 'kos' | 'kamar' = 'kos';
  loading = true;
  errorMessage = '';
  kosList: KosItem[] = [];
  kamarList: KamarItem[] = [];

  ngOnInit() {
    this.loadKatalog();
  }

  loadKatalog() {
    this.loading = true;
    this.errorMessage = '';

    this.api.getTenantKatalog().subscribe({
      next: (response: any) => {
        try {
          const data: any[] = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
              ? response.data
              : [];

          console.log('Data katalog:', data);

          this.kosList = data.map((kos: any) => {
            const rooms = Array.isArray(kos.kamar)
              ? kos.kamar
              : [];
            const bundleRows = Array.isArray(kos.bundles) ? kos.bundles : [];
            const activeBundles = bundleRows.filter((bundle: any) =>
              String(bundle?.status || '').toLowerCase() === 'aktif'
            );
            const bundleEnabled = kos.bundle_aktif === true
              || kos.bundle_aktif === 1
              || String(kos.bundle_aktif).toLowerCase() === '1'
              || String(kos.bundle_aktif).toLowerCase() === 'true';
            const hasBundle = bundleEnabled && activeBundles.length > 0;

            const roomTypes = Array.isArray(kos.jenis_kamar)
              ? kos.jenis_kamar
              : [];

            const prices = [
              ...rooms.map((room: any) =>
                Number(
                  room.jenis_kamar?.harga_sewa ??
                  room.jenisKamar?.harga_sewa ?? 0
                )
              ),
              ...roomTypes.map((type: any) =>
                Number(type.harga_sewa ?? 0)
              )
            ].filter((price: number) => price > 0);

            const allRooms = [
              ...rooms,
              ...roomTypes.flatMap((type: any) =>
                Array.isArray(type.kamar) ? type.kamar : []
              )
            ];

            const facilities = allRooms.flatMap(
              (room: any) =>
                (room.fasilitas || [])
                  .map((item: any) => item.nama_fasilitas)
                  .filter(Boolean)
            );

            return {
              id: Number(kos.id_kos),
              nama: kos.nama_kos || 'Kos tanpa nama',
              alamat: kos.alamat || '-',
              deskripsi: kos.deskripsi || '-',
              harga: prices.length ? Math.min(...prices) : 0,
              tersedia: rooms.filter(
                (room: any) => room.status === 'tersedia'
              ).length,
              foto: this.photoUrl(kos.foto),
              fasilitas: [...new Set(facilities)] as string[],
              status: kos.status || 'aktif',
              bundleAktif: hasBundle,
              jumlahBundle: hasBundle ? activeBundles.length : 0
            };
          });

          this.kamarList = data.flatMap((kos: any) =>
            (Array.isArray(kos.kamar) ? kos.kamar : [])
              .filter((room: any) => room.status === 'tersedia')
              .map((room: any) => ({
                id: Number(room.id_kamar),
                nomor: String(room.no_kamar),
                kos: kos.nama_kos || 'Kos',
                kosId: Number(kos.id_kos),
                lantai: Number(room.lantai || 1),
                harga: Number(
                  room.jenis_kamar?.harga_sewa ??
                  room.jenisKamar?.harga_sewa ?? 0
                ),
                fasilitas: (room.fasilitas || []).map(
                  (item: any) => item.nama_fasilitas
                ),
                foto: this.photoUrl(kos.foto)
              }))
          );

          console.log('Hasil katalog:', this.kosList);
          this.loading = false;
          this.cdr.detectChanges();
        } catch (error) {
          console.error('Gagal mengolah katalog:', error);
          this.loading = false;
          this.errorMessage = 'Data kos diterima, tetapi gagal ditampilkan.';
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Gagal mengambil katalog:', error);
        this.loading = false;
        this.errorMessage =
          error?.error?.message || 'Data kos gagal dimuat.';
        this.cdr.detectChanges();
      }
    });
  }

  private photoUrl(path: string | null): string {
    if (!path || path === 'default.jpg') {
      return 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&h=560&fit=crop&auto=format';
    }
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `http://127.0.0.1:8000/storage/${path.replace(/^\//, '')}`;
  }

  get kosTersaring(): KosItem[] {
    const keyword = this.search.trim().toLowerCase();
    return this.kosList.filter(kos => {
      const cocokCari = !keyword || kos.nama.toLowerCase().includes(keyword) || kos.alamat.toLowerCase().includes(keyword);
      const cocokHarga = !this.priceFilter ||
        (this.priceFilter === 'under1m' && kos.harga < 1000000) ||
        (this.priceFilter === '1m-1.5m' && kos.harga >= 1000000 && kos.harga <= 1500000) ||
        (this.priceFilter === 'over1.5m' && kos.harga > 1500000);
      return cocokCari && cocokHarga;
    });
  }

  get kamarTersaring(): KamarItem[] {
    const keyword = this.search.trim().toLowerCase();
    return this.kamarList.filter(kamar => {
      const cocokCari = !keyword || kamar.kos.toLowerCase().includes(keyword) || kamar.nomor.toLowerCase().includes(keyword);
      const cocokHarga = !this.priceFilter ||
        (this.priceFilter === 'under1m' && kamar.harga < 1000000) ||
        (this.priceFilter === '1m-1.5m' && kamar.harga >= 1000000 && kamar.harga <= 1500000) ||
        (this.priceFilter === 'over1.5m' && kamar.harga > 1500000);
      return cocokCari && cocokHarga;
    });
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
  }

  lihatDetail(id: number) {
    if (!id || Number.isNaN(Number(id))) {
      console.error('ID kos tidak valid:', id);
      return;
    }

    this.router.navigate(['/tenant/kos-detail'], {
      queryParams: { propertyId: id, fromBrowse: '1' },
      state: { fromBrowse: true }
    }).then((navigated) => {
      if (!navigated) {
        console.error('Navigasi ke Detail Kos tidak berhasil. ID kos:', id);
      }
    });
  }

  bukaHalaman(path: string) {
    this.router.navigateByUrl(path);
  }
}

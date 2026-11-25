import { ChangeDetectionStrategy, Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api';

interface RoomChoice {
  id: number;
  label: string;
}

interface RoomTypeOption {
  typeId: string;
  nama: string;
  ukuran: string;
  harga: number;
  tersedia: number;
  fasilitas: string;
  rooms: RoomChoice[];
  selectedRoomId: number;
}

interface BundleOption {
  id: number;
  nama: string;
  jenisKamar: string;
  durasiBulan: number;
  hargaNormal: number;
  potongan: number;
  hargaBundle: number;
}

interface DetailKos {
  id: number;
  nama: string;
  alamat: string;
  linkGmaps: string;
  deskripsi: string;
  peraturan: string;
  total: number;
  tersedia: number;
  floors: number;
  phone: string;
  email: string;
  photo: string;
  bundleAktif: boolean;
}

@Component({
  selector: 'app-kos-detail',
  templateUrl: './kos-detail.page.html',
  styleUrls: ['./kos-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar]
})
export class KosDetailPage implements OnInit {
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  fotoAktif = 0;
  propertyId = 0;
  loading = true;
  errorMessage = '';
  eligibilityLoading = true;
  canRegister = false;
  eligibilityMessage = '';
  eligibilityErrorMessage = '';
  eligibilityReason = '';
  applicationCode = '';
  detail: DetailKos = {
    id: 0,
    nama: '',
    alamat: '',
    linkGmaps: '',
    deskripsi: '',
    peraturan: '',
    total: 0,
    tersedia: 0,
    floors: 1,
    phone: '-',
    email: '-',
    photo: '',
    bundleAktif: false
  };
  bundles: BundleOption[] = [];
  fotoKos: string[] = [];
  mapsUrl = '';
  fasilitas: { icon: string; nama: string }[] = [];
  tipeKamar: RoomTypeOption[] = [];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const id = Number(params.get('propertyId'));

      if (!id || !Number.isFinite(id) || id <= 0) {
        this.errorMessage = 'ID kos tidak valid. Silakan kembali ke Cari Kos dan pilih kos lagi.';
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }

      if (this.propertyId !== id) {
        this.propertyId = id;
        this.errorMessage = '';
        this.loadProperty();
      }
    });
  }

  /** Periksa kelayakan mendaftar tiap kali halaman detail dibuka kembali. */
  ionViewWillEnter(): void {
    this.checkRegistrationEligibility();
  }

  checkRegistrationEligibility(): void {
    this.eligibilityLoading = true;
    this.canRegister = false;
    this.eligibilityMessage = '';
    this.eligibilityErrorMessage = '';
    this.eligibilityReason = '';
    this.applicationCode = '';
    this.cdr.markForCheck();

    this.api.getTenantRegistrationEligibility().subscribe({
      next: (response: any) => {
        this.canRegister = response?.can_apply === true;
        this.eligibilityMessage = this.canRegister
          ? ''
          : (response?.message || 'Kamu belum dapat mengajukan pendaftaran kos baru.');
        this.eligibilityReason = String(response?.reason || '');
        this.applicationCode = response?.kode_pendaftaran || '';
        this.eligibilityLoading = false;
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        console.error('Gagal memeriksa kelayakan pendaftaran:', error);
        this.canRegister = false;
        this.eligibilityReason = '';
        this.eligibilityErrorMessage = error?.error?.message
          || 'Status pendaftaran belum dapat diperiksa. Detail kos tetap bisa dilihat, tetapi coba periksa kembali sebelum mendaftar.';
        this.eligibilityLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  lihatStatusPendaftaran(): void {
    if (this.applicationCode) {
      this.router.navigate(['/tenant/application-status'], {
        queryParams: { kode: this.applicationCode }
      });
      return;
    }

    this.router.navigateByUrl('/tenant/application-status');
  }

  lihatKontrak(): void {
    this.router.navigateByUrl('/tenant/contract-detail');
  }

  loadProperty(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.api.getTenantKatalogById(this.propertyId).subscribe({
      next: (response: any) => {
        try {
          const kos = response?.data ?? response;
          if (!kos || Number(kos?.id_kos ?? kos?.id) !== this.propertyId) {
            this.errorMessage = `Kos dengan ID ${this.propertyId} tidak ditemukan pada katalog.`;
            this.loading = false;
            this.cdr.markForCheck();
            return;
          }

          const roomTypes: any[] = Array.isArray(kos.jenis_kamar) ? kos.jenis_kamar : [];
          const directRooms: any[] = Array.isArray(kos.kamar) ? kos.kamar : [];
          const nestedRooms: any[] = roomTypes.flatMap((type: any) =>
            Array.isArray(type?.kamar) ? type.kamar : []
          );

          const roomsById = new Map<number, any>();
          [...directRooms, ...nestedRooms].forEach((room: any) => {
            const roomId = Number(room?.id_kamar);
            if (roomId) {
              const existing = roomsById.get(roomId) || {};
              roomsById.set(roomId, {
                ...existing,
                ...room,
                fasilitas: Array.isArray(room?.fasilitas)
                  ? room.fasilitas
                  : existing.fasilitas || []
              });
            }
          });
          const allRooms = Array.from(roomsById.values()) as any[];
          const availableRooms = allRooms.filter((room: any) => room.status === 'tersedia');
          const photo = this.photoUrl(kos.foto);

          this.detail = {
            id: Number(kos.id_kos ?? kos.id),
            nama: kos.nama_kos || kos.nama || 'Kos tanpa nama',
            alamat: kos.alamat || '-',
            linkGmaps: kos.link_gmaps || '',
            deskripsi: kos.deskripsi || '-',
            peraturan: String(kos.peraturan || '').trim(),
            total: allRooms.length,
            tersedia: availableRooms.length,
            floors: Number(kos.jumlah_lantai || 1),
            phone: kos.no_telp || '-',
            email: kos.email || '-',
            photo,
            bundleAktif: this.toBoolean(kos.bundle_aktif)
          };

          const bundleRows: any[] = Array.isArray(kos.bundles) ? kos.bundles : [];
          const activeBundleRows = bundleRows.filter((bundle: any) =>
            String(bundle?.status || '').toLowerCase() === 'aktif'
          );
          this.bundles = this.detail.bundleAktif
            ? activeBundleRows
                .map((bundle: any): BundleOption => {
                  const typeId = Number(
                    bundle?.tJenisKamar_id_jenisKamar
                    ?? bundle?.jenis_kamar?.id_jenisKamar
                    ?? bundle?.jenisKamar?.id_jenisKamar
                    ?? 0
                  );
                  const type = bundle?.jenis_kamar
                    || bundle?.jenisKamar
                    || roomTypes.find((item: any) => Number(item?.id_jenisKamar) === typeId)
                    || {};
                  const hargaNormal = Number(bundle?.harga_normal || 0);
                  const potongan = Number(bundle?.potongan || 0);
                  const hargaBundle = Number(bundle?.harga_bundle ?? Math.max(0, hargaNormal - potongan));

                  return {
                    id: Number(bundle?.id_bundle || 0),
                    nama: String(bundle?.nama_bundle || 'Paket Bundle'),
                    jenisKamar: String(type?.nama_jenis || 'Jenis kamar'),
                    durasiBulan: Number(bundle?.durasi_sewa_bulan || 0),
                    hargaNormal,
                    potongan,
                    hargaBundle
                  };
                })
                .filter((bundle: BundleOption) => bundle.id > 0 && bundle.durasiBulan > 0)
                .sort((a: BundleOption, b: BundleOption) => a.durasiBulan - b.durasiBulan)
            : [];

          this.fotoKos = [photo];
          this.fotoAktif = 0;
          this.mapsUrl = this.resolveMapsUrl(kos.link_gmaps, kos.alamat);

          const grouped = new Map<string, RoomTypeOption>();
          availableRooms.forEach((room: any) => {
            const roomTypeId = Number(room.tJenisKamar_id_jenisKamar
              ?? room.jenis_kamar?.id_jenisKamar
              ?? room.jenisKamar?.id_jenisKamar
              ?? 0);
            const type = room.jenis_kamar
              || room.jenisKamar
              || roomTypes.find((item: any) => Number(item.id_jenisKamar) === roomTypeId)
              || {};
            const name = type.nama_jenis || 'Tipe kamar belum ditentukan';
            const key = roomTypeId > 0 ? String(roomTypeId) : `nama:${name}`;
            const names: string[] = (Array.isArray(room.fasilitas) ? room.fasilitas : [])
              .map((item: any) => item?.nama_fasilitas)
              .filter(Boolean);
            const roomId = Number(room.id_kamar);
            let option = grouped.get(key);

            if (!option) {
              option = {
                typeId: key,
                nama: name,
                ukuran: room.deskripsi || '-',
                harga: Number(type.harga_sewa || 0),
                tersedia: 0,
                fasilitas: 'Belum ada informasi fasilitas',
                rooms: [],
                selectedRoomId: roomId
              };
              grouped.set(key, option);
            }

            option.rooms.push({
              id: roomId,
              label: room.no_kamar != null ? String(room.no_kamar) : String(roomId)
            });
            option.tersedia = option.rooms.length;
            const mergedNames = Array.from(new Set([
              ...(option.fasilitas === 'Belum ada informasi fasilitas' ? [] : option.fasilitas.split(', ')),
              ...names
            ]));
            option.fasilitas = mergedNames.join(', ') || 'Belum ada informasi fasilitas';
          });
          this.tipeKamar = Array.from(grouped.values()).sort((a, b) => a.harga - b.harga);

          const allFacilityNames = [
            ...new Set(
              allRooms.flatMap((room: any) =>
                (Array.isArray(room.fasilitas) ? room.fasilitas : [])
                  .map((item: any) => item?.nama_fasilitas)
                  .filter(Boolean)
              )
            )
          ] as string[];
          this.fasilitas = allFacilityNames.map((nama: string) => ({ icon: '✓', nama }));

          this.loading = false;
          this.cdr.markForCheck();
        } catch (error) {
          console.error('Gagal memproses data detail kos:', error);
          this.errorMessage = 'Data kos diterima, tetapi detailnya gagal ditampilkan. Buka Console untuk melihat penyebabnya.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: (error: any) => {
        console.error('Gagal memuat detail kos dari Laravel:', error);
        this.errorMessage = error?.error?.message
          || 'Detail kos gagal dimuat. Periksa koneksi ke Laravel lalu coba kembali.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private toBoolean(value: any): boolean {
    return value === true || value === 1 || String(value).toLowerCase() === '1'
      || String(value).toLowerCase() === 'true';
  }

  private resolveMapsUrl(link: string | null | undefined, address: string | null | undefined): string {
    const candidate = String(link || '').trim();
    if (candidate && this.isGoogleMapsLink(candidate)) {
      return candidate;
    }

    const cleanAddress = String(address || '').trim();
    return cleanAddress && cleanAddress !== '-'
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`
      : '';
  }

  private isGoogleMapsLink(value: string): boolean {
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      const allowedHost = host === 'maps.app.goo.gl'
        || host === 'goo.gl'
        || host === 'google.com'
        || host.endsWith('.google.com')
        || host === 'google.co.id'
        || host.endsWith('.google.co.id');
      return (url.protocol === 'https:' || url.protocol === 'http:') && allowedHost;
    } catch {
      return false;
    }
  }

  private photoUrl(path: string | null): string {
    if (!path || path === 'default.jpg') {
      return 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop&auto=format';
    }
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `http://127.0.0.1:8000/storage/${path.replace(/^\//, '')}`;
  }

  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }

  pilihFoto(index: number): void {
    this.fotoAktif = index;
  }

  pilihKamar(kamar?: RoomTypeOption): void {
    if (!kamar) return;

    if (this.eligibilityLoading) {
      window.alert('Sedang memeriksa status pendaftaran. Coba kembali sebentar lagi.');
      return;
    }

    if (!this.canRegister) {
      window.alert(this.eligibilityMessage || this.eligibilityErrorMessage || 'Kamu belum dapat mengajukan pendaftaran baru.');
      return;
    }

    const roomId = Number(kamar.selectedRoomId);
    if (!roomId || !kamar.rooms.some(room => room.id === roomId)) return;

    this.router.navigate(['/tenant/registration'], {
      queryParams: {
        propertyId: this.propertyId,
        roomId,
        fromKosDetail: '1'
      },
      state: { fromKosDetail: true }
    });
  }

  get phoneLink(): string {
    const phone = (this.detail.phone || '').replace(/[^0-9+]/g, '');
    return phone && phone !== '-' ? `tel:${phone}` : '';
  }

  get whatsappLink(): string {
    let phone = (this.detail.phone || '').replace(/\D/g, '');
    if (phone.startsWith('0')) phone = `62${phone.slice(1)}`;
    else if (phone.startsWith('8')) phone = `62${phone}`;
    if (!phone || phone === '-') return '';
    return `https://wa.me/${phone}`;
  }

  kembali(): void {
    this.router.navigateByUrl('/tenant/browse');
  }
}

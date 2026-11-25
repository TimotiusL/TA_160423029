import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { ApiService } from '../../services/api';
import { finalize, timeout } from 'rxjs';

interface PropertyOption {
  id: string;
  name: string;
  address: string;
  rules: string;
  photo: string;
  availableRooms: number;
  deposit: number;
  bundleEnabled: boolean;
}

interface BundleOption {
  id_bundle: number;
  tJenisKamar_id_jenisKamar: number;
  nama_bundle: string;
  durasi_sewa_bulan: number;
  harga_normal: number;
  potongan: number;
  harga_bundle: number;
  jenis_kamar?: { nama_jenis?: string };
}

interface RoomOption {
  id: string;
  propertyId: string;
  number: string;
  type: string;
  floor: number;
  price: number;
  roomTypeId: number;
  facilities: string[];
}

@Component({
  selector: 'app-tenant-registration',
  templateUrl: './registration.page.html',
  styleUrls: ['./registration.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent]
})
export class RegistrationPage implements OnInit {
  step = 0;
  submitted = false;
  showSuccessModal = false;
  submitting = false;
  loading = true;
  errorMessage = '';
  applicationCode = '';
  toastMessage = '';
  properties: PropertyOption[] = [];
  rooms: RoomOption[] = [];
  bundleOptions: BundleOption[] = [];
  private ktpFile: File | null = null;
  existingKtpPath = '';
  existingKtpName = '';
  existingKtpUrl = '';
  profileLoading = true;

  form = {
    propertyId: '',
    roomId: '',
    name: '',
    email: '',
    phone: '',
    nik: '',
    gender: 'pria',
    birthDate: '',
    startDate: '',
    durationMonths: 1,
    bundleId: '',
    notes: ''
  };
  ktpName = '';

  get today(): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const navigationState = this.router.getCurrentNavigation()?.extras.state as
      { fromKosDetail?: boolean } | undefined;
    const fromKosDetail = this.route.snapshot.queryParamMap.get('fromKosDetail') === '1'
      || navigationState?.fromKosDetail === true
      || history.state?.fromKosDetail === true;
    const propertyId = this.route.snapshot.queryParamMap.get('propertyId');
    const roomId = this.route.snapshot.queryParamMap.get('roomId');

    if (!fromKosDetail || !propertyId || !roomId) {
      this.router.navigateByUrl('/tenant/browse', { replaceUrl: true });
      return;
    }

    this.loadUserData();
    this.loadKatalog(propertyId, roomId);
  }

  private loadUserData(): void {
    try {
      const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (savedUser) {
        this.form.name = savedUser.nama || savedUser.name || '';
        this.form.email = savedUser.email || '';
        this.form.phone = savedUser.no_telp || savedUser.phone || '';
      }
    } catch {
    }

    this.api.me().subscribe({
      next: (response: any) => {
        const user = response?.user;
        if (!user) {
          this.profileLoading = false;
          return;
        }

        this.form.name = user.name || user.nama || this.form.name;
        this.form.email = user.email || this.form.email;
        this.form.phone = user.phone || user.no_telp || this.form.phone;
        this.form.nik = user.nik || this.form.nik;
        if (user.jenis_kelamin === 'pria' || user.jenis_kelamin === 'wanita') {
          this.form.gender = user.jenis_kelamin;
        }
        if (user.tgl_lahir) {
          this.form.birthDate = String(user.tgl_lahir).slice(0, 10);
        }

        this.existingKtpPath = user.foto_ktp || '';
        this.existingKtpName = this.existingKtpPath
          ? this.existingKtpPath.split('/').pop() || 'KTP tersimpan'
          : '';
        this.existingKtpUrl = this.existingKtpPath
          ? this.storageFileUrl(this.existingKtpPath)
          : '';
        this.profileLoading = false;
      },
      error: (error: any) => {
        console.warn('Profil tenant belum dapat dimuat; form tetap bisa diisi manual.', error);
        this.profileLoading = false;
      }
    });
  }

  reloadKatalog(): void {
    const propertyId = this.route.snapshot.queryParamMap.get('propertyId');
    const roomId = this.route.snapshot.queryParamMap.get('roomId');
    this.loadKatalog(propertyId, roomId);
  }

  private loadKatalog(propertyId: string | null, roomId: string | null): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const kosId = Number(propertyId);
    if (!propertyId || !roomId || !Number.isInteger(kosId) || kosId <= 0) {
      this.errorMessage = 'ID kos atau kamar tidak valid. Silakan kembali ke Cari Kos dan pilih kamar lagi.';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.api.getTenantKatalogById(kosId).pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response: any) => {
        try {
          const kos = response?.data ?? response?.kos ?? response;
          const responseKosId = Number(kos?.id_kos ?? kos?.id);

          if (!kos || responseKosId !== kosId) {
            throw new Error(`Data kos dengan ID ${kosId} tidak ditemukan.`);
          }

          if (kos.status !== 'aktif') {
            throw new Error('Kos yang dipilih sedang tidak aktif dan tidak dapat menerima pendaftaran.');
          }

          const roomTypes: any[] = Array.isArray(kos.jenis_kamar) ? kos.jenis_kamar : [];
          const directRooms: any[] = Array.isArray(kos.kamar) ? kos.kamar : [];
          const nestedRooms: any[] = roomTypes.flatMap((type: any) =>
            Array.isArray(type?.kamar) ? type.kamar : []
          );

          const roomsById = new Map<number, any>();
          [...directRooms, ...nestedRooms].forEach((room: any) => {
            const id = Number(room?.id_kamar);
            if (!id) return;

            const existing = roomsById.get(id) || {};
            roomsById.set(id, {
              ...existing,
              ...room,
              fasilitas: Array.isArray(room?.fasilitas)
                ? room.fasilitas
                : (existing.fasilitas || [])
            });
          });

          const availableRooms = Array.from(roomsById.values())
            .filter((room: any) => room.status === 'tersedia');

          this.properties = [{
            id: String(kos.id_kos ?? kos.id),
            name: kos.nama_kos || 'Kos tanpa nama',
            address: kos.alamat || '-',
            rules: String(kos.peraturan || '').trim(),
            photo: this.photoUrl(kos.foto),
            availableRooms: availableRooms.length,
            deposit: Number(kos.deposit || 0),
            bundleEnabled: Number(kos.bundle_aktif || 0) === 1 || kos.bundle_aktif === true
          }];

          this.bundleOptions = Array.isArray(kos.bundles)
            ? kos.bundles.filter((bundle: any) => bundle.status === 'aktif').map((bundle: any) => ({
                id_bundle: Number(bundle.id_bundle),
                tJenisKamar_id_jenisKamar: Number(bundle.tJenisKamar_id_jenisKamar),
                nama_bundle: String(bundle.nama_bundle || 'Paket Bundle'),
                durasi_sewa_bulan: Number(bundle.durasi_sewa_bulan || 1),
                harga_normal: Number(bundle.harga_normal || 0),
                potongan: Number(bundle.potongan || 0),
                harga_bundle: Number(bundle.harga_bundle || 0),
                jenis_kamar: bundle.jenis_kamar || bundle.jenisKamar
              }))
            : [];

          this.rooms = availableRooms.map((room: any) => {
            const roomTypeId = Number(
              room.tJenisKamar_id_jenisKamar
              ?? room.jenis_kamar?.id_jenisKamar
              ?? room.jenisKamar?.id_jenisKamar
              ?? 0
            );
            const roomType = room.jenis_kamar
              || room.jenisKamar
              || roomTypes.find((item: any) => Number(item.id_jenisKamar) === roomTypeId)
              || {};

            return {
              id: String(room.id_kamar),
              propertyId: String(kos.id_kos ?? kos.id),
              number: String(room.no_kamar ?? room.id_kamar),
              type: roomType.nama_jenis || 'Tipe kamar',
              floor: Number(room.lantai || 1),
              price: Number(roomType.harga_sewa || 0),
              roomTypeId: roomTypeId,
              facilities: (Array.isArray(room.fasilitas) ? room.fasilitas : [])
                .map((item: any) => item?.nama_fasilitas)
                .filter(Boolean)
            };
          });

          this.applyRouteSelection(propertyId, roomId);
          if (!this.availableBundles.some(bundle => Number(bundle.id_bundle) === Number(this.form.bundleId))) {
            this.form.bundleId = '';
          }
        } catch (error: any) {
          console.error('Gagal mengolah detail kos untuk pendaftaran:', error);
          this.properties = [];
          this.rooms = [];
          this.errorMessage = error?.message || 'Data kos diterima, tetapi gagal ditampilkan.';
        }

        this.cdr.markForCheck();
      },
      error: (error: any) => {
        console.error('Gagal memuat detail kos untuk pendaftaran:', error);

        if (error?.name === 'TimeoutError') {
          this.errorMessage = 'Permintaan data kos terlalu lama (lebih dari 15 detik). Periksa koneksi aplikasi ke server Laravel, lalu coba muat ulang.';
        } else if (error?.status === 401) {
          this.errorMessage = 'Sesi login sudah berakhir. Silakan login kembali untuk melanjutkan pendaftaran.';
        } else if (error?.status === 403) {
          this.errorMessage = error?.error?.message || 'Akun ini tidak memiliki akses untuk mendaftar sebagai penghuni.';
        } else if (error?.status === 404) {
          this.errorMessage = 'Kos yang dipilih tidak ditemukan atau sudah tidak tersedia.';
        } else {
          this.errorMessage = error?.error?.message
            || 'Detail kos gagal dimuat. Pastikan server Laravel aktif dan koneksi API dapat diakses.';
        }

        this.cdr.markForCheck();
      }
    });
  }

  private applyRouteSelection(propertyId: string | null, roomId: string | null): void {
    const property = this.properties.find(item => item.id === propertyId);
    const room = this.rooms.find(item => item.id === roomId);

    if (!property || !room || room.propertyId !== property.id) {
      this.errorMessage = 'Kamar yang dipilih tidak tersedia atau sudah dipesan. Silakan kembali ke Cari Kos dan pilih kamar lain.';
      return;
    }

    this.form.propertyId = property.id;
    this.form.roomId = room.id;
    this.form.bundleId = '';
    this.step = 0;
  }

  get selectedProperty() {
    return this.properties.find(item => item.id === this.form.propertyId);
  }

  get selectedRoom() {
    return this.rooms.find(item => item.id === this.form.roomId);
  }

  get availableBundles(): BundleOption[] {
    const roomTypeId = Number(this.selectedRoom?.roomTypeId || 0);
    if (!this.selectedProperty?.bundleEnabled || !roomTypeId) return [];
    return this.bundleOptions.filter(bundle =>
      Number(bundle.tJenisKamar_id_jenisKamar) === roomTypeId
    );
  }

  get selectedBundle(): BundleOption | null {
    if (!this.form.bundleId) return null;
    return this.availableBundles.find(bundle => Number(bundle.id_bundle) === Number(this.form.bundleId)) || null;
  }

  get selectedDurationMonths(): number {
    return this.selectedBundle
      ? Number(this.selectedBundle.durasi_sewa_bulan)
      : Number(this.form.durationMonths || 1);
  }

  onBundleChange(value: string): void {
    this.form.bundleId = value || '';
    if (this.selectedBundle) {
      this.form.durationMonths = Number(this.selectedBundle.durasi_sewa_bulan);
    } else {
      this.form.durationMonths = 1;
    }
    this.cdr.markForCheck();
  }

  get steps() {
    return ['Data Diri', 'Periode Sewa', 'Review'];
  }

  next(): void {
    if (this.step === 0 && this.profileLoading) {
      return this.showToast('Sedang memuat data profil penghuni. Tunggu sebentar lalu coba lagi.');
    }
    if (this.step === 0 && (!this.form.name.trim() || !this.form.email.trim() || !this.form.phone.trim())) {
      return this.showToast('Data akun belum berhasil dimuat. Muat ulang halaman atau login kembali.');
    }
    if (this.step === 0 && (!this.form.nik.trim() || !this.form.birthDate || !this.form.gender)) {
      return this.showToast('Lengkapi NIK, tanggal lahir, dan jenis kelamin.');
    }
    if (this.step === 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) {
      return this.showToast('Masukkan alamat email yang valid.');
    }
    if (this.step === 0 && !/^\d{16}$/.test(this.form.nik.trim())) {
      return this.showToast('NIK harus terdiri dari 16 digit angka.');
    }
    if (this.step === 0 && !/^0\d{9,12}$/.test(this.normalizedPhone(this.form.phone))) {
      return this.showToast('Gunakan nomor telepon Indonesia yang valid, misalnya 081234567890.');
    }
    if (this.step === 0) {
      const birthDate = new Date(this.form.birthDate + 'T00:00:00');
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      if (birthDate >= todayDate) {
        return this.showToast('Tanggal lahir harus sebelum hari ini.');
      }
    }
    if (this.step === 0 && !this.ktpFile && !this.existingKtpPath) {
      return this.showToast('Foto KTP wajib diunggah sebelum melanjutkan.');
    }
    if (this.step === 1) {
      const duration = Number(this.form.durationMonths);
      if (!this.form.startDate) {
        return this.showToast('Pilih tanggal rencana masuk terlebih dahulu.');
      }
      if (!this.selectedBundle && (!Number.isInteger(duration) || duration < 1 || duration > 36)) {
        return this.showToast('Durasi sewa normal harus berupa bilangan bulat antara 1 sampai 36 bulan.');
      }
      if (this.form.bundleId && !this.selectedBundle) {
        return this.showToast('Paket bundle tidak lagi tersedia. Silakan pilih ulang paket atau sewa normal.');
      }
    }
    this.step = Math.min(2, this.step + 1);
  }

  back(): void {
    if (this.step > 0) this.step--;
    else this.router.navigateByUrl('/tenant/browse');
  }

  onKtpChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) {
      this.ktpFile = null;
      this.ktpName = '';
      return;
    }

    if (!/\.(jpe?g|png|pdf)$/i.test(file.name)) {
      this.ktpFile = null;
      this.ktpName = '';
      input.value = '';
      this.showToast('Foto KTP harus berupa JPG, JPEG, PNG, atau PDF.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.ktpFile = null;
      this.ktpName = '';
      input.value = '';
      this.showToast('Ukuran file KTP maksimal 2 MB.');
      return;
    }

    this.ktpFile = file;
    this.ktpName = file.name;
  }

  submit(): void {
    if (this.submitting) return;
    if (!this.ktpFile && !this.existingKtpPath) {
      return this.showToast('Foto KTP wajib diunggah sebelum pendaftaran dikirim.');
    }
    if (!this.form.propertyId || !this.form.roomId) {
      return this.showToast('Pilih kos dan kamar terlebih dahulu.');
    }

    const room = this.selectedRoom;
    if (!room) return this.showToast('Kamar tidak ditemukan atau sudah tidak tersedia.');

    const duration = this.selectedDurationMonths;
    if (!this.form.startDate) {
      return this.showToast('Pilih tanggal rencana masuk terlebih dahulu.');
    }
    if (!Number.isInteger(duration) || duration < 1 || duration > 36) {
      return this.showToast('Durasi sewa harus berupa bilangan bulat antara 1 sampai 36 bulan.');
    }
    if (this.form.bundleId && !this.selectedBundle) {
      return this.showToast('Paket bundle sudah tidak tersedia. Silakan pilih ulang.');
    }

    const formData = new FormData();
    formData.append('tKamar_id_kamar', room.id);
    formData.append('tgl_rencana_masuk', this.form.startDate);
    formData.append('durasi_sewa', String(duration));
    if (this.selectedBundle) {
      formData.append('bundle_id', String(this.selectedBundle.id_bundle));
    }
    formData.append('catatan', this.form.notes.trim());
    formData.append('nik', this.form.nik.trim());
    formData.append('tgl_lahir', this.form.birthDate);
    formData.append('jenis_kelamin', this.form.gender);

    if (this.ktpFile) {
      formData.append('foto_ktp', this.ktpFile, this.ktpFile.name);
    }

    this.submitting = true;
    this.api.createTenantPendaftaran(formData).subscribe({
      next: (response: any) => {
        const pendaftaran = response?.data || response?.pendaftaran || response;
        this.applicationCode = pendaftaran?.kode_pendaftaran || '';

        if (response?.user) {
          try {
            localStorage.setItem('user', JSON.stringify(response.user));
          } catch { }
        }

        this.submitting = false;
        this.submitted = true;
        this.showSuccessModal = true;
        this.toastMessage = '';
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal mengirim pendaftaran:', error);
        this.submitting = false;
        const validationErrors = error?.error?.errors;
        const firstKey = validationErrors ? Object.keys(validationErrors)[0] : null;
        const validationMessage = firstKey ? validationErrors[firstKey]?.[0] : '';
        this.showToast(validationMessage || error?.error?.message || 'Pendaftaran gagal dikirim. Coba lagi.');
        this.cdr.detectChanges();
      }
    });
  }

  private normalizedPhone(value: string): string {
    let phone = (value || '').replace(/[\s-]/g, '');
    if (phone.startsWith('+62')) phone = '0' + phone.substring(3);
    else if (phone.startsWith('62')) phone = '0' + phone.substring(2);
    return phone;
  }

  private storageFileUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `http://127.0.0.1:8000/storage/ktp/${path.replace(/^\//, '')}`;
  }

  private photoUrl(path: string | null): string {
    if (!path || path === 'default.jpg') {
      return 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=480&h=300&fit=crop&auto=format';
    }
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `http://127.0.0.1:8000/storage/${path.replace(/^\//, '')}`;
  }

  showToast(message: string): void {
    this.toastMessage = message;
    window.setTimeout(() => this.toastMessage = '', 3200);
  }

  rupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
  }

  tanggal(value: string): string {
    if (!value) return 'Belum dipilih';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value + 'T00:00:00'));
  }

  keStatus(): void {
    this.router.navigate(['/tenant/application-status'], {
      queryParams: { kode: this.applicationCode }
    });
  }
}

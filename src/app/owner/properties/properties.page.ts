import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { Router } from '@angular/router';

addIcons({
  searchOutline
});

interface Property {
  id: string;
  name: string;
  address: string;
  googleMapsLink: string;
  phone: string;
  email: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  description: string;
  rules: string;
  floors: number;
  deposit: number;
  intervalDendaHari: number;
  nominalDenda: number;
  bisaDicicil: boolean;
  bundleEnabled: boolean;
  photo: string;
  status: string;
  totalRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  availableRooms: number;
  tenantCount: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

interface BundleRoomType {
  id_jenisKamar: number;
  nama_jenis: string;
  harga_sewa: number;
}

interface BundleRecord {
  id_bundle: number;
  tJenisKamar_id_jenisKamar: number;
  nama_bundle: string;
  durasi_sewa_bulan: number;
  harga_normal: number;
  potongan: number;
  harga_bundle: number;
  status: 'aktif' | 'nonaktif';
  jenis_kamar?: BundleRoomType;
}

@Component({
  selector: 'app-properties',
  templateUrl: './properties.page.html',
  styleUrls: ['./properties.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonModal
  ]
})
export class PropertiesPage implements OnInit {

  @ViewChild('propertyFormModal') private propertyFormModal?: IonModal;
  @ViewChild('propertySaveSuccessModal') private propertySaveSuccessModal?: IonModal;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef, private router: Router) { }

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    this.api.getKos().subscribe({
      next: (data: any[]) => {
        console.log('Data kos:', data);

        this.properties = data.map(kos => ({
          id: String(kos.id_kos),
          name: kos.nama_kos,
          address: kos.alamat,
          googleMapsLink: kos.link_gmaps || '',
          phone: kos.no_telp,
          email: kos.email,
          bankName: kos.nama_bank || '',
          accountNumber: String(kos.nomor_rekening || ''),
          accountHolder: kos.nama_pemilik_rekening || '',
          description: kos.deskripsi,
          rules: String(kos.peraturan || ''),
          floors: kos.jumlah_lantai,
          deposit: Number(kos.deposit),
          intervalDendaHari: Number(kos.interval_denda_hari ?? 7),
          nominalDenda: Number(kos.nominal_denda ?? 0),
          bisaDicicil: Number(kos.bisa_dicicil ?? 1) === 1,
          bundleEnabled: Number(kos.bundle_aktif ?? 0) === 1,
          photo: this.getPhotoUrl(kos.foto),
          status: kos.status.toUpperCase(),

          totalRooms: kos.totalRooms,
          occupiedRooms: kos.occupiedRooms,
          reservedRooms: kos.reservedRooms,
          availableRooms: kos.availableRooms,

          tenantCount: kos.tenantCount,
          monthlyIncome: Number(kos.monthlyIncome) || 0,
          monthlyExpense: Number(kos.monthlyExpense) || 0
        }));
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Gagal mengambil data kos:', error);
      }
    });
  }

  search = '';

  showAdd = false;
  photoFile: File | null = null;
  photoPreview = '';

  selectedProperty: Property | null = null;
  editingProperty: Property | null = null;

  formErrors: Record<string, string> = {};
  formError = '';
  photoError = '';
  savingProperty = false;
  showSaveSuccess = false;

  form = {
    name: '',
    address: '',
    googleMapsLink: '',
    phone: '',
    email: '',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    description: '',
    rules: '',
    floors: '',
    deposit: '',
    intervalDendaHari: '7',
    nominalDenda: '0',
    bisaDicicil: true,
    bundleEnabled: false
  };

  properties: Property[] = [];

  showBundleModal = false;
  bundleProperty: Property | null = null;
  bundleLoading = false;
  bundleSaving = false;
  bundleRoomTypes: BundleRoomType[] = [];
  bundles: BundleRecord[] = [];
  editingBundleId: number | null = null;
  bundleForm = {
    roomTypeId: null as number | null,
    name: '',
    durationMonths: 6,
    discount: 0,
    status: 'aktif' as 'aktif' | 'nonaktif'
  };

  get selectedBundleRoomType(): BundleRoomType | undefined {
    return this.bundleRoomTypes.find(type => Number(type.id_jenisKamar) === Number(this.bundleForm.roomTypeId));
  }

  get bundleNormalPrice(): number {
    return Number(this.selectedBundleRoomType?.harga_sewa || 0) * Number(this.bundleForm.durationMonths || 0);
  }

  get bundleFinalPrice(): number {
    return Math.max(0, this.bundleNormalPrice - Number(this.bundleForm.discount || 0));
  }


  get filteredProperties(): Property[] {
    const keyword = this.search.toLowerCase().trim();

    if (!keyword) {
      return this.properties;
    }

    return this.properties.filter(property =>
      property.name.toLowerCase().includes(keyword) ||
      property.address.toLowerCase().includes(keyword)
    );
  }

  get totalIncome(): number {
    return this.properties.reduce(
      (sum, property) => sum + (Number(property.monthlyIncome) || 0),
      0
    );
  }

  get totalRooms(): number {
    return this.properties.reduce(
      (sum, property) => sum + property.totalRooms,
      0
    );
  }

  get totalOccupied(): number {
    return this.properties.reduce(
      (sum, property) => sum + property.occupiedRooms,
      0
    );
  }

  get occupancyPercentage(): number {
    if (this.totalRooms === 0) {
      return 0;
    }

    return Math.round(
      (this.totalOccupied / this.totalRooms) * 100
    );
  }


  getProfit(property: Property): number {
    return property.monthlyIncome - property.monthlyExpense;
  }


  getOccupancy(property: Property): number {
    if (property.totalRooms === 0) {
      return 0;
    }

    return Math.round(
      (property.occupiedRooms / property.totalRooms) * 100
    );
  }


  formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value);
  }


  openAddModal(): void {
    this.formErrors = {};
    this.formError = '';
    this.photoError = '';
    this.editingProperty = null;
    this.photoFile = null;
    this.photoPreview = '';

    this.form = {
      name: '',
      address: '',
      googleMapsLink: '',
      phone: '',
      email: '',
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      description: '',
      rules: '',
      floors: '',
      deposit: '',
      intervalDendaHari: '7',
      nominalDenda: '0',
      bisaDicicil: true,
      bundleEnabled: false
    };

    this.showAdd = true;
    this.cdr.detectChanges();
    void this.propertyFormModal?.present();
  }

  editProperty(property: Property): void {
    this.formErrors = {};
    this.formError = '';
    this.photoError = '';
    this.editingProperty = property;
    this.photoFile = null;
    this.photoPreview = property.photo || '';

    this.form = {
      name: property.name,
      address: property.address,
      googleMapsLink: property.googleMapsLink || '',
      phone: property.phone,
      email: property.email,
      bankName: property.bankName || '',
      accountNumber: property.accountNumber || '',
      accountHolder: property.accountHolder || '',
      description: property.description,
      rules: property.rules || '',
      floors: String(property.floors),
      deposit: String(property.deposit),
      intervalDendaHari: String(property.intervalDendaHari ?? 7),
      nominalDenda: String(property.nominalDenda ?? 0),
      bisaDicicil: property.bisaDicicil ?? true,
      bundleEnabled: property.bundleEnabled ?? false
    };

    this.showAdd = true;
    this.cdr.detectChanges();
    void this.propertyFormModal?.present();
  }


  async closeAddModal(): Promise<void> {
    if (this.propertyFormModal) {
      await this.propertyFormModal.dismiss(null, 'cancel');
      return;
    }

    this.onAddModalDidDismiss();
  }

  onAddModalDidDismiss(): void {
    this.showAdd = false;
    this.formErrors = {};
    this.formError = '';
    this.photoError = '';
    this.savingProperty = false;
    this.editingProperty = null;
    this.photoFile = null;
    this.photoPreview = '';

    this.form = {
      name: '',
      address: '',
      googleMapsLink: '',
      phone: '',
      email: '',
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      description: '',
      rules: '',
      floors: '',
      deposit: '',
      intervalDendaHari: '7',
      nominalDenda: '0',
      bisaDicicil: true,
      bundleEnabled: false
    };

  }


  saveProperty(): void {
    if (this.savingProperty || !this.validatePropertyForm()) return;

    const rules = this.form.rules.trim();
    const bankName = this.form.bankName.trim();
    const accountNumber = this.form.accountNumber.trim();
    const accountHolder = this.form.accountHolder.trim();

    const data = new FormData();
    data.append('nama_kos', this.form.name.trim());
    data.append('alamat', this.form.address.trim());
    data.append('link_gmaps', this.form.googleMapsLink.trim());
    data.append('deskripsi', this.form.description.trim() || '-');
    data.append('peraturan', rules);
    data.append('no_telp', this.form.phone.trim());
    data.append('email', this.form.email.trim());
    data.append('nama_bank', bankName);
    data.append('nomor_rekening', accountNumber);
    data.append('nama_pemilik_rekening', accountHolder);
    data.append('jumlah_lantai', String(this.form.floors));
    data.append('deposit', String(this.form.deposit || 0));
    data.append('interval_denda_hari', String(this.form.intervalDendaHari || 7));
    data.append('nominal_denda', String(this.form.nominalDenda || 0));
    data.append('bisa_dicicil', this.form.bisaDicicil ? '1' : '0');
    data.append('bundle_aktif', this.form.bundleEnabled ? '1' : '0');
    data.append('status', this.editingProperty
      ? this.editingProperty.status.toLowerCase()
      : 'aktif');

    if (this.photoFile) {
      data.append('foto', this.photoFile, this.photoFile.name);
    }

    const expected = {
      id: this.editingProperty?.id ?? null,
      existingIds: this.properties.map(property => property.id),
      name: this.form.name.trim().toLocaleLowerCase(),
      address: this.form.address.trim().toLocaleLowerCase(),
      googleMapsLink: this.form.googleMapsLink.trim().toLocaleLowerCase(),
      phone: this.form.phone.trim(),
      email: this.form.email.trim().toLocaleLowerCase(),
      bankName: bankName.toLocaleLowerCase(),
      accountNumber: accountNumber.replace(/[\s-]/g, ''),
      accountHolder: accountHolder.toLocaleLowerCase(),
      description: (this.form.description.trim() || '-'),
      rules: rules,
      floors: Number(this.form.floors),
      deposit: Number(this.form.deposit || 0),
      intervalDendaHari: Number(this.form.intervalDendaHari || 7),
      nominalDenda: Number(this.form.nominalDenda || 0),
      bisaDicicil: this.form.bisaDicicil,
      bundleEnabled: this.form.bundleEnabled
    };

    const request = this.editingProperty
      ? this.api.updateKos(this.editingProperty.id, data)
      : this.api.createKos(data);

    this.savingProperty = true;
    this.formError = '';
    this.requestPropertySave(request, expected);
  }

  private validatePropertyForm(): boolean {
    const errors: Record<string, string> = {};
    const name = this.form.name.trim();
    const address = this.form.address.trim();
    const floors = Number(this.form.floors);
    const deposit = this.form.deposit === '' ? 0 : Number(this.form.deposit);
    const interval = Number(this.form.intervalDendaHari);
    const penalty = Number(this.form.nominalDenda);
    const accountNumber = this.form.accountNumber.trim();
    const email = this.form.email.trim();
    const mapsLink = this.form.googleMapsLink.trim();

    if (!name) errors['name'] = 'Nama kos wajib diisi.';
    else if (name.length < 3) errors['name'] = 'Nama kos minimal 3 karakter.';

    if (!address) errors['address'] = 'Alamat kos wajib diisi.';

    if (!this.form.floors || !Number.isInteger(floors) || floors < 1 || floors > 100) {
      errors['floors'] = 'Jumlah lantai harus berupa angka bulat antara 1 sampai 100.';
    }

    if (!Number.isFinite(deposit) || deposit < 0) {
      errors['deposit'] = 'Deposit tidak boleh bernilai negatif.';
    }

    if (!Number.isInteger(interval) || interval < 1 || interval > 365) {
      errors['intervalDendaHari'] = 'Interval denda harus berupa angka bulat antara 1 sampai 365 hari.';
    }

    if (String(this.form.nominalDenda).trim() === '') {
      errors['nominalDenda'] = 'Nominal denda wajib diisi. Isi 0 jika tidak ingin mengenakan denda.';
    } else if (!Number.isFinite(penalty) || penalty < 0) {
      errors['nominalDenda'] = 'Nominal denda tidak boleh bernilai negatif.';
    }

    if (!this.form.bankName.trim()) errors['bankName'] = 'Nama bank wajib diisi.';
    if (!accountNumber) {
      errors['accountNumber'] = 'Nomor rekening wajib diisi.';
    } else if (!/^[0-9][0-9 -]{3,32}[0-9]$/.test(accountNumber)) {
      errors['accountNumber'] = 'Nomor rekening harus terdiri dari 5 sampai 34 karakter angka. Spasi atau tanda hubung diperbolehkan.';
    }
    if (!this.form.accountHolder.trim()) {
      errors['accountHolder'] = 'Nama pemilik rekening wajib diisi.';
    }

    if (!this.form.rules.trim()) errors['rules'] = 'Peraturan kos wajib diisi.';

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors['email'] = 'Format email tidak valid.';
    }

    if (mapsLink && !this.isGoogleMapsLink(mapsLink)) {
      errors['googleMapsLink'] = 'Masukkan link Google Maps yang valid.';
    }

    this.formErrors = errors;
    this.formError = Object.keys(errors).length
      ? 'Masih ada data yang perlu diperbaiki. Periksa kolom bertanda merah.'
      : '';

    if (Object.keys(errors).length) {
      this.focusFirstInvalidField();
      return false;
    }

    return true;
  }

  private requestPropertySave(request: any, expected: {
    id: string | null;
    existingIds: string[];
    name: string;
    address: string;
    googleMapsLink: string;
    phone: string;
    email: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    description: string;
    rules: string;
    floors: number;
    deposit: number;
    intervalDendaHari: number;
    nominalDenda: number;
    bisaDicicil: boolean;
    bundleEnabled: boolean;
  }): void {
    request.subscribe({
      next: () => this.completePropertySave(),
      error: (error: any) => {
        console.error('Respons penyimpanan kos mengalami error:', error);
        if (error?.status >= 400 && error.status < 500) {
          this.savingProperty = false;
          this.applyPropertySaveError(error);
          return;
        }

        this.api.getKos().subscribe({
          next: (data: any[]) => {
            const saved = (Array.isArray(data) ? data : []).some(kos => {
              const kosId = String(kos.id_kos);
              const sameId = expected.id !== null && kosId === expected.id;
              const asBoolean = (value: any): boolean => value === true
                || Number(value) === 1
                || String(value).toLowerCase() === 'true';
              const sameDetails = String(kos.nama_kos || '').trim().toLocaleLowerCase() === expected.name
                && String(kos.alamat || '').trim().toLocaleLowerCase() === expected.address
                && String(kos.link_gmaps || '').trim().toLocaleLowerCase() === expected.googleMapsLink
                && String(kos.no_telp || '').trim() === expected.phone
                && String(kos.email || '').trim().toLocaleLowerCase() === expected.email
                && String(kos.nama_bank || '').trim().toLocaleLowerCase() === expected.bankName
                && String(kos.nomor_rekening || '').replace(/[\s-]/g, '') === expected.accountNumber
                && String(kos.nama_pemilik_rekening || '').trim().toLocaleLowerCase() === expected.accountHolder
                && String(kos.deskripsi || '-').trim() === expected.description
                && String(kos.peraturan || '').trim() === expected.rules
                && Number(kos.jumlah_lantai) === expected.floors
                && Number(kos.deposit || 0) === expected.deposit
                && Number(kos.interval_denda_hari ?? 7) === expected.intervalDendaHari
                && Number(kos.nominal_denda ?? 0) === expected.nominalDenda
                && asBoolean(kos.bisa_dicicil ?? 1) === expected.bisaDicicil
                && asBoolean(kos.bundle_aktif ?? 0) === expected.bundleEnabled;
              return expected.id !== null
                ? sameId && sameDetails
                : !expected.existingIds.includes(kosId) && sameDetails;
            });

            if (saved) {
              this.completePropertySave();
              return;
            }

            this.savingProperty = false;
            this.applyPropertySaveError(error);
          },
          error: () => {
            this.savingProperty = false;
            this.applyPropertySaveError(error);
          }
        });
      }
    });
  }

  private applyPropertySaveError(error: any): void {
    const serverErrors = error?.error?.errors;
    const fieldMap: Record<string, string> = {
      nama_kos: 'name',
      alamat: 'address',
      jumlah_lantai: 'floors',
      deposit: 'deposit',
      interval_denda_hari: 'intervalDendaHari',
      nominal_denda: 'nominalDenda',
      nama_bank: 'bankName',
      nomor_rekening: 'accountNumber',
      nama_pemilik_rekening: 'accountHolder',
      peraturan: 'rules',
      email: 'email',
      link_gmaps: 'googleMapsLink'
    };

    const mappedErrors: Record<string, string> = {};
    if (serverErrors && typeof serverErrors === 'object') {
      Object.entries(serverErrors).forEach(([field, messages]) => {
        const target = fieldMap[field] || fieldMap[field.split('.')[0]];
        const message = Array.isArray(messages) ? String(messages[0] || '') : String(messages || '');
        if (target && message) mappedErrors[target] = message;
      });
    }

    this.formErrors = mappedErrors;
    this.formError = Object.keys(mappedErrors).length
      ? 'Data belum dapat disimpan. Perbaiki kolom yang ditandai.'
      : (error?.error?.message || 'Kos belum berhasil disimpan. Periksa koneksi dan data yang dimasukkan.');

    if (Object.keys(mappedErrors).length) this.focusFirstInvalidField();
    this.cdr.detectChanges();
  }

  private focusFirstInvalidField(): void {
    const firstField = Object.keys(this.formErrors)[0];
    if (!firstField) return;

    const elementIds: Record<string, string> = {
      name: 'property-name',
      address: 'property-address',
      floors: 'property-floors',
      deposit: 'property-deposit',
      intervalDendaHari: 'property-penalty-interval',
      nominalDenda: 'property-penalty-amount',
      bankName: 'property-bank-name',
      accountNumber: 'property-account-number',
      accountHolder: 'property-account-holder',
      rules: 'property-rules',
      email: 'property-email',
      googleMapsLink: 'property-google-maps'
    };

    setTimeout(() => {
      const element = document.getElementById(elementIds[firstField] || `property-${firstField}`) as HTMLElement | null;
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element?.focus?.();
    }, 50);
  }

  clearFieldError(field: string): void {
    if (this.formErrors[field]) {
      delete this.formErrors[field];
      this.formError = Object.keys(this.formErrors).length
        ? 'Masih ada data yang perlu diperbaiki. Periksa kolom bertanda merah.'
        : '';
    }
  }

  private async completePropertySave(): Promise<void> {
    this.savingProperty = false;


    if (this.propertyFormModal) {
      await this.propertyFormModal.dismiss({ saved: true }, 'saved');
    } else {
      this.onAddModalDidDismiss();
    }

    this.showAdd = false;
    this.loadProperties();
    this.showSaveSuccess = true;
    this.cdr.detectChanges();


    await this.propertySaveSuccessModal?.present();
  }

  async dismissSaveSuccess(): Promise<void> {
    if (this.propertySaveSuccessModal) {
      await this.propertySaveSuccessModal.dismiss(null, 'close');
      return;
    }

    this.onSaveSuccessModalDidDismiss();
  }

  onSaveSuccessModalDidDismiss(): void {
    this.showSaveSuccess = false;
    this.cdr.detectChanges();
  }

  openBundleManager(property: Property): void {
    this.bundleProperty = property;
    this.showBundleModal = true;
    this.editingBundleId = null;
    this.resetBundleForm();
    this.loadBundles();
  }

  closeBundleManager(): void {
    this.showBundleModal = false;
    this.bundleProperty = null;
    this.bundles = [];
    this.bundleRoomTypes = [];
    this.editingBundleId = null;
    this.resetBundleForm();
  }

  private resetBundleForm(): void {
    this.bundleForm = {
      roomTypeId: this.bundleRoomTypes[0]?.id_jenisKamar ?? null,
      name: '',
      durationMonths: 6,
      discount: 0,
      status: 'aktif'
    };
  }

  loadBundles(): void {
    if (!this.bundleProperty) return;
    const kosId = Number(this.bundleProperty.id);
    this.bundleLoading = true;

    this.api.getJenisKamar(kosId).subscribe({
      next: (types: any[]) => {
        this.bundleRoomTypes = (Array.isArray(types) ? types : []).map(type => ({
          id_jenisKamar: Number(type.id_jenisKamar),
          nama_jenis: String(type.nama_jenis || 'Tipe kamar'),
          harga_sewa: Number(type.harga_sewa || 0)
        }));
        if (!this.bundleForm.roomTypeId && this.bundleRoomTypes.length) {
          this.bundleForm.roomTypeId = this.bundleRoomTypes[0].id_jenisKamar;
        }
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Gagal memuat tipe kamar untuk bundle:', error);
        alert(error?.error?.message || 'Gagal memuat tipe kamar kos ini.');
      }
    });

    this.api.getKosBundles(kosId).subscribe({
      next: (data: any[]) => {
        this.bundles = Array.isArray(data) ? data : [];
        this.bundleLoading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Gagal memuat bundle kos:', error);
        this.bundleLoading = false;
        alert(error?.error?.message || 'Gagal memuat daftar bundle.');
        this.cdr.detectChanges();
      }
    });
  }

  editBundle(bundle: BundleRecord): void {
    this.editingBundleId = bundle.id_bundle;
    this.bundleForm = {
      roomTypeId: Number(bundle.tJenisKamar_id_jenisKamar),
      name: bundle.nama_bundle,
      durationMonths: Number(bundle.durasi_sewa_bulan),
      discount: Number(bundle.potongan),
      status: bundle.status
    };
  }

  cancelBundleEdit(): void {
    this.editingBundleId = null;
    this.resetBundleForm();
  }

  private applyBundleEnabledState(response: any): void {
    if (!this.bundleProperty || response?.kos_bundle_aktif === undefined) return;

    const enabled = response.kos_bundle_aktif === true
      || response.kos_bundle_aktif === 1
      || String(response.kos_bundle_aktif).toLowerCase() === '1'
      || String(response.kos_bundle_aktif).toLowerCase() === 'true';

    this.bundleProperty.bundleEnabled = enabled;
    const property = this.properties.find(item => Number(item.id) === Number(this.bundleProperty?.id));
    if (property) property.bundleEnabled = enabled;
    this.cdr.detectChanges();
  }

  saveBundle(): void {
    if (!this.bundleProperty || this.bundleSaving) return;
    if (!this.bundleForm.roomTypeId || !this.bundleForm.name.trim()) {
      alert('Pilih jenis kamar dan isi nama bundle.');
      return;
    }
    if (!Number.isInteger(Number(this.bundleForm.durationMonths)) || this.bundleForm.durationMonths < 2 || this.bundleForm.durationMonths > 36) {
      alert('Durasi bundle harus antara 2 sampai 36 bulan.');
      return;
    }
    if (this.bundleForm.discount <= 0 || this.bundleForm.discount >= this.bundleNormalPrice) {
      alert('Potongan harus lebih besar dari 0 dan lebih kecil daripada harga normal.');
      return;
    }

    const payload = {
      tJenisKamar_id_jenisKamar: this.bundleForm.roomTypeId,
      nama_bundle: this.bundleForm.name.trim(),
      durasi_sewa_bulan: Number(this.bundleForm.durationMonths),
      potongan: Number(this.bundleForm.discount),
      status: this.bundleForm.status
    };

    this.bundleSaving = true;
    const request = this.editingBundleId
      ? this.api.updateKosBundle(this.editingBundleId, payload)
      : this.api.createKosBundle(this.bundleProperty.id, payload);

    request.subscribe({
      next: (response: any) => {
        this.bundleSaving = false;
        this.applyBundleEnabledState(response);
        this.editingBundleId = null;
        this.resetBundleForm();
        this.loadBundles();
      },
      error: error => {
        this.bundleSaving = false;
        console.error('Gagal menyimpan bundle:', error);
        alert(error?.error?.message || 'Gagal menyimpan bundle.');
        this.cdr.detectChanges();
      }
    });
  }

  toggleBundleStatus(bundle: BundleRecord): void {
    if (!this.bundleProperty) return;
    const payload = {
      tJenisKamar_id_jenisKamar: bundle.tJenisKamar_id_jenisKamar,
      nama_bundle: bundle.nama_bundle,
      durasi_sewa_bulan: bundle.durasi_sewa_bulan,
      potongan: bundle.potongan,
      status: bundle.status === 'aktif' ? 'nonaktif' : 'aktif'
    };
    this.api.updateKosBundle(bundle.id_bundle, payload).subscribe({
      next: (response: any) => {
        this.applyBundleEnabledState(response);
        this.loadBundles();
      },
      error: error => {
        console.error('Gagal mengubah status bundle:', error);
        alert(error?.error?.message || 'Status bundle gagal diubah.');
      }
    });
  }

  deleteBundle(bundle: BundleRecord): void {
    if (!confirm(`Hapus bundle "${bundle.nama_bundle}"? Riwayat pendaftaran/kontrak yang pernah memilih paket ini tetap menyimpan snapshot harganya.`)) return;
    this.api.deleteKosBundle(bundle.id_bundle).subscribe({
      next: (response: any) => {
        this.applyBundleEnabledState(response);
        this.loadBundles();
      },
      error: error => {
        console.error('Gagal menghapus bundle:', error);
        alert(error?.error?.message || 'Bundle gagal dihapus.');
      }
    });
  }

  triggerPhotoUpload(): void {
    const input = document.getElementById('kos-photo-input') as HTMLInputElement | null;
    input?.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      this.photoError = 'Foto harus berformat JPG atau PNG.';
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.photoError = 'Ukuran foto maksimal 5 MB.';
      input.value = '';
      return;
    }

    this.photoError = '';
    this.photoFile = file;

    if (this.photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.photoPreview);
    }
    this.photoPreview = URL.createObjectURL(file);
    this.cdr.detectChanges();
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

  getPhotoUrl(photo: string | null | undefined): string {
    if (!photo || photo === 'default.jpg') return '';

    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:') || photo.startsWith('blob:')) {
      return photo;
    }

    const cleanPath = photo.replace(/^\/+/, '').replace(/^storage\//, '');
    return `http://127.0.0.1:8000/storage/${cleanPath}`;
  }

  onPhotoError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }

  openDetail(property: Property): void {
    this.selectedProperty = property;
  }


  closeDetail(): void {
    this.selectedProperty = null;
  }


  openFinancialAnalysis(property: Property | null): void {
    if (!property) return;

    this.closeDetail();
    this.router.navigate(['/owner/financial-analysis'], {
      queryParams: {
        propertyId: property.id,
        period: 'all'
      }
    });
  }


  deleteProperty(property: Property): void {
    const confirmed = confirm(
      `Apakah Anda yakin ingin menghapus ${property.name}?`
    );

    if (!confirmed) {
      return;
    }

    this.api.deleteKos(property.id).subscribe({
      next: () => {
        this.loadProperties();
      },
      error: (error) => {
        console.error('Gagal menghapus kos:', error);
        alert('Gagal menghapus kos');
      }
    });
  }

  openRooms(kosId: string): void {
    this.router.navigate(['/owner/rooms'], {
      queryParams: { kosId: kosId }
    });
  }

}
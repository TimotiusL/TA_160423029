import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-tenant-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [CommonModule, FormsModule, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage {
  form = {
    name: '',
    email: '',
    phone: '',
    nik: '',
    birthDate: '',
    gender: 'pria'
  };
  loading = false;
  isSaving = false;
  isLoggingOut = false;
  showPasswordForm = false;
  isChangingPassword = false;
  passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
  savedMessage = '';
  ktpName = '';
  ktpPath = '';
  private ktpFile: File | null = null;

  constructor(private api: ApiService, private router: Router, private cdr: ChangeDetectorRef) {}

  ionViewWillEnter(): void { this.loadProfile(); }

  get initial(): string { return (this.form.name.trim()[0] || 'P').toUpperCase(); }
  get today(): string { return new Date().toISOString().slice(0, 10); }
  get ktpFileNameLabel(): string { return this.ktpName ? `File dipilih: ${this.ktpName}` : 'Pilih foto KTP'; }
  get ktpUrl(): string {
    if (!this.ktpPath) return '';
    if (this.ktpPath.startsWith('http://') || this.ktpPath.startsWith('https://')) return this.ktpPath;
    const clean = this.ktpPath.replace(/^\/+/, '').replace(/^storage\//, '');
    return `http://127.0.0.1:8000/storage/${clean}`;
  }

  loadProfile(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.api.me().subscribe({
      next: (response: any) => {
        const user = response?.user ?? response?.data ?? response;
        this.setProfile(user);
        try { localStorage.setItem('user', JSON.stringify(user)); } catch { }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal memuat profil:', error);
        this.loading = false;
        this.showMessage(error?.status === 401 ? 'Sesi login berakhir. Silakan login kembali.' : 'Profil gagal dimuat dari server.');
        if (error?.status === 401) this.finishLogout();
        this.cdr.detectChanges();
      }
    });
  }

  private setProfile(data: any): void {
    this.form = {
      name: data?.name ?? data?.nama ?? '',
      email: data?.email ?? '',
      phone: data?.phone ?? data?.no_telp ?? '',
      nik: data?.nik ?? '',
      birthDate: data?.tgl_lahir ? String(data.tgl_lahir).slice(0, 10) : '',
      gender: data?.jenis_kelamin === 'wanita' ? 'wanita' : 'pria'
    };
    this.ktpPath = data?.foto_ktp || '';
    this.ktpName = this.ktpPath ? this.ktpPath.split('/').pop() || 'KTP tersimpan' : '';
    this.ktpFile = null;
  }

  onKtpChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    if (!/\.(jpe?g|png|pdf)$/i.test(file.name)) {
      input.value = '';
      this.ktpFile = null;
      this.showMessage('KTP harus berupa JPG, JPEG, PNG, atau PDF.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      input.value = '';
      this.ktpFile = null;
      this.showMessage('Ukuran file KTP maksimal 2 MB.');
      return;
    }
    this.ktpFile = file;
    this.ktpName = file.name;
  }

  save(): void {
    this.savedMessage = '';
    const name = this.form.name.trim();
    const email = this.form.email.trim();
    const phone = this.normalizePhone(this.form.phone);

    if (!name || !email || !phone || !this.form.nik.trim() || !this.form.birthDate || !this.form.gender) {
      this.showMessage('Lengkapi seluruh data akun dan identitas penghuni.');
      return;
    }
    if (name.length > 45) { this.showMessage('Nama maksimal 45 karakter.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 45) { this.showMessage('Periksa format email (maksimal 45 karakter).'); return; }
    if (!/^0\d{9,12}$/.test(phone)) { this.showMessage('Nomor telepon harus 10–13 digit dan diawali 0.'); return; }
    if (!/^\d{16}$/.test(this.form.nik.trim())) { this.showMessage('NIK harus terdiri dari 16 digit.'); return; }
    if (this.form.birthDate >= new Date().toISOString().slice(0, 10)) { this.showMessage('Tanggal lahir harus sebelum hari ini.'); return; }
    if (!this.ktpPath && !this.ktpFile) { this.showMessage('Upload foto KTP terlebih dahulu.'); return; }
    if (this.isSaving) return;

    const payload = new FormData();
    payload.append('name', name);
    payload.append('email', email);
    payload.append('phone', phone);
    payload.append('nik', this.form.nik.trim());
    payload.append('tgl_lahir', this.form.birthDate);
    payload.append('jenis_kelamin', this.form.gender);
    if (this.ktpFile) payload.append('foto_ktp', this.ktpFile, this.ktpFile.name);

    this.isSaving = true;
    this.api.updateTenantProfile(payload).subscribe({
      next: (response: any) => {
        const user = response?.user;
        if (user) {
          this.setProfile(user);
          try { localStorage.setItem('user', JSON.stringify(user)); } catch { }
        }
        this.isSaving = false;
        this.showMessage(response?.message || 'Profil berhasil diperbarui.');
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Gagal memperbarui profil:', error);
        this.isSaving = false;
        const validation = error?.error?.errors;
        const key = validation ? Object.keys(validation)[0] : null;
        this.showMessage((key && validation[key]?.[0]) || error?.error?.message || 'Profil gagal diperbarui.');
        this.cdr.detectChanges();
      }
    });
  }


  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    if (!this.showPasswordForm) {
      this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
    }
    this.cdr.markForCheck();
  }

  changePassword(): void {
    if (this.isChangingPassword) return;
    if (!this.passwordForm.oldPassword) {
      this.showMessage('Masukkan kata sandi lama terlebih dahulu.');
      return;
    }
    if (this.passwordForm.newPassword.length < 8) {
      this.showMessage('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.showMessage('Konfirmasi kata sandi baru tidak sama.');
      return;
    }
    if (this.passwordForm.oldPassword === this.passwordForm.newPassword) {
      this.showMessage('Kata sandi baru harus berbeda dari kata sandi lama.');
      return;
    }

    this.isChangingPassword = true;
    this.cdr.markForCheck();
    this.api.changePassword({
      oldPassword: this.passwordForm.oldPassword,
      newPassword: this.passwordForm.newPassword,
      confirmPassword: this.passwordForm.confirmPassword
    }).subscribe({
      next: (response: any) => {
        this.isChangingPassword = false;
        this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
        this.showPasswordForm = false;
        this.showMessage(response?.message || 'Kata sandi berhasil diubah.');
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.isChangingPassword = false;
        const validation = error?.error?.errors;
        const key = validation ? Object.keys(validation)[0] : null;
        this.showMessage((key && validation[key]?.[0]) || error?.error?.message || 'Kata sandi gagal diubah.');
        this.cdr.markForCheck();
      }
    });
  }

  logout(): void {
    if (this.isLoggingOut || !confirm('Apakah kamu yakin ingin keluar dari akun?')) return;
    this.isLoggingOut = true;
    this.api.logout().subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout()
    });
  }

  private finishLogout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private normalizePhone(value: string): string {
    let phone = (value || '').replace(/[\s-]/g, '');
    if (phone.startsWith('+62')) phone = '0' + phone.slice(3);
    else if (phone.startsWith('62')) phone = '0' + phone.slice(2);
    return phone;
  }

  private showMessage(message: string): void {
    this.savedMessage = message;
    this.cdr.detectChanges();
    window.setTimeout(() => { this.savedMessage = ''; this.cdr.detectChanges(); }, 3500);
  }
}

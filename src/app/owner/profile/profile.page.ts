import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../services/api';

interface OwnerProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss']
})
export class ProfilePage implements OnInit {
  user: OwnerProfile = { name: '', email: '', phone: '', role: '' };

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  isLoadingProfile = false;
  isSavingProfile = false;
  isChangingPassword = false;

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUser();
  }

  get avatarInitial(): string {
    return this.user.name?.trim()?.charAt(0)?.toUpperCase() || 'U';
  }

  loadUser(): void {
    this.isLoadingProfile = true;

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        this.setUserData(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }

    this.api.me()
      .pipe(finalize(() => {
        this.isLoadingProfile = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: any) => {
          const currentUser = response?.user ?? response?.data ?? response;
          this.setUserData(currentUser);
          localStorage.setItem('user', JSON.stringify({
            name: this.user.name,
            email: this.user.email,
            phone: this.user.phone,
            role: this.user.role
          }));
        },
        error: (error: any) => {
          if (error?.status === 401) {
            this.showToastMessage('Sesi login berakhir. Silakan login kembali.', 'error');
            this.finishLogout();
            return;
          }
          this.showToastMessage(
            error?.error?.message || 'Data profil gagal dimuat. Periksa koneksi backend.',
            'error'
          );
        }
      });
  }

  private setUserData(data: any): void {
    this.user = {
      name: data?.name ?? data?.nama ?? '',
      email: data?.email ?? '',
      phone: data?.phone ?? data?.no_telp ?? data?.telepon ?? '',
      role: data?.role ?? data?.nama_role ?? ''
    };
    this.cdr.detectChanges();
  }

  saveProfile(): void {
    const name = this.user.name.trim();
    const email = this.user.email.trim();
    const phone = this.user.phone.trim();

    if (!name || !email) {
      this.showToastMessage('Nama lengkap dan email wajib diisi.', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.showToastMessage('Format email tidak valid.', 'error');
      return;
    }

    this.isSavingProfile = true;
    this.api.updateProfile({ name, email, phone: phone || null })
      .pipe(finalize(() => {
        this.isSavingProfile = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: any) => {
          const updatedUser = response?.user ?? { ...this.user, name, email, phone };
          this.setUserData(updatedUser);
          localStorage.setItem('user', JSON.stringify({
            name: this.user.name,
            email: this.user.email,
            phone: this.user.phone,
            role: this.user.role
          }));
          this.showToastMessage(response?.message || 'Profil berhasil diperbarui.');
        },
        error: (error: any) => {
          if (error?.status === 401) {
            this.showToastMessage('Sesi login berakhir. Silakan login kembali.', 'error');
            this.finishLogout();
            return;
          }
          this.showToastMessage(this.getApiError(error, 'Profil gagal diperbarui.'), 'error');
        }
      });
  }

  changePassword(): void {
    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.showToastMessage('Semua kolom password wajib diisi.', 'error');
      return;
    }
    if (this.newPassword.length < 8) {
      this.showToastMessage('Password baru minimal 8 karakter.', 'error');
      return;
    }
    if (this.newPassword === this.oldPassword) {
      this.showToastMessage('Password baru harus berbeda dari password lama.', 'error');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.showToastMessage('Konfirmasi password tidak sesuai.', 'error');
      return;
    }

    this.isChangingPassword = true;
    this.api.changePassword({
      oldPassword: this.oldPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    })
      .pipe(finalize(() => {
        this.isChangingPassword = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: any) => {
          this.oldPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.showToastMessage(response?.message || 'Password berhasil diubah.');
        },
        error: (error: any) => {
          if (error?.status === 401) {
            this.showToastMessage('Sesi login berakhir. Silakan login kembali.', 'error');
            this.finishLogout();
            return;
          }
          this.showToastMessage(this.getApiError(error, 'Password gagal diubah.'), 'error');
        }
      });
  }

  private getApiError(error: any, fallback: string): string {
    const validationErrors = error?.error?.errors;
    if (validationErrors && typeof validationErrors === 'object') {
      const firstError = Object.values(validationErrors).flat()[0];
      if (firstError) return String(firstError);
    }
    return error?.error?.message || fallback;
  }

  logout(): void {
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

  showToastMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 3000);
    this.cdr.detectChanges();
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss']
})
export class ProfilePage implements OnInit {
  user = {
    name: '',
    email: '',
    phone: '',
    role: ''
  };

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  showToast = false;
  toastMessage = '';
  isSavingProfile = false;
  isChangingPassword = false;

  constructor(
    private api: ApiService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser(): void {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      try {
        this.setUserData(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }

    this.api.me().subscribe({
      next: (response: any) => {
        const currentUser = response?.user ?? response?.data ?? response;
        this.setUserData(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      },
      error: (error: any) => {
        if (error?.status === 401) {
          this.showToastMessage('Sesi login berakhir. Silakan login kembali.');
          this.finishLogout();
          return;
        }

        if (!savedUser) {
          this.showToastMessage('Data profil gagal dimuat. Periksa koneksi backend.');
        }
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
  }

  saveProfile(): void {
    if (!this.user.name.trim() || !this.user.email.trim()) {
      this.showToastMessage('Nama dan email wajib diisi.');
      return;
    }

    this.isSavingProfile = true;

    this.api.updateProfile({
      name: this.user.name.trim(),
      email: this.user.email.trim(),
      phone: this.user.phone.trim() || null
    }).subscribe({
      next: (response: any) => {
        const updatedUser = response?.user ?? {
          ...this.user
        };
        this.setUserData(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.showToastMessage(response?.message ?? 'Profil berhasil diperbarui.');
        this.isSavingProfile = false;
      },
      error: (error: any) => {
        this.isSavingProfile = false;
        this.showToastMessage(
          error?.error?.message ?? 'Profil gagal diperbarui. Periksa data dan koneksi backend.'
        );
      }
    });
  }

  changePassword(): void {
    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.showToastMessage('Semua field password harus diisi.');
      return;
    }

    if (this.newPassword.length < 8) {
      this.showToastMessage('Password baru minimal 8 karakter.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.showToastMessage('Konfirmasi password tidak sesuai.');
      return;
    }

    this.isChangingPassword = true;

    this.api.changePassword({
      oldPassword: this.oldPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: (response: any) => {
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.showToastMessage(response?.message ?? 'Password berhasil diubah.');
        this.isChangingPassword = false;
      },
      error: (error: any) => {
        this.isChangingPassword = false;
        this.showToastMessage(
          error?.error?.message ?? 'Password gagal diubah. Periksa password lama dan koneksi backend.'
        );
      }
    });
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

  showToastMessage(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 2500);
  }
}

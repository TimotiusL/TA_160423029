import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
export class ProfilePage {

  constructor(
    private api: ApiService,
    private router: Router
  ) { }

  user = {
    name: 'Timotius',
    email: 'timotius@kostmanager.id',
    phone: '081234567890',
    city: 'Jakarta'
  };

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

  showToast = false;
  toastMessage = '';

  saveProfile(): void {
    this.showToastMessage(
      'Profil berhasil diperbarui!'
    );
  }

  changePassword(): void {

    if (
      !this.oldPassword ||
      !this.newPassword ||
      !this.confirmPassword
    ) {
      this.showToastMessage(
        'Semua field password harus diisi.'
      );
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.showToastMessage(
        'Konfirmasi password tidak sesuai.'
      );
      return;
    }

    this.showToastMessage(
      'Password berhasil diubah!'
    );

    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  logout(): void {
    this.api.logout().subscribe({
      next: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: () => {
        // Tetap logout dari sisi aplikasi
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        this.router.navigate(['/login'], { replaceUrl: true });
      }
    });
  }

  showToastMessage(message: string): void {
    this.toastMessage = message;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 2500);
  }
}
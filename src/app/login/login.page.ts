import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';
import { IonContent } from '@ionic/angular';

import { ApiService } from '../services/api';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent
  ]
})
export class LoginPage {

  mode: 'login' | 'register' | 'forgot' = 'login';

  email = '';
  password = '';
  rememberMe = false;
  role: 'owner' | 'tenant' = 'tenant';

  error = '';
  isLoggingIn = false;
  needsEmailVerification = false;

  registerName = '';
  registerEmail = '';
  registerPhone = '';
  registerPassword = '';
  registerPasswordConfirmation = '';
  registerNik = '';
  registerGender: 'pria' | 'wanita' = 'pria';
  registerBirthDate = '';
  registerKtpFile: File | null = null;

  forgotStep: 'email' | 'otp' | 'password' = 'email';
  forgotEmail = '';
  forgotOtp = '';
  forgotPassword = '';
  forgotPasswordConfirmation = '';
  forgotSubmitting = false;
  forgotInfo = '';

  showForgotPopup = false;
  forgotPopupMessage = '';
  forgotPopupType: 'error' | 'success' = 'error';

  showVerificationPopup = false;

  shapes = Array.from({ length: 20 });

  constructor(
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  /**
   * Ionic keeps routed pages alive between navigations. Clear the login
   * credentials whenever this page becomes active again (for example,
   * after an owner or tenant logs out).
   */
  ionViewWillEnter(): void {
    this.email = '';
    this.password = '';
    this.error = '';
    this.needsEmailVerification = false;
    this.cdr.markForCheck();
  }

  handleLogin(): void {
    // Cegah pengiriman request berulang saat proses login masih berjalan.
    if (this.isLoggingIn) return;

    this.error = '';
    this.needsEmailVerification = false;

    if (!this.email?.trim() || !this.password) {
      this.error = 'Email dan password harus diisi.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoggingIn = true;
    this.cdr.detectChanges();

    this.api.login(this.email.trim(), this.password)
      .pipe(finalize(() => {
        // Pastikan tombol tidak tertinggal pada status "Memeriksa..."
        // baik API berhasil maupun mengembalikan error.
        this.isLoggingIn = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response: any) => {
          const user = response?.user;

          if (!response?.token || !user) {
            this.error = 'Respons login dari server tidak lengkap. Silakan coba lagi.';
            this.cdr.detectChanges();
            return;
          }

          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(user));

          if (this.rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          } else {
            localStorage.removeItem('rememberMe');
          }

          this.error = '';
          this.needsEmailVerification = false;

          // Do not leave credentials in the cached login page after sign-in.
          this.email = '';
          this.password = '';
          this.cdr.detectChanges();

          if (user.role === 'admin') {
            this.router.navigateByUrl('/owner/dashboard');
          } else if (user.role === 'penghuni') {
            this.router.navigateByUrl('/tenant/dashboard');
          } else {
            this.error = 'Peran akun tidak dikenali. Hubungi administrator.';
            this.cdr.detectChanges();
          }
        },
        error: (error: any) => {
          console.error('Login gagal:', error);

          const responseMessage = typeof error?.error?.message === 'string'
            ? error.error.message
            : '';

          if (error?.status === 401) {
            this.error = responseMessage || 'Email atau password salah.';
          } else if (error?.status === 403) {
            // Pada endpoint login aplikasi ini, 403 dipakai untuk menolak
            // akun yang emailnya belum diverifikasi.
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.needsEmailVerification = true;
            this.error = '';
          } else if (error?.status === 422) {
            this.error = responseMessage || 'Email atau password tidak valid.';
          } else {
            this.error = responseMessage || 'Tidak dapat terhubung ke server. Coba lagi.';
          }

          this.cdr.detectChanges();
        }
      });
  }

  openForgotPassword(): void {
    if (this.forgotSubmitting) return;
    this.mode = 'forgot';
    this.forgotStep = 'email';
    this.error = '';
    this.forgotInfo = '';
    this.showForgotPopup = false;
    this.cdr.detectChanges();
  }

  handleForgotPassword(): void {
    // Cegah request ganda jika tombol diklik berulang.
    if (this.forgotSubmitting) return;
    this.error = '';

    if (this.forgotStep === 'email') {
      const email = this.forgotEmail.trim();
      if (!email) {
        this.error = 'Email harus diisi.';
        this.cdr.detectChanges();
        return;
      }

      this.forgotEmail = email;
      this.forgotInfo = '';
      this.forgotSubmitting = true;
      this.cdr.detectChanges();

      // Cek email dan kirim OTP secara berurutan. Pindah ke tahap OTP
      // hanya setelah server mengonfirmasi OTP berhasil dikirim.
      this.api.checkResetEmail(email).pipe(
        switchMap(() => this.api.sendResetOtp(email)),
        finalize(() => {
          this.forgotSubmitting = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (response: any) => {
          this.forgotOtp = '';
          this.forgotStep = 'otp';
          this.forgotInfo = response?.message ||
            `Kode verifikasi sudah dikirim ke ${email}. Periksa Inbox dan folder Spam/Junk.`;
          this.error = '';
          // Paksa Angular mengganti form email menjadi form OTP.
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Gagal memeriksa email atau mengirim OTP:', error);
          this.forgotInfo = '';

          if (error?.status === 404) {
            this.error = 'Email tidak ditemukan. Gunakan email yang sudah terdaftar.';
          } else if (error?.status === 422) {
            this.error = error?.error?.message || 'Format email tidak valid.';
          } else {
            this.error = error?.error?.message ||
              'Kode OTP gagal dikirim. Periksa koneksi lalu coba lagi.';
          }
          this.cdr.detectChanges();
        }
      });
      return;
    }

    if (this.forgotStep === 'otp') {
      const otp = this.forgotOtp.trim();
      if (!/^\d{6}$/.test(otp)) {
        this.error = 'Masukkan kode OTP yang terdiri dari 6 digit angka.';
        this.cdr.detectChanges();
        return;
      }

      this.forgotSubmitting = true;
      this.forgotInfo = '';
      this.cdr.detectChanges();

      this.api.verifyResetOtp(this.forgotEmail, otp).pipe(
        finalize(() => {
          this.forgotSubmitting = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: () => {
          this.error = '';
          this.forgotStep = 'password';
          this.forgotInfo = 'Email berhasil diverifikasi. Silakan buat password baru.';
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Verifikasi OTP gagal:', error);
          this.error = error?.error?.message ||
            'Kode OTP salah atau sudah kedaluwarsa. Silakan coba lagi.';
          this.cdr.detectChanges();
        }
      });
      return;
    }

    if (this.forgotStep === 'password') {
      if (!this.forgotPassword || !this.forgotPasswordConfirmation) {
        this.error = 'Password dan konfirmasi password harus diisi.';
        this.cdr.detectChanges();
        return;
      }

      if (this.forgotPassword !== this.forgotPasswordConfirmation) {
        this.error = 'Password dan konfirmasi password tidak sama.';
        this.cdr.detectChanges();
        return;
      }

      if (this.forgotPassword.length < 8) {
        this.error = 'Password minimal 8 karakter.';
        this.cdr.detectChanges();
        return;
      }

      this.forgotSubmitting = true;
      this.forgotInfo = '';
      this.cdr.detectChanges();

      this.api.updatePassword(
        this.forgotEmail,
        this.forgotPassword,
        this.forgotPasswordConfirmation
      ).pipe(
        finalize(() => {
          this.forgotSubmitting = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (response: any) => {
          console.log('Password berhasil diubah:', response);
          this.forgotEmail = '';
          this.forgotOtp = '';
          this.forgotPassword = '';
          this.forgotPasswordConfirmation = '';
          this.forgotInfo = '';
          this.error = '';
          this.showForgotPopupMessage('Password baru berhasil disimpan.', 'success');
          this.cdr.detectChanges();

          setTimeout(() => {
            this.showForgotPopup = false;
            this.mode = 'login';
            this.forgotStep = 'email';
            this.cdr.detectChanges();
          }, 1500);
        },
        error: (error: any) => {
          console.error('Update password gagal:', error);
          this.error = error?.error?.message || 'Password gagal diubah.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  showForgotPopupMessage(
    message: string,
    type: 'error' | 'success' = 'error'
  ) {
    this.forgotPopupMessage = message;
    this.forgotPopupType = type;
    this.showForgotPopup = true;
  }

  closeForgotPopup() {
    this.showForgotPopup = false;

    if (this.forgotPopupType === 'success') {
      this.mode = 'login';
      this.forgotStep = 'email';

      this.forgotEmail = '';
      this.forgotOtp = '';
      this.forgotPassword = '';
      this.forgotPasswordConfirmation = '';
      this.forgotInfo = '';
      this.forgotSubmitting = false;
      this.error = '';
      this.cdr.detectChanges();
    }
  }

  handleRegister() {
    console.log('REGISTER DIKLIK');
    this.error = '';

    if (
      !this.registerName ||
      !this.registerEmail ||
      !this.registerPhone ||
      !this.registerPassword ||
      !this.registerPasswordConfirmation
    ) {
      this.error = 'Semua field wajib diisi.';
      return;
    }

    if (this.registerPassword.length < 8) {
      this.error = 'Password minimal 8 karakter.';
      return;
    }

    if (this.registerPassword !== this.registerPasswordConfirmation) {
      this.error = 'Password dan konfirmasi password tidak sama.';
      return;
    }

    if (this.role === 'tenant') {
      if (!this.registerNik) {
        this.error = 'NIK harus diisi.';
        return;
      }

      if (!/^\d{16}$/.test(this.registerNik)) {
        this.error = 'NIK harus terdiri dari 16 digit angka.';
        return;
      }

      if (!this.registerGender) {
        this.error = 'Jenis kelamin harus dipilih.';
        return;
      }

      if (!this.registerBirthDate) {
        this.error = 'Tanggal lahir harus diisi.';
        return;
      }

      if (!this.registerKtpFile) {
        this.error = 'Foto KTP harus diupload.';
        return;
      }
    }

    const formData = new FormData();

    formData.append('nama', this.registerName);
    formData.append('email', this.registerEmail);
    formData.append('no_telp', this.registerPhone);
    formData.append('password', this.registerPassword);

    formData.append(
      'role',
      this.role === 'owner' ? 'admin' : 'penghuni'
    );

    if (this.role === 'tenant') {
      formData.append('nik', this.registerNik);
      formData.append('jenis_kelamin', this.registerGender);
      formData.append('tgl_lahir', this.registerBirthDate);

      if (this.registerKtpFile) {
        formData.append(
          'foto_ktp',
          this.registerKtpFile,
          this.registerKtpFile.name
        );
      }
    }

    this.showVerificationPopup = true;
    this.api.register(formData).subscribe({
      next: (response: any) => {

        this.email = '';
        this.password = '';
        this.registerName = '';
        this.registerEmail = '';
        this.registerPhone = '';
        this.registerPassword = '';
        this.registerPasswordConfirmation = '';
        this.registerNik = '';
        this.registerGender = 'pria';
        this.registerBirthDate = '';
        this.registerKtpFile = null;
      },

      error: (error) => {
        console.error('Register gagal:', error);
        this.showVerificationPopup = false;

        if (error.status === 422) {
          const errors = error.error?.errors;

          if (errors) {
            const firstError = Object.values(errors)[0];

            this.error = Array.isArray(firstError)
              ? String(firstError[0])
              : String(firstError || 'Data registrasi tidak valid.');
          } else {
            this.error = error.error?.message || 'Data registrasi tidak valid.';
          }
        } else {
          this.error =
            error.error?.message || 'Tidak dapat terhubung ke server.';
        }
      }
    });
  }

  handleKtpFile(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.registerKtpFile = input.files[0];
    }
  }
}
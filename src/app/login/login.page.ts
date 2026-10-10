import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  showForgotPopup = false;
  forgotPopupMessage = '';
  forgotPopupType: 'error' | 'success' = 'error';

  showVerificationPopup = false;

  shapes = Array.from({ length: 20 });

  constructor(
    private router: Router,
    private api: ApiService
  ) { }

  handleLogin() {
    this.error = '';

    if (!this.email || !this.password) {
      this.error = 'Email dan password harus diisi.';
      return;
    }

    this.api.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('Login berhasil:', response);

        const user = response.user;

        localStorage.setItem('user', JSON.stringify(user));
        console.log('USER LOGIN:', user);

        if (this.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }

        if (user.role === 'admin') {
          this.router.navigate(['/owner/dashboard']);
        } else if (user.role === 'penghuni') {
          this.router.navigate(['/tenant/dashboard']);
        }
      },

      error: (error) => {
        console.error('Login gagal:', error);

        if (error.status === 401) {
          this.error = 'Email atau password salah.';
        } else if (error.status === 422) {
          this.error = 'Email atau password tidak valid.';
        } else {
          this.error = 'Tidak dapat terhubung ke server.';
        }
      }
    });
  }

  handleForgotPassword() {
    this.error = '';
    if (this.forgotStep === 'email') {

      if (!this.forgotEmail) {
        this.error = 'Email harus diisi.';
        return;
      }

      this.api.checkResetEmail(this.forgotEmail).subscribe({

        next: (response: any) => {
          console.log('Email ditemukan:', response);

          this.forgotStep = 'otp';

          this.api.sendResetOtp(this.forgotEmail).subscribe({
            next: (response: any) => {
              console.log('OTP berhasil dikirim:', response);
            },

            error: (error) => {
              console.error('Gagal mengirim OTP:', error);
            }
          });
        },

        error: (error) => {
          console.error('Email tidak ditemukan:', error);

          if (error.status === 404) {
            this.showForgotPopupMessage(
              'Email tidak ditemukan. Silakan gunakan email yang sudah terdaftar.'
            );
          } else if (error.status === 422) {
            this.showForgotPopupMessage(
              'Format email tidak valid.'
            );
          } else {
            this.showForgotPopupMessage(
              'Tidak dapat terhubung ke server.'
            );
          }
        }
      });

      return;
    }

    if (this.forgotStep === 'otp') {

      if (!this.forgotOtp) {
        this.error = 'Kode verifikasi harus diisi.';
        return;
      }

      this.api.verifyResetOtp(
        this.forgotEmail,
        this.forgotOtp
      ).subscribe({

        next: (response: any) => {
          console.log('OTP benar:', response);

          this.error = '';

          this.forgotStep = 'password';
        },

        error: (error) => {
          console.error('Verifikasi OTP gagal:', error);

          this.forgotOtp = '';
          this.forgotStep = 'otp';

          this.showForgotPopupMessage(
            error.error?.message ||
            'Kode OTP salah. Silakan coba lagi.'
          );
        }
      });

      return;
    }

    if (this.forgotStep === 'password') {

      if (!this.forgotPassword || !this.forgotPasswordConfirmation) {
        this.error =
          'Password dan konfirmasi password harus diisi.';
        return;
      }

      if (this.forgotPassword !== this.forgotPasswordConfirmation) {
        this.error =
          'Password dan konfirmasi password tidak sama.';
        return;
      }

      if (this.forgotPassword.length < 8) {
        this.error = 'Password minimal 8 karakter.';
        return;
      }

      this.api.updatePassword(
        this.forgotEmail,
        this.forgotPassword,
        this.forgotPasswordConfirmation
      ).subscribe({

        next: (response: any) => {
          console.log('Password berhasil diubah:', response);

          this.forgotEmail = '';
          this.forgotOtp = '';
          this.forgotPassword = '';
          this.forgotPasswordConfirmation = '';
          this.error = '';

          this.showForgotPopupMessage(
            'Password baru berhasil disimpan.',
            'success'
          );

          setTimeout(() => {
            this.showForgotPopup = false;
            this.mode = 'login';
            this.forgotStep = 'email';
          }, 1500);
        },

        error: (error) => {
          console.error('Update password gagal:', error);

          this.error =
            error.error?.message ||
            'Password gagal diubah.';
        }
      });

      return;
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
      this.error = '';
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
            this.error = Object.values(errors)[0] as string;
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
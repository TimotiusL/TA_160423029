import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/login`, {
      email: email,
      password: password
    }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      })
    );
  }

  logout(): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.post(`${this.baseUrl}/logout`, {}, { headers });
  }

  getKos(): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(`${this.baseUrl}/kos`, { headers });
  }

  register(data: FormData) {
    return this.http.post(`${this.baseUrl}/register`, data);
  }

  resetPassword(
    email: string,
    password: string,
    passwordConfirmation: string
  ) {
    return this.http.post(`${this.baseUrl}/reset-password`, {
      email: email,
      password: password,
      password_confirmation: passwordConfirmation
    });
  }

  sendResetOtp(email: string) {
    return this.http.post(
      `${this.baseUrl}/send-reset-otp`,
      {
        email: email
      }
    );
  }

  verifyResetOtp(email: string, otp: string) {
    return this.http.post(
      `${this.baseUrl}/verify-reset-otp`,
      {
        email: email,
        otp: otp
      }
    );
  }

  updatePassword(
    email: string,
    password: string,
    passwordConfirmation: string
  ) {
    return this.http.post(
      `${this.baseUrl}/update-password`,
      {
        email: email,
        password: password,
        password_confirmation: passwordConfirmation
      }
    );
  }

  checkResetEmail(email: string) {
    return this.http.post(
      `${this.baseUrl}/check-reset-email`,
      {
        email: email
      }
    );
  }

  createKos(data: any): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.post<any>(
      `${this.baseUrl}/kos`,
      data,
      { headers }
    );
  }

  updateKos(id: string, data: any): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.put<any>(
      `${this.baseUrl}/kos/${id}`,
      data,
      { headers }
    );
  }

  deleteKos(id: string): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.delete<any>(`${this.baseUrl}/kos/${id}`, { headers });
  }

  getJenisKamar(kosId?: number): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    let url = `${this.baseUrl}/jenis-kamar`;

    if (kosId) {
      url += `?kos_id=${kosId}`;
    }

    return this.http.get<any[]>(url, { headers });
  }

  getKamar(): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(`${this.baseUrl}/kamar`, { headers });
  }

  createJenisKamar(data: any): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.post<any>(
      `${this.baseUrl}/jenis-kamar`,
      data,
      { headers }
    );
  }

  updateJenisKamar(
    id: number,
    data: any
  ): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.put<any>(
      `${this.baseUrl}/jenis-kamar/${id}`,
      data,
      { headers }
    );
  }

  deleteJenisKamar(id: number): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.delete<any>(
      `${this.baseUrl}/jenis-kamar/${id}`,
      { headers }
    );
  }

  createKamar(data: any): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(
      `${this.baseUrl}/kamar`,
      data,
      { headers }
    );
  }

  updateKamar(id: number, data: any): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.put<any>(
      `${this.baseUrl}/kamar/${id}`,
      data,
      { headers }
    );
  }

  deleteKamar(id: number): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.delete<any>(`${this.baseUrl}/kamar/${id}`, { headers });
  }

  getFasilitas(): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/fasilitas`,
      { headers }
    );
  }

  createFasilitas(data: any): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(
      `${this.baseUrl}/fasilitas`,
      data,
      { headers }
    );
  }

  updateFasilitas(id: number, data: any): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.put<any>(
      `${this.baseUrl}/fasilitas/${id}`,
      data,
      { headers }
    );
  }

  deleteFasilitas(id: number): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.delete<any>(
      `${this.baseUrl}/fasilitas/${id}`,
      { headers }
    );
  }

  getPendaftaran(): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/pendaftaran`,
      { headers }
    );
  }

  updatePendaftaranStatus(
    id: number,
    status: 'menunggu' | 'disetujui' | 'ditolak'
  ): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.put(
      `${this.baseUrl}/pendaftaran/${id}/status`,
      { status },
      { headers }
    );
  }

  getKontrak(): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/kontrak`,
      { headers }
    );
  }

  downloadKontrak(id: string): Observable<Blob> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/pdf'
    });

    return this.http.get(
      `${this.baseUrl}/kontrak/${id}/download`,
      {
        headers,
        responseType: 'blob'
      }
    );
  }

  getPenghuni(): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/penghuni`,
      { headers }
    );
  }

  getTagihan(): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/tagihan`,
      { headers }
    );
  }

  getPembayaran(): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/pembayaran`,
      { headers }
    );
  }

  verifikasiPembayaran(
    id: number,
    status: 'diverifikasi' | 'ditolak',
    catatan: string = ''
  ): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.put<any>(
      `${this.baseUrl}/pembayaran/${id}/verifikasi`,
      { status, catatan },
      { headers }
    );
  }

  getPemasukan(): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/pemasukan`,
      { headers }
    );
  }


  getPengeluaran(): Observable<any[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/pengeluaran`,
      { headers }
    );
  }


  createPengeluaran(data: FormData): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.post<any>(
      `${this.baseUrl}/pengeluaran`,
      data,
      { headers }
    );
  }

  updatePengeluaran(id: number, data: FormData): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    data.append('_method', 'PUT');

    return this.http.post<any>(
      `${this.baseUrl}/pengeluaran/${id}`,
      data,
      { headers }
    );
  }


  deletePengeluaran(id: number): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.delete<any>(
      `${this.baseUrl}/pengeluaran/${id}`,
      { headers }
    );
  }

  getInvestasi(): Observable<any[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/investasi`,
      { headers }
    );
  }

  createInvestasi(data: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.post<any>(
      `${this.baseUrl}/investasi`,
      data,
      { headers }
    );
  }

  updateInvestasi(id: number, data: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.put<any>(
      `${this.baseUrl}/investasi/${id}`,
      data,
      { headers }
    );
  }

  deleteInvestasi(id: number): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.delete<any>(
      `${this.baseUrl}/investasi/${id}`,
      { headers }
    );
  }


  getAnalisisKeuangan(
    kosId: number,
    tanggalMulai: string,
    tanggalSelesai: string
  ): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    const params = {
      tKos_id_kos: kosId,
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai
    };

    return this.http.get<any>(
      `${this.baseUrl}/analisis-keuangan`,
      { headers, params }
    );
  }


  getKomplain(): Observable<any[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/komplain`,
      { headers }
    );
  }

  kirimTanggapan(id: number, tanggapan: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.post<any>(
      `${this.baseUrl}/komplain/${id}/tanggapan`,
      { tanggapan },
      { headers }
    );
  }

  updateStatusKomplain(
    id: number,
    status: 'menunggu' | 'terjawab'
  ): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.put<any>(
      `${this.baseUrl}/komplain/${id}/status`,
      { status },
      { headers }
    );
  }


  me() {
    const token = localStorage.getItem('token');

    return this.http.get(`${this.baseUrl}/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  updateProfile(data: any) {
    const token = localStorage.getItem('token');

    return this.http.put(`${this.baseUrl}/profile`, data, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  changePassword(data: any) {
    const token = localStorage.getItem('token');

    return this.http.put(`${this.baseUrl}/change-password`, data, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

}
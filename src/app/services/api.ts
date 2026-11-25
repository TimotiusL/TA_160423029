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

  getKosBundles(kosId: string | number): Observable<any[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });
    return this.http.get<any[]>(`${this.baseUrl}/kos/${kosId}/bundles`, { headers });
  }

  createKosBundle(kosId: string | number, data: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });
    return this.http.post<any>(`${this.baseUrl}/kos/${kosId}/bundles`, data, { headers });
  }

  updateKosBundle(id: string | number, data: any): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });
    return this.http.put<any>(`${this.baseUrl}/bundles/${id}`, data, { headers });
  }

  deleteKosBundle(id: string | number): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });
    return this.http.delete<any>(`${this.baseUrl}/bundles/${id}`, { headers });
  }

  getTenantKatalog(): Observable<any[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(`${this.baseUrl}/tenant/katalog`, { headers });
  }

  getTenantKatalogById(id: number): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any>(`${this.baseUrl}/tenant/katalog/${id}`, { headers });
  }

  getTenantDashboard(): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any>(`${this.baseUrl}/tenant/dashboard`, { headers });
  }

  getTenantPendaftaran(kode?: string): Observable<any[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });
    const url = kode
      ? `${this.baseUrl}/tenant/pendaftaran?kode=${encodeURIComponent(kode)}`
      : `${this.baseUrl}/tenant/pendaftaran`;

    return this.http.get<any[]>(url, { headers });
  }

  getTenantRegistrationEligibility(): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any>(`${this.baseUrl}/tenant/pendaftaran/eligibility`, { headers });
  }

  cancelTenantPendaftaran(id: number, alasan_pembatalan: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.post<any>(`${this.baseUrl}/tenant/pendaftaran/${id}/batalkan`, {
      alasan_pembatalan
    }, { headers });
  }

  createTenantPendaftaran(data: FormData): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });
    return this.http.post<any>(`${this.baseUrl}/tenant/pendaftaran`, data, { headers });
  }

  register(data: FormData) {
    return this.http.post(`${this.baseUrl}/register`, data);
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

  createKos(data: FormData): Observable<any> {
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

  updateKos(id: string, data: FormData): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    data.append('_method', 'PUT');

    return this.http.post<any>(
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

  getPendaftaranKtp(id: number): Observable<Blob> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/octet-stream'
    });

    return this.http.get(
      `${this.baseUrl}/pendaftaran/${id}/ktp`,
      { headers, responseType: 'blob' }
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

  endKontrak(id: string, data: {
    tgl_keluar: string;
    alasan_pengakhiran: 'kontrak_berakhir' | 'permintaan_penghuni' | 'keputusan_owner';
    catatan_pengakhiran?: string;
  }): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.put(`${this.baseUrl}/kontrak/${id}/akhiri`, data, { headers });
  }

  getPermintaanKeluar(): Observable<any[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(`${this.baseUrl}/permintaan-keluar`, { headers });
  }

  updatePermintaanKeluarStatus(
    id: string,
    status: 'disetujui' | 'ditolak',
    catatan_owner?: string
  ): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.put(`${this.baseUrl}/permintaan-keluar/${id}/status`, {
      status,
      catatan_owner: catatan_owner || ''
    }, { headers });
  }

  createTenantPermintaanKeluar(data: {
    tKontrak_id_kontrak: number;
    tgl_rencana_keluar: string;
    alasan: string;
  }): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.baseUrl}/tenant/permintaan-keluar`, data, { headers });
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

  getPenghuniKtp(id: number): Observable<Blob> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/octet-stream'
    });

    return this.http.get(
      `${this.baseUrl}/penghuni/${id}/ktp`,
      { headers, responseType: 'blob' }
    );
  }

  getTenantTagihanByKode(kode: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any>(
      `${this.baseUrl}/tenant/tagihan/${encodeURIComponent(kode)}`,
      { headers }
    );
  }

  getTagihan(scope: 'current' | 'history' = 'current'): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/tagihan?scope=${scope}`,
      { headers }
    );
  }

  getPembayaran(scope: 'current' | 'history' = 'current'): Observable<any[]> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(
      `${this.baseUrl}/pembayaran?scope=${scope}`,
      { headers }
    );
  }

  getPersetujuanCicilan(): Observable<any[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any[]>(`${this.baseUrl}/persetujuan-cicilan`, { headers });
  }

  ajukanCicilan(data: {
    tTagihan_id_tagihan: number;
    jumlah_cicilan: number;
    alasan: string;
  }): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${this.baseUrl}/persetujuan-cicilan`, data, { headers });
  }

  putuskanCicilan(
    id: number,
    status: 'disetujui' | 'ditolak',
    catatan_owner = ''
  ): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.put<any>(
      `${this.baseUrl}/persetujuan-cicilan/${id}`,
      { status, catatan_owner },
      { headers }
    );
  }

  createPembayaran(formData: FormData): Observable<any> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.post<any>(
      `${this.baseUrl}/pembayaran`,
      formData,
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

  getTenantKomplain(): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any>(`${this.baseUrl}/tenant/komplain`, { headers });
  }

  createTenantKomplain(data: { judul: string; deskripsi: string }): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${this.baseUrl}/tenant/komplain`, data, { headers });
  }

  replyTenantKomplain(id: number, tanggapan: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(
      `${this.baseUrl}/tenant/komplain/${id}/tanggapan`,
      { tanggapan },
      { headers }
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

  me(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    return this.http.get<any>(`${this.baseUrl}/me`, { headers });
  }

  updateTenantProfile(data: FormData): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.post<any>(`${this.baseUrl}/tenant/profile`, data, { headers });
  }

  updateProfile(data: {
    name: string;
    email: string;
    phone: string | null;
  }): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.put<any>(`${this.baseUrl}/profile`, data, { headers });
  }

  changePassword(data: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.put<any>(`${this.baseUrl}/change-password`, data, { headers });
  }

  getUnreadNotificationCount(): Observable<{ unread: number }> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<{ unread: number }>(`${this.baseUrl}/notifikasi/count`, { headers });
  }

  getTenantNotifikasiCount(): Observable<{ unread: number }> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<{ unread: number }>(`${this.baseUrl}/tenant/notifikasi/count`, { headers });
  }

  getNotifikasi() {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.get<any>(
      `${this.baseUrl}/notifikasi`,
      { headers }
    );
  }

  markNotifikasiAsRead(id: number) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.put<any>(
      `${this.baseUrl}/notifikasi/${id}/baca`,
      {},
      { headers }
    );
  }

  markAllNotifikasiAsRead() {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json'
    });

    return this.http.put<any>(
      `${this.baseUrl}/notifikasi/baca-semua`,
      {},
      { headers }
    );
  }

}